import React, { useState } from 'react';
import {
  TextField,
  RadioGroup,
  FormControlLabel,
  Radio,
  FormGroup,
  Checkbox,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Typography,
  Box
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import {
  MULTIPLE_CHOICE_FIELDS,
  SINGLE_CHOICE_FIELDS_WITH_OTHERS,
  getQuestionNumber,
  getSingleChoiceRadioConfig
} from '../../utils/fieldMappings';

/**
 * Intelligent field renderer that renders form fields based on field type and configuration.
 * Replicates the same controls/options as the original survey form so the surveyor's
 * edit experience matches how the form is filled. Ported from the old UI.
 */
const SectionFieldRenderer = ({
  fieldName,
  value,
  onChange,
  sectionType,
  isEditMode = false,
  error = null,
  required = false
}) => {
  const { t } = useTranslation();

  // Get field configuration from mappings
  const getFieldConfig = () => {
    const sectionKey = sectionType === 'aganwadi' ? 'aganwadi' :
                      sectionType === 'cbe' ? 'cbe' :
                      sectionType === 'vhsnd' ? 'vhsnd' :
                      sectionType === 'household' ? 'household' : null;

    if (!sectionKey) return null;

    // Check if it's a multiple choice field
    if (MULTIPLE_CHOICE_FIELDS[sectionKey] && MULTIPLE_CHOICE_FIELDS[sectionKey][fieldName]) {
      return {
        type: 'multiple',
        config: MULTIPLE_CHOICE_FIELDS[sectionKey][fieldName]
      };
    }

    // Check if it's a single choice with Others option
    if (SINGLE_CHOICE_FIELDS_WITH_OTHERS[sectionKey] &&
        SINGLE_CHOICE_FIELDS_WITH_OTHERS[sectionKey][fieldName]) {
      return {
        type: 'singleWithOthers',
        hasOthers: true
      };
    }

    return null;
  };

  const fieldConfig = getFieldConfig();

  // Initialize other value from stored data
  const getInitialOtherValue = () => {
    if (!value) return '';
    if (typeof value === 'string') {
      if (value.includes('Others - ')) {
        return value.split('Others - ')[1] || '';
      }
      if (value.includes('Other - ')) {
        return value.split('Other - ')[1] || '';
      }
    }
    return '';
  };

  const [otherValue, setOtherValue] = useState(getInitialOtherValue());

  // Update other value when value prop changes
  React.useEffect(() => {
    setOtherValue(getInitialOtherValue());
  }, [value]);

  // Common option sets
  const yesNoOptions = [
    { value: 'Yes', label: t('yes') || 'Yes' },
    { value: 'No', label: t('no') || 'No' }
  ];

  const equipmentOptions = [
    { value: 'Available and Functional', label: t('availableAndFunctional') || 'Available and Functional' },
    { value: 'Available but not Functional', label: t('availableButNotFunctional') || 'Available but not Functional' },
    { value: 'Not Available', label: t('notAvailable') || 'Not Available' }
  ];

  const medicineOptions = [
    { value: 'Available at village level (AWW or ASHA)', label: t('availableAtVillageLevel') || 'Available at village level (AWW or ASHA)' },
    { value: 'Only available with ANM and ANM brings them during VHSND', label: t('onlyAvailableWithANM') || 'Only available with ANM and ANM brings them during VHSND' },
    { value: 'Not applicable as per state protocol', label: t('notApplicableAsPerStateProtocol') || 'Not applicable as per state protocol' }
  ];

  // Determine field type and render accordingly
  const renderField = () => {
    // FIRST: Check for configured single choice RadioGroup fields (highest priority)
    const radioConfig = getSingleChoiceRadioConfig(fieldName, sectionType);
    if (radioConfig) {
      // Normalize value for matching - handle case differences and whitespace
      const normalizedValue = value ? String(value).trim() : '';
      // Find matching option (case-insensitive)
      const matchedOption = radioConfig.options.find(opt =>
        opt.toLowerCase() === normalizedValue.toLowerCase() ||
        opt === normalizedValue
      );
      const displayValue = matchedOption || normalizedValue;

      return (
        <RadioGroup
          value={displayValue}
          onChange={(e) => onChange(e.target.value)}
        >
          {radioConfig.options.map((option) => (
            <FormControlLabel
              key={option}
              value={option}
              control={<Radio disabled={!isEditMode} />}
              label={radioConfig.displayNames[option] || option}
            />
          ))}
        </RadioGroup>
      );
    }

    // Multiple choice field (checkboxes)
    if (fieldConfig?.type === 'multiple') {
      const config = fieldConfig.config;

      // Ensure we have a valid config
      if (!config || !config.options || !Array.isArray(config.options)) {
        console.error(`[SectionFieldRenderer] Invalid config for multiple choice field: ${fieldName}`, config);
        // Fallback to text field if config is invalid
        return (
          <TextField
            fullWidth
            size="small"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            disabled={!isEditMode}
            error={!!error}
            helperText={error || 'Invalid field configuration'}
          />
        );
      }

      // Parse value - handle different formats: JSON array, comma-separated string, or array
      let selectedValues = [];
      if (value) {
        if (typeof value === 'string') {
          // Try to parse as JSON first (in case it's stored as JSON string)
          try {
            const parsed = JSON.parse(value);
            if (Array.isArray(parsed)) {
              selectedValues = parsed.map(v => String(v).trim());
            } else {
              // If not JSON array, treat as comma-separated string
              selectedValues = value.split(',').map(v => v.trim()).filter(v => v);
            }
          } catch (e) {
            // Not JSON, treat as comma-separated string
            selectedValues = value.split(',').map(v => v.trim()).filter(v => v);
          }
        } else if (Array.isArray(value)) {
          selectedValues = value.map(v => String(v).trim());
        } else {
          selectedValues = [String(value).trim()];
        }
      }

      // Normalize selected values to match option keys (case-insensitive)
      const normalizedSelectedValues = selectedValues.map(v => {
        // Try to find matching option key (case-insensitive)
        const matchingOption = config.options.find(opt =>
          opt.toLowerCase() === v.toLowerCase() ||
          (config.displayNames?.[opt] && config.displayNames[opt].toLowerCase() === v.toLowerCase())
        );
        return matchingOption || v;
      });

      const hasOthers = config.options.includes('other') || config.options.includes('others');
      const isOtherSelected = normalizedSelectedValues.some(v =>
        v.toLowerCase().includes('other') ||
        v.toLowerCase().startsWith('others -') ||
        v.toLowerCase().startsWith('other -')
      );

      return (
        <Box>
          <FormGroup>
            {config.options.map((optionKey) => {
              const displayName = config.displayNames?.[optionKey] || optionKey;
              const isSelected = normalizedSelectedValues.some(selected => {
                if (optionKey === 'other' || optionKey === 'others') {
                  return isOtherSelected;
                }
                // Match by option key (case-insensitive) or display name (case-insensitive)
                return selected.toLowerCase() === optionKey.toLowerCase() ||
                       selected.toLowerCase() === displayName.toLowerCase() ||
                       selected === optionKey ||
                       selected === displayName;
              });

              return (
                <FormControlLabel
                  key={optionKey}
                  control={
                    <Checkbox
                      checked={isSelected}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        let newValues = [...normalizedSelectedValues];

                        if (optionKey === 'other' || optionKey === 'others') {
                          if (checked) {
                            // Add 'other' key if not already present
                            if (!newValues.some(v => v.toLowerCase() === 'other' || v.toLowerCase() === 'others')) {
                              newValues.push(optionKey);
                            }
                          } else {
                            newValues = newValues.filter(v =>
                              v.toLowerCase() !== 'other' &&
                              v.toLowerCase() !== 'others' &&
                              !v.toLowerCase().includes('other') &&
                              !v.toLowerCase().startsWith('others -') &&
                              !v.toLowerCase().startsWith('other -')
                            );
                            setOtherValue('');
                          }
                        } else {
                          if (checked) {
                            // Add option key if not already present
                            if (!newValues.some(v =>
                              v.toLowerCase() === optionKey.toLowerCase() ||
                              v.toLowerCase() === displayName.toLowerCase()
                            )) {
                              newValues.push(optionKey);
                            }
                          } else {
                            // Remove option key or display name (case-insensitive)
                            newValues = newValues.filter(v =>
                              v.toLowerCase() !== optionKey.toLowerCase() &&
                              v.toLowerCase() !== displayName.toLowerCase()
                            );
                          }
                        }

                        // Join with comma and space for storage
                        onChange(newValues.join(', '));
                      }}
                      disabled={!isEditMode}
                    />
                  }
                  label={displayName}
                />
              );
            })}
          </FormGroup>

          {/* Others text field */}
          {hasOthers && isOtherSelected && isEditMode && (
            <TextField
              fullWidth
              size="small"
              label={t('otherSpecify') || 'Other (Please specify)'}
              value={otherValue}
              onChange={(e) => {
                const newValue = e.target.value;
                setOtherValue(newValue);
                const baseValues = selectedValues.filter(v =>
                  !v.toLowerCase().includes('other') &&
                  !v.toLowerCase().startsWith('others -') &&
                  !v.toLowerCase().startsWith('other -')
                );
                onChange(newValue ? `Others - ${newValue}` : baseValues.join(', '));
              }}
              sx={{ mt: 1 }}
            />
          )}
          {hasOthers && isOtherSelected && !isEditMode && otherValue && (
            <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic' }}>
              {t('otherSpecify') || 'Other'}: {otherValue}
            </Typography>
          )}
        </Box>
      );
    }

    // Single choice with Others (radio buttons)
    if (fieldConfig?.type === 'singleWithOthers') {
      const isOtherSelected = value && (
        value.toLowerCase().includes('others -') ||
        value.toLowerCase().includes('other -') ||
        value.toLowerCase().startsWith('others -') ||
        value.toLowerCase().startsWith('other -') ||
        (value.toLowerCase().includes('others') && !value.toLowerCase().includes('others -')) ||
        (value.toLowerCase().includes('other') && !value.toLowerCase().includes('other -') &&
         value.toLowerCase() !== 'other' && value.toLowerCase() !== 'others')
      );
      // Determine base value - handle both "Other" and "Others"
      let baseValue = value;
      if (isOtherSelected) {
        if (fieldName === 'thrNotReceivedReason' || fieldName === 'thrNotReceivedReason_child' || fieldName === 'thrNotReceivedReasonLast3Month') {
          baseValue = 'Other';
        } else if (fieldName === 'qtyThrFood' || fieldName === 'thrQtyPrepareChild' || fieldName === 'qtyPrepareFood') {
          baseValue = 'Any Other';
        } else if (fieldName === 'storeOpenedThr' || fieldName === 'storeThr' || fieldName === 'thrStore') {
          baseValue = 'Any other';
        } else if (fieldName === 'familyAttendedAnnaprashan') {
          baseValue = 'Others';
        } else {
          baseValue = 'Others';
        }
      }

      // Get options based on field name
      let options = [];
      if (fieldName === 'themeOfCbe') {
        options = [
          { value: 'Annaprashan', label: t('annaprashan') || 'Annaprashan' },
          { value: 'Suposahn Diwas', label: t('suposhahnDiwas') || 'Suposahn Diwas' },
          { value: 'Others', label: t('others') || 'Others' }
        ];
      } else if (fieldName === 'typeOfRecordAvailable') {
        options = [
          { value: 'MCP card', label: t('mcpCard') || 'MCP card' },
          { value: 'Child Growth card', label: t('childGrowthCard') || 'Child Growth card' },
          { value: 'State specific CMAM card', label: t('stateSpecificCMAMCard') || 'State specific CMAM card' },
          { value: 'Others', label: t('others') || 'Others' }
        ];
      } else if (fieldName === 'thrNotReceivedReason' || fieldName === 'thrNotReceivedReason_child' || fieldName === 'thrNotReceivedReasonLast3Month') {
        options = [
          { value: 'Not distributed', label: t('notDistributed') || 'Not distributed' },
          { value: 'Not taken/interested', label: t('notTakenInterested') || 'Not taken/interested' },
          { value: 'Beneficiary was out of village', label: t('beneficiaryWasOutOfVillage') || 'Beneficiary was out of village' },
          { value: 'Other', label: t('other') || 'Other' }
        ];
      } else if (fieldName === 'whoConsumeThr' || fieldName === 'thrConsumer' || fieldName === 'thrConsumedBy') {
        options = [
          { value: 'Only by the intended child', label: t('onlyIntendedChild') || 'Only by the intended child' },
          { value: 'Intended child and other children in the family', label: t('intendedChildOtherChildren') || 'Intended child and other children in the family' },
          { value: 'Intended + other family members including adults', label: t('intendedOtherFamilyMembers') || 'Intended + other family members including adults' },
          { value: 'Only by adults in the family', label: t('onlyAdultsFamily') || 'Only by adults in the family' }
        ];
      } else if (fieldName === 'familyAttendedAnnaprashan') {
        options = [
          { value: 'Husband', label: t('husband') || 'Husband' },
          { value: 'Mother-in-law', label: t('mil') || 'Mother-in-law' },
          { value: 'Others', label: t('others') || 'Others' },
          { value: 'No one else', label: t('noOneElse') || 'No one else' }
        ];
      } else if (fieldName === 'thrQtyPrepareChild' || fieldName === 'qtyThrFood') {
        options = [
          { value: 'Half Katori', label: t('halfKatori') || 'Half Katori' },
          { value: 'One Katori', label: t('oneKatori') || 'One Katori' },
          { value: 'Two Katori', label: t('twoKatori') || 'Two Katori' },
          { value: 'Half Packet', label: t('halfPacket') || 'Half Packet' },
          { value: 'Full Packet', label: t('fullPacket') || 'Full Packet' },
          { value: 'Any Other', label: t('other') || 'Any Other' }
        ];
      } else if (fieldName === 'storeThr' || fieldName === 'storeOpenedThr' || fieldName === 'thrStore') {
        options = [
          { value: 'Closed container', label: t('closeCont') || 'Closed container' },
          { value: 'Keeping the same packet with tightly packed', label: t('tightlyPacked') || 'Keeping the same packet with tightly packed' },
          { value: 'Keeping the same packet opened as it is', label: t('openedPack') || 'Keeping the same packet opened as it is' },
          { value: 'Any other', label: t('other') || 'Any other' }
        ];
      } else {
        // Default Yes/No with Others
        options = [
          ...yesNoOptions,
          { value: 'Others', label: t('others') || 'Others' }
        ];
      }

      return (
        <Box>
          <RadioGroup
            value={baseValue || ''}
            onChange={(e) => {
              if (e.target.value === 'Others' || e.target.value === 'Other') {
                onChange(e.target.value);
              } else {
                onChange(e.target.value);
                setOtherValue('');
              }
            }}
          >
            {options.map((option) => (
              <FormControlLabel
                key={option.value}
                value={option.value}
                control={<Radio disabled={!isEditMode} />}
                label={option.label}
              />
            ))}
          </RadioGroup>

          {isOtherSelected && isEditMode && (
            <TextField
              fullWidth
              size="small"
              label={t('otherSpecify') || 'Other (Please specify)'}
              value={otherValue}
              onChange={(e) => {
                const newValue = e.target.value;
                setOtherValue(newValue);
                let prefix = 'Others';
                if (fieldName === 'thrNotReceivedReason' || fieldName === 'thrNotReceivedReason_child' || fieldName === 'thrNotReceivedReasonLast3Month') {
                  prefix = 'Other';
                } else if (fieldName === 'qtyThrFood' || fieldName === 'thrQtyPrepareChild' || fieldName === 'qtyPrepareFood') {
                  prefix = 'Any Other';
                } else if (fieldName === 'storeOpenedThr' || fieldName === 'storeThr' || fieldName === 'thrStore') {
                  prefix = 'Any other';
                } else if (fieldName === 'familyAttendedAnnaprashan') {
                  prefix = 'Others';
                }
                onChange(newValue ? `${prefix} - ${newValue}` : prefix);
              }}
              sx={{ mt: 1 }}
            />
          )}
          {isOtherSelected && !isEditMode && otherValue && (
            <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic' }}>
              {t('otherSpecify') || 'Other'}: {otherValue}
            </Typography>
          )}
        </Box>
      );
    }

    // Equipment fields (Select dropdown)
    if (['weighingScale', 'salterScale', 'infantometer', 'stadiometer'].includes(fieldName)) {
      return (
        <FormControl fullWidth size="small" disabled={!isEditMode}>
          <InputLabel>{t('selectOption') || 'Select Option'}</InputLabel>
          <Select
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            label={t('selectOption') || 'Select Option'}
            error={!!error}
          >
            <MenuItem value="">{t('selectOption') || 'Select Option'}</MenuItem>
            {equipmentOptions.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
          {error && (
            <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
              {error}
            </Typography>
          )}
        </FormControl>
      );
    }

    // Medicine fields (Select dropdown) - check both camelCase and field name patterns
    const medicineFieldPatterns = [
      'amoxycillin', 'folicAcid', 'albendazole', 'vitA', 'vit_a',
      'ifa', 'multivitamin', 'zinc', 'ors', 'pcm',
      'Amoxycillin', 'FolicAcid', 'Albendazole', 'VitA',
      'Ifa', 'Multivitamin', 'Zinc', 'Ors', 'Pcm'
    ];

    const isMedicineField = medicineFieldPatterns.some(pattern => {
      const lowerFieldName = fieldName.toLowerCase();
      const lowerPattern = pattern.toLowerCase();
      return lowerFieldName === lowerPattern ||
             lowerFieldName.endsWith(lowerPattern) ||
             (lowerFieldName.includes('vhsnd') && lowerFieldName.includes(lowerPattern));
    });

    const isConfiguredField = getSingleChoiceRadioConfig(fieldName, sectionType) !== null;

    if (isMedicineField && !isConfiguredField) {
      return (
        <FormControl fullWidth size="small" disabled={!isEditMode}>
          <InputLabel>{t('selectOption') || 'Select Option'}</InputLabel>
          <Select
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            label={t('selectOption') || 'Select Option'}
            error={!!error}
          >
            <MenuItem value="">{t('selectOption') || 'Select Option'}</MenuItem>
            {medicineOptions.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
          {error && (
            <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
              {error}
            </Typography>
          )}
        </FormControl>
      );
    }

    // Yes/No fields (Radio buttons) - fallback for fields that match Yes/No pattern
    if (['poshanTrackerUpdated', 'childEnrolledCmam', 'childReferralNrc',
         'motherAgreeNrc', 'vhsndAppetiteTestConducted', 'groupCounsellingConducted',
         'childDischargedCmam', 'cmamTraining', 'cmamTrainingDiscussed'].includes(fieldName) ||
        (fieldName.toLowerCase().includes('yes') ||
         fieldName.toLowerCase().includes('no')) ||
        (typeof value === 'string' && (value === 'Yes' || value === 'No'))) {
      return (
        <RadioGroup
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
        >
          {yesNoOptions.map((option) => (
            <FormControlLabel
              key={option.value}
              value={option.value}
              control={<Radio disabled={!isEditMode} />}
              label={option.label}
            />
          ))}
        </RadioGroup>
      );
    }

    // Default: Text field
    return (
      <TextField
        fullWidth
        size="small"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={!isEditMode}
        multiline={typeof value === 'string' && value.length > 100}
        rows={typeof value === 'string' && value.length > 100 ? 3 : 1}
        error={!!error}
        helperText={error}
      />
    );
  };

  const fieldLabel = fieldName
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();

  // Get question number for this field
  const questionNumber = getQuestionNumber(fieldName, sectionType);
  const displayLabel = questionNumber ? `${questionNumber} ${fieldLabel}` : fieldLabel;

  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
        {displayLabel}
        {required && <Box component="span" sx={{ color: '#E2231A', ml: 0.5 }}>*</Box>}
      </Typography>
      {renderField()}
    </Box>
  );
};

export default SectionFieldRenderer;
