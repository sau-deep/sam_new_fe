import React from 'react';
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
import {
  parseMultiSelect,
  serializeMultiSelect,
  findOtherOptionKey,
  parseSingleChoice,
  serializeSingleChoice
} from '../../pages/survey/rmc/otherOptions';
import {
  columnLimitFor,
  SECTION_TYPE_TO_KEY,
  otherDetailMax,
  otherDetailError,
  storedValueError
} from '../../pages/survey/rmc/rmcLimits';
import { textLength } from '../../utils/textLimits';

// Multi-select questions whose intake option keys differ from fieldMappings.
// Section 10 Q10.25 stores the intake keys below ("othersAdvice" is its Other option).
const MULTI_CHOICE_OVERRIDES = {
  household: {
    adviceReceived: [
      'timelyInitiationComplementaryFeeding',
      'reinforcedMessagesContinuedBreastfeeding',
      'immunization',
      'managementIllnessHome',
      'managementContinuedFeedingIllness',
      'hygieneSanitation',
      'counselledFamilyReferral',
      'responsiveFeeding',
      'dietaryDiversity',
      'consistencyFood',
      'quantityQualityFood',
      'consumptionTHR',
      'othersAdvice'
    ]
  }
};

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

    const override = MULTI_CHOICE_OVERRIDES[sectionKey]?.[fieldName];
    if (override) {
      return {
        type: 'multiple',
        config: {
          options: override,
          displayNames: Object.fromEntries(override.map((k) => [k, k === 'othersAdvice' ? (t('others') || 'Others') : t(k)]))
        }
      };
    }

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

  // Character limit of the stored answer (contract cap or column width, F05 / C4), else undefined.
  const columnLimit = columnLimitFor(SECTION_TYPE_TO_KEY[sectionType], fieldName);

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

      // Exact option keys; the Other text keeps its commas; tokens that match no
      // option (older rows, renamed options) are kept and shown (audit A02).
      const parsed = parseMultiSelect(value, config);
      const otherKey = findOtherOptionKey(config.options);
      const write = (next) => onChange(serializeMultiSelect({ ...parsed, ...next }, config));
      const otherMax = columnLimit ? otherDetailMax(columnLimit) : null;
      const otherLengthError = otherMax != null && parsed.otherSelected ? otherDetailError(parsed.otherText, otherMax) : null;

      return (
        <Box>
          <FormGroup>
            {config.options.map((optionKey) => {
              const displayName = config.displayNames?.[optionKey] || optionKey;
              const isOther = optionKey === otherKey;
              const isSelected = isOther ? parsed.otherSelected : parsed.selected.includes(optionKey);
              return (
                <FormControlLabel
                  key={optionKey}
                  control={
                    <Checkbox
                      checked={isSelected}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        if (isOther) {
                          write(checked ? { otherSelected: true } : { otherSelected: false, otherText: '' });
                        } else {
                          const selected = checked
                            ? (parsed.selected.includes(optionKey) ? parsed.selected : [...parsed.selected, optionKey])
                            : parsed.selected.filter((k) => k !== optionKey);
                          write({ selected });
                        }
                      }}
                      disabled={!isEditMode}
                    />
                  }
                  label={displayName}
                />
              );
            })}
            {parsed.extras.map((token) => (
              <FormControlLabel
                key={`saved-${token}`}
                control={
                  <Checkbox
                    checked
                    onChange={() => write({ extras: parsed.extras.filter((x) => x !== token) })}
                    disabled={!isEditMode}
                  />
                }
                label={`${token} (saved answer)`}
              />
            ))}
          </FormGroup>

          {/* Others text field */}
          {parsed.otherSelected && isEditMode && (
            <TextField
              fullWidth
              size="small"
              label={t('otherSpecify') || 'Other (Please specify)'}
              value={parsed.otherText}
              onChange={(e) => write({ otherSelected: true, otherText: e.target.value })}
              error={!!otherLengthError}
              helperText={otherLengthError || (otherMax != null ? `${textLength(parsed.otherText.trim())}/${otherMax}` : undefined)}
              sx={{ mt: 1 }}
            />
          )}
          {parsed.otherSelected && !isEditMode && parsed.otherText && (
            <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic' }}>
              {t('otherSpecify') || 'Other'}: {parsed.otherText}
            </Typography>
          )}
          {error && (
            <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>
              {error}
            </Typography>
          )}
        </Box>
      );
    }

    // Single choice with Others (radio buttons)
    if (fieldConfig?.type === 'singleWithOthers') {
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
      } else if (fieldName === 'childHeightInstrument') {
        // 4.13 - values must match SkillAssessment.jsx exactly (English, stored in DB)
        options = [
          { value: 'Infantometer', label: t('infantometer') || 'Infantometer' },
          { value: 'Stadiometer', label: t('stadiometer') || 'Stadiometer' },
          { value: 'Not functional / Not available', label: t('notFunctionalNotAvailable') || 'Not functional / Not available' },
          { value: 'Others', label: t('others') || 'Others' }
        ];
      } else if (fieldName === 'childFollowupCmam') {
        // 4.23 - values must match SkillAssessment.jsx exactly (English, stored in DB)
        options = [
          { value: 'Weekly', label: t('weekly') || 'Weekly' },
          { value: 'Fortnightly', label: t('fortnightly') || 'Fortnightly' },
          { value: 'Monthly', label: t('monthly') || 'Monthly' },
          { value: 'Quarterly', label: t('quarterly') || 'Quarterly' },
          { value: "Don't know", label: t('dontKnow') || "Don't know" },
          { value: 'Others', label: t('others') || 'Others' }
        ];
      } else {
        // Default Yes/No with Others
        options = [
          ...yesNoOptions,
          { value: 'Others', label: t('others') || 'Others' }
        ];
      }

      // The option that means Other for this question ("Others", "Other", "Any Other", "Any other").
      const otherOption = (options.find((o) => /^(any\s+)?others?$/i.test(o.value)) || {}).value || 'Others';
      // Exact parse: "Intended child and other children…" is a normal answer, not Other (A02).
      const single = parseSingleChoice(value, otherOption);
      const matchedChoice = options.find((o) => o.value.toLowerCase() === String(single.choice).toLowerCase());
      if (matchedChoice) single.choice = matchedChoice.value;
      const otherMax = columnLimit ? otherDetailMax(columnLimit) : null;
      const otherLengthError = otherMax != null && single.isOther ? otherDetailError(single.otherText, otherMax) : null;

      return (
        <Box>
          <RadioGroup
            value={single.choice || ''}
            onChange={(e) => onChange(serializeSingleChoice(e.target.value, e.target.value === otherOption ? single.otherText : '', otherOption))}
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

          {single.isOther && isEditMode && (
            <TextField
              fullWidth
              size="small"
              label={t('otherSpecify') || 'Other (Please specify)'}
              value={single.otherText}
              onChange={(e) => onChange(serializeSingleChoice(otherOption, e.target.value, otherOption))}
              error={!!otherLengthError}
              helperText={otherLengthError || (otherMax != null ? `${textLength(single.otherText.trim())}/${otherMax}` : undefined)}
              sx={{ mt: 1 }}
            />
          )}
          {single.isOther && !isEditMode && single.otherText && (
            <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic' }}>
              {t('otherSpecify') || 'Other'}: {single.otherText}
            </Typography>
          )}
          {error && (
            <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>
              {error}
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

    // Default: Text field (long notes are checked against their stored limit)
    const limitError = columnLimit ? storedValueError(value, columnLimit) : null;
    return (
      <TextField
        fullWidth
        size="small"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={!isEditMode}
        multiline={typeof value === 'string' && value.length > 100}
        rows={typeof value === 'string' && value.length > 100 ? 3 : 1}
        error={!!error || !!limitError}
        helperText={error || limitError}
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
