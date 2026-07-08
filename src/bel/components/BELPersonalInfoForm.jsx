import React from 'react';
import {
  Container,
  Card,
  CardContent,
  Typography,
  Grid,
  FormControl,
  Select,
  MenuItem,
  TextField,
  Button,
  FormHelperText,
  Box
} from '@mui/material';
import { ArrowForward as ArrowForwardIcon } from '@mui/icons-material';
import {
  SBU_OPTIONS,
  AGE_OPTIONS,
  SERVICE_OPTIONS,
  GENDER_OPTIONS,
  DEPARTMENT_MAX_LENGTH,
  DEPARTMENT_ALLOWED,
  GRADE_MAX_LENGTH,
  GRADE_ALLOWED
} from '../constants/personalInfo';

/**
 * Personal Information step shown before the BEL survey questions.
 * Purely presentational — all state lives in the parent (BELSurvey2024).
 *
 * Props:
 *  - values:     { sbuName, age, serviceInBel, gender, departmentName, gradeWageGroup }
 *  - errors:     same keys -> error message string (only present when invalid)
 *  - onChange:   (field, value) => void
 *  - onContinue: () => void   (parent validates, then reveals the survey)
 *  - t:          i18n translate fn (belI18n 'translation' namespace)
 *  - isMobile:   boolean
 */
const BELPersonalInfoForm = ({ values, errors, onChange, onContinue, t, isMobile }) => {
  const FieldLabel = ({ text }) => (
    <Typography
      variant="subtitle2"
      sx={{ fontWeight: 600, color: '#2c3e50', mb: 0.5 }}
    >
      {text}
      <span style={{ color: 'red' }}> *</span>
    </Typography>
  );

  const renderSelect = (field, labelKey, placeholderKey, options) => (
    <FormControl fullWidth size="small" error={!!errors[field]}>
      <FieldLabel text={t(labelKey)} />
      <Select
        value={values[field] || ''}
        onChange={(e) => onChange(field, e.target.value)}
        displayEmpty
        sx={{ backgroundColor: 'white', borderRadius: '8px' }}
      >
        <MenuItem value="" disabled>
          {t(placeholderKey)}
        </MenuItem>
        {options.map((opt) => (
          <MenuItem key={opt.value} value={opt.value}>
            {t(opt.labelKey)}
          </MenuItem>
        ))}
      </Select>
      {errors[field] && <FormHelperText>{errors[field]}</FormHelperText>}
    </FormControl>
  );

  const handleTextChange = (field, allowed, maxLength, upperCase) => (e) => {
    let value = e.target.value;
    if (upperCase) value = value.toUpperCase();
    if (value.length > maxLength) value = value.slice(0, maxLength);
    // Only accept the keystroke if it still matches the allowed pattern.
    if (allowed.test(value)) {
      onChange(field, value);
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 2 }}>
      <Card
        sx={{
          borderRadius: '12px',
          boxShadow: '0 6px 20px rgba(0,0,0,0.08)',
          border: '1px solid rgba(255,255,255,0.2)',
          background: 'linear-gradient(135deg, #ffffff 0%, #f8f9ff 100%)'
        }}
      >
        <CardContent sx={{ p: isMobile ? 2 : 3 }}>
          <Typography
            variant="h5"
            gutterBottom
            sx={{ color: '#1976d2', fontWeight: 700, mb: 0.5 }}
          >
            {t('personalInfo.title')}
          </Typography>
          <Typography variant="body2" sx={{ color: '#666', mb: 2.5 }}>
            {t('personalInfo.subtitle')}
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              {renderSelect(
                'sbuName',
                'personalInfo.labels.sbuName',
                'personalInfo.placeholders.sbuName',
                SBU_OPTIONS
              )}
            </Grid>
            <Grid item xs={12} sm={6}>
              {renderSelect(
                'age',
                'personalInfo.labels.age',
                'personalInfo.placeholders.age',
                AGE_OPTIONS
              )}
            </Grid>
            <Grid item xs={12} sm={6}>
              {renderSelect(
                'serviceInBel',
                'personalInfo.labels.serviceInBel',
                'personalInfo.placeholders.serviceInBel',
                SERVICE_OPTIONS
              )}
            </Grid>
            <Grid item xs={12} sm={6}>
              {renderSelect(
                'gender',
                'personalInfo.labels.gender',
                'personalInfo.placeholders.gender',
                GENDER_OPTIONS
              )}
            </Grid>

            <Grid item xs={12} sm={6}>
              <Box>
                <FieldLabel text={t('personalInfo.labels.departmentName')} />
                <TextField
                  size="small"
                  fullWidth
                  value={values.departmentName || ''}
                  onChange={handleTextChange(
                    'departmentName',
                    DEPARTMENT_ALLOWED,
                    DEPARTMENT_MAX_LENGTH,
                    false
                  )}
                  placeholder={t('personalInfo.placeholders.departmentName')}
                  inputProps={{ maxLength: DEPARTMENT_MAX_LENGTH }}
                  error={!!errors.departmentName}
                  helperText={errors.departmentName || t('personalInfo.hints.departmentName')}
                  sx={{ backgroundColor: 'white', borderRadius: '8px' }}
                />
              </Box>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Box>
                <FieldLabel text={t('personalInfo.labels.gradeWageGroup')} />
                <TextField
                  size="small"
                  fullWidth
                  value={values.gradeWageGroup || ''}
                  onChange={handleTextChange(
                    'gradeWageGroup',
                    GRADE_ALLOWED,
                    GRADE_MAX_LENGTH,
                    true
                  )}
                  placeholder={t('personalInfo.placeholders.gradeWageGroup')}
                  inputProps={{ maxLength: GRADE_MAX_LENGTH }}
                  error={!!errors.gradeWageGroup}
                  helperText={errors.gradeWageGroup || t('personalInfo.hints.gradeWageGroup')}
                  sx={{ backgroundColor: 'white', borderRadius: '8px' }}
                />
              </Box>
            </Grid>
          </Grid>

          <Box display="flex" justifyContent="center" sx={{ mt: 3 }}>
            <Button
              variant="contained"
              size="medium"
              onClick={onContinue}
              endIcon={<ArrowForwardIcon />}
              sx={{
                minWidth: 200,
                height: 48,
                borderRadius: '24px',
                fontSize: '1rem',
                fontWeight: 600,
                textTransform: 'none',
                background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
                boxShadow: '0 6px 18px rgba(25, 118, 210, 0.3)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #1565c0 0%, #1976d2 100%)',
                  boxShadow: '0 8px 25px rgba(25, 118, 210, 0.4)',
                  transform: 'translateY(-1px)'
                }
              }}
            >
              {t('personalInfo.continue')}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
};

export default BELPersonalInfoForm;
