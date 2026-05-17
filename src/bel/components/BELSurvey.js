import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Container,
  Typography,
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
  TextField,
  Button,
  Grid,
  Card,
  CardContent,
  Select,
  MenuItem,
  Alert,
  Snackbar,
  useTheme,
  useMediaQuery
} from '@mui/material';
import { styled } from '@mui/material/styles';
import belLogo from '../assets/bel_logo.png';
import apiService from '../../services/api';
// import TranslationTest from './TranslationTest';

// Styled components
const HeaderContainer = styled(Box)(({ theme }) => ({
  background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
  color: 'white',
  padding: theme.spacing(3),
  textAlign: 'center',
  marginBottom: theme.spacing(4),
  boxShadow: '0 4px 20px rgba(25, 118, 210, 0.3)',
  borderRadius: '0 0 20px 20px'
}));

const SurveyContainer = styled(Container)(({ theme }) => ({
  paddingTop: theme.spacing(4),
  paddingBottom: theme.spacing(4),
  maxWidth: '1000px'
}));

const SectionCard = styled(Card)(({ theme }) => ({
  marginBottom: theme.spacing(4),
  boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
  borderRadius: '16px',
  border: '1px solid rgba(255,255,255,0.2)',
  backdropFilter: 'blur(10px)',
  '&:hover': {
    boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
    transform: 'translateY(-2px)',
    transition: 'all 0.3s ease'
  }
}));

const QuestionBox = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(3),
  padding: theme.spacing(3),
  border: '1px solid #e8eaf6',
  borderRadius: '12px',
  backgroundColor: '#f8f9ff',
  transition: 'all 0.2s ease',
  '&:hover': {
    backgroundColor: '#f0f4ff',
    borderColor: '#1976d2',
    transform: 'translateY(-1px)'
  }
}));

const RadioOption = styled(FormControlLabel)(({ theme }) => ({
  margin: theme.spacing(1, 2),
  padding: theme.spacing(1, 2),
  borderRadius: '8px',
  border: '1px solid #e0e0e0',
  backgroundColor: 'white',
  transition: 'all 0.2s ease',
  '&:hover': {
    backgroundColor: '#f5f5f5',
    borderColor: '#1976d2'
  },
  '&.Mui-checked': {
    backgroundColor: '#e3f2fd',
    borderColor: '#1976d2'
  }
}));

const BELSurvey = () => {
  // Use the BEL i18n instance
  const { t, i18n, ready } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  

  
  const [formData, setFormData] = useState({});
  const [language, setLanguage] = useState('en');
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [errorMessage, setErrorMessage] = useState('');

  // Initialize form data
  useEffect(() => {
    setFormData({});
  }, []);

  // Handle language change
  const handleLanguageChange = (event) => {
    const newLang = event.target.value;
    setLanguage(newLang);
    i18n.changeLanguage(newLang);
  };

  // Handle form field changes
  const handleFieldChange = (fieldName, value) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  // Function to check if a conditional question should be shown
  const shouldShowQuestion = (questionKey) => {
    switch (questionKey) {
      case '2a':
        return formData['2'] && parseInt(formData['2']) <= 8;
      case '3a':
        return formData['3'] && (formData['3'] === 'somewhat_dissatisfied' || formData['3'] === 'actively_looking');
      case '8f1':
      case '8f2':
      case '8f3':
        return formData['8a'] && formData['8a'] !== '';
      case '8g1':
      case '8g2':
      case '8g3':
      case '8g4':
        return formData['8b'] && formData['8b'] !== '';
      case '14b':
      case '14c':
      case '14d':
      case '14e':
        return formData['14a'] && formData['14a'] !== '';
      default:
        return true;
    }
  };

  // Function to check if a question is required
  const isQuestionRequired = (questionKey) => {
    // All base questions are required
    const baseQuestions = [
      '1a', '1b', '1c', '1d', '1e',
      '2a', '2b', '2c', '2d',
      '3a', '3b', '3c', '3d',
      '4a', '4b', '4c', '4d',
      '5a', '5b', '5c', '5d', '5e',
      '6a', '6b', '6c', '6d', '6e', '6f',
      '7a', '7b', '7c', '7d',
      '8a', '8b', '8c', '8e',
      '9a', '9b', '9c', '9d',
      '10a', '10b', '10c', '10d', '10e', '10f',
      '11a', '11b', '11c', '11d',
      '12a', '12b', '12c', '12e', '12f',
      '13a', '13b', '13c', '13d', '13e',
      '14a', '14f', '14g', '14h',
      '15a', '15b', '15c', '15d',
      '16a', '16b', '16c', '16d'
    ];

    if (baseQuestions.includes(questionKey)) {
      return true;
    }

    // Conditional questions are required if they should be shown
    return shouldShowQuestion(questionKey);
  };

  // Validation function to check if all required fields are filled
  const validateForm = () => {
    const errors = [];
    const missingFields = [];
    const newValidationErrors = {};

    // Define all required fields based on the form structure
    const allRequiredFields = [
      '1a', '1b', '1c', '1d', '1e',
      '2a', '2b', '2c', '2d',
      '3a', '3b', '3c', '3d',
      '4a', '4b', '4c', '4d',
      '5a', '5b', '5c', '5d', '5e',
      '6a', '6b', '6c', '6d', '6e', '6f',
      '7a', '7b', '7c', '7d',
      '8a', '8b', '8c', '8e',
      '9a', '9b', '9c', '9d',
      '10a', '10b', '10c', '10d', '10e', '10f',
      '11a', '11b', '11c', '11d',
      '12a', '12b', '12c', '12e', '12f',
      '13a', '13b', '13c', '13d', '13e',
      '14a', '14f', '14g', '14h',
      '15a', '15b', '15c', '15d',
      '16a', '16b', '16c', '16d'
    ];

    // Check all required fields
    allRequiredFields.forEach(questionKey => {
      if (!formData[questionKey] || formData[questionKey] === '') {
        missingFields.push(questionKey);
        newValidationErrors[questionKey] = 'This field is required';
      }
    });

    // Check conditional questions that should be shown but are missing
    const conditionalQuestions = ['2a', '3a', '8f1', '8f2', '8f3', '8g1', '8g2', '8g3', '8g4', '14b', '14c', '14d', '14e'];
    
    conditionalQuestions.forEach(questionKey => {
      if (shouldShowQuestion(questionKey) && (!formData[questionKey] || formData[questionKey] === '')) {
        if (!missingFields.includes(questionKey)) {
          missingFields.push(questionKey);
        }
        newValidationErrors[questionKey] = 'This field is required based on your previous answers';
      }
    });

    // Check text fields (section 17) - these are optional but if one is filled, both should be
    if ((formData['17a'] && !formData['17b']) || (!formData['17a'] && formData['17b'])) {
      missingFields.push('17a', '17b');
      newValidationErrors['17a'] = 'If you fill one feedback field, please fill both';
      newValidationErrors['17b'] = 'If you fill one feedback field, please fill both';
    }

    if (missingFields.length > 0) {
      const errorMessage = `Please fill all mandatory questions. Missing: ${missingFields.join(', ')}`;
      errors.push(errorMessage);
    }

    setValidationErrors(newValidationErrors);

    return {
      isValid: errors.length === 0,
      errors: errors,
      missingFields: missingFields
    };
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      // Validate form data
      const validation = validateForm();
      
      if (!validation.isValid) {
        setErrorMessage(validation.errors.join('. '));
        setShowError(true);
        return;
      }

      // Prepare data for submission
      const surveyData = {
        language,
        responses: formData,
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      };

      const response = await apiService.post('/bel/survey', surveyData);

      if (response.success) {
        setShowSuccess(true);
        // Reset form after successful submission
        setTimeout(() => {
          setFormData({});
        }, 2000);
      } else {
        throw new Error('Failed to submit survey');
      }
    } catch (error) {
      setErrorMessage('Failed to submit survey. Please try again.');
      setShowError(true);
    }
  };

  // Handle form reset
  const handleReset = () => {
    setFormData({});
    setValidationErrors({});
  };

  // Render radio options
  const renderRadioOptions = (questionKey) => (
    <RadioGroup
      row={!isMobile}
      value={formData[questionKey] || ''}
      onChange={(e) => handleFieldChange(questionKey, e.target.value)}
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 1,
        justifyContent: 'center'
      }}
    >
      <RadioOption value="1" control={<Radio color="primary" />} label={t('survey.options.strongly_disagree')} />
      <RadioOption value="2" control={<Radio color="primary" />} label={t('survey.options.disagree_somewhat')} />
      <RadioOption value="3" control={<Radio color="primary" />} label={t('survey.options.neutral')} />
      <RadioOption value="4" control={<Radio color="primary" />} label={t('survey.options.agree_somewhat')} />
      <RadioOption value="5" control={<Radio color="primary" />} label={t('survey.options.strongly_agree')} />
    </RadioGroup>
  );

  // Render priority options
  const renderPriorityOptions = (questionKey) => (
    <RadioGroup
      row={!isMobile}
      value={formData[questionKey] || ''}
      onChange={(e) => handleFieldChange(questionKey, e.target.value)}
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 1,
        justifyContent: 'center'
      }}
    >
      <RadioOption value="1" control={<Radio color="primary" />} label="1️⃣ High Priority" />
      <RadioOption value="2" control={<Radio color="primary" />} label="2️⃣ Medium Priority" />
      <RadioOption value="3" control={<Radio color="primary" />} label="3️⃣ Low Priority" />
    </RadioGroup>
  );

  // Render satisfaction options
  const renderSatisfactionOptions = (questionKey) => (
    <RadioGroup
      row={!isMobile}
      value={formData[questionKey] || ''}
      onChange={(e) => handleFieldChange(questionKey, e.target.value)}
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 1,
        justifyContent: 'center'
      }}
    >
      <RadioOption value="satisfied" control={<Radio color="primary" />} label={t('survey.options.strongly_agree')} />
      <RadioOption value="not_satisfied" control={<Radio color="primary" />} label={t('survey.options.strongly_disagree')} />
    </RadioGroup>
  );

  // Render text fields for section 17
  const renderTextFields = () => (
    <Grid container spacing={2}>
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          multiline
          rows={4}
          label={t('survey.questions.17a')}
          value={formData['17a'] || ''}
          onChange={(e) => handleFieldChange('17a', e.target.value)}
          variant="outlined"
          error={!!validationErrors['17a']}
          helperText={validationErrors['17a']}
        />
      </Grid>
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          multiline
          rows={4}
          label={t('survey.questions.17b')}
          value={formData['17b'] || ''}
          onChange={(e) => handleFieldChange('17b', e.target.value)}
          variant="outlined"
          error={!!validationErrors['17b']}
          helperText={validationErrors['17b']}
        />
      </Grid>
    </Grid>
  );

  // Render communication content section
  const renderCommunicationContent = () => {
    if (!shouldShowQuestion('8f1')) return null;
    
    return (
      <QuestionBox>
        <Typography variant="h6" gutterBottom>
          {t('survey.questions.8f')}
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Typography variant="subtitle2" gutterBottom>
              {t('survey.communication_content.all_orders')}
            </Typography>
            {renderPriorityOptions('8f1')}
            {validationErrors['8f1'] && (
              <Typography color="error" variant="caption" sx={{ mt: 1, display: 'block' }}>
                {validationErrors['8f1']}
              </Typography>
            )}
          </Grid>
          <Grid item xs={12}>
            <Typography variant="subtitle2" gutterBottom>
              {t('survey.communication_content.business_decisions')}
            </Typography>
            {renderPriorityOptions('8f2')}
            {validationErrors['8f2'] && (
              <Typography color="error" variant="caption" sx={{ mt: 1, display: 'block' }}>
                {validationErrors['8f2']}
              </Typography>
            )}
          </Grid>
          <Grid item xs={12}>
            <Typography variant="subtitle2" gutterBottom>
              {t('survey.communication_content.transfers')}
            </Typography>
            {renderPriorityOptions('8f3')}
            {validationErrors['8f3'] && (
              <Typography color="error" variant="caption" sx={{ mt: 1, display: 'block' }}>
                {validationErrors['8f3']}
              </Typography>
            )}
          </Grid>
        </Grid>
      </QuestionBox>
    );
  };

  // Render communication mode section
  const renderCommunicationMode = () => {
    if (!shouldShowQuestion('8g1')) return null;
    
    return (
      <QuestionBox>
        <Typography variant="h6" gutterBottom>
          {t('survey.questions.8g')}
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Typography variant="subtitle2" gutterBottom>
              {t('survey.communication_mode.meetings')}
            </Typography>
            {renderPriorityOptions('8g1')}
            {validationErrors['8g1'] && (
              <Typography color="error" variant="caption" sx={{ mt: 1, display: 'block' }}>
                {validationErrors['8g1']}
              </Typography>
            )}
          </Grid>
          <Grid item xs={12}>
            <Typography variant="subtitle2" gutterBottom>
              {t('survey.communication_mode.notice_board')}
            </Typography>
            {renderPriorityOptions('8g2')}
            {validationErrors['8g2'] && (
              <Typography color="error" variant="caption" sx={{ mt: 1, display: 'block' }}>
                {validationErrors['8g2']}
              </Typography>
            )}
          </Grid>
          <Grid item xs={12}>
            <Typography variant="subtitle2" gutterBottom>
              {t('survey.communication_mode.digital')}
            </Typography>
            {renderPriorityOptions('8g3')}
            {validationErrors['8g3'] && (
              <Typography color="error" variant="caption" sx={{ mt: 1, display: 'block' }}>
                {validationErrors['8g3']}
              </Typography>
            )}
          </Grid>
          <Grid item xs={12}>
            <Typography variant="subtitle2" gutterBottom>
              {t('survey.communication_mode.bel_contact')}
            </Typography>
            {renderPriorityOptions('8g4')}
            {validationErrors['8g4'] && (
              <Typography color="error" variant="caption" sx={{ mt: 1, display: 'block' }}>
                {validationErrors['8g4']}
              </Typography>
            )}
          </Grid>
        </Grid>
      </QuestionBox>
    );
  };

  // Render welfare facilities section
  const renderWelfareFacilities = () => {
    if (!shouldShowQuestion('14b')) return null;
    
    return (
      <QuestionBox>
        <Typography variant="h6" gutterBottom>
          {t('survey.satisfaction')}
        </Typography>
        <Grid container spacing={2}>
          {['14b', '14c', '14d', '14e'].map((key) => (
            <Grid item xs={12} key={key}>
              <Typography variant="subtitle2" gutterBottom>
                {t(`survey.questions.${key}`)}
              </Typography>
              {renderSatisfactionOptions(key)}
              {validationErrors[key] && (
                <Typography color="error" variant="caption" sx={{ mt: 1, display: 'block' }}>
                  {validationErrors[key]}
                </Typography>
              )}
            </Grid>
          ))}
        </Grid>
      </QuestionBox>
    );
  };

  // Show loading if translations are not ready
  if (!ready) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <Typography variant="h6">Loading translations...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <HeaderContainer>
        <Box display="flex" alignItems="center" justifyContent="center" gap={2}>
                                    <img src={belLogo} alt="BEL Logo" style={{ height: '50px' }} />
          <Box>
            <Typography variant="h4" component="h1">
              {t('survey.title')}
            </Typography>
            <Typography variant="subtitle1">
              {t('survey.subtitle')}
            </Typography>
          </Box>
        </Box>
        
        {/* Language Selector */}
        <Box mt={2}>
          <FormControl size="small">
            <Select
              value={language}
              onChange={handleLanguageChange}
              sx={{ backgroundColor: 'white', minWidth: 120 }}
            >
              <MenuItem value="en">English</MenuItem>
              <MenuItem value="hi">हिंदी</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </HeaderContainer>

      {/* Survey Form */}
      <SurveyContainer>
        <form onSubmit={handleSubmit}>
          {/* Section 1: Role */}
          <SectionCard>
            <CardContent>
              <Typography variant="h5" gutterBottom color="primary">
                1. {t('survey.sections.role')}
              </Typography>
              {['1a', '1b', '1c', '1d', '1e'].map((key) => (
                <QuestionBox key={key}>
                  <Typography variant="subtitle1" gutterBottom>
                    {t(`survey.questions.${key}`)}
                    {isQuestionRequired(key) && <span style={{ color: 'red' }}> *</span>}
                  </Typography>
                  {renderRadioOptions(key)}
                  {validationErrors[key] && (
                    <Typography color="error" variant="caption" sx={{ mt: 1, display: 'block' }}>
                      {validationErrors[key]}
                    </Typography>
                  )}
                </QuestionBox>
              ))}
            </CardContent>
          </SectionCard>

          {/* Section 2: Contribution */}
          <SectionCard>
            <CardContent>
              <Typography variant="h5" gutterBottom color="primary">
                2. {t('survey.sections.contribution')}
              </Typography>
              {['2a', '2b', '2c', '2d'].map((key) => (
                <QuestionBox key={key}>
                  <Typography variant="subtitle1" gutterBottom>
                    {t(`survey.questions.${key}`)}
                    {isQuestionRequired(key) && <span style={{ color: 'red' }}> *</span>}
                  </Typography>
                  {renderRadioOptions(key)}
                  {validationErrors[key] && (
                    <Typography color="error" variant="caption" sx={{ mt: 1, display: 'block' }}>
                      {validationErrors[key]}
                    </Typography>
                  )}
                </QuestionBox>
              ))}
              
              {/* Conditional Question 2a */}
              {shouldShowQuestion('2a') && (
                <QuestionBox>
                  <Typography variant="subtitle1" gutterBottom>
                    {t('survey.questions.2a')}
                    <span style={{ color: 'red' }}> *</span>
                  </Typography>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    placeholder="Please provide your suggestions..."
                    value={formData['2a'] || ''}
                    onChange={(e) => handleFieldChange('2a', e.target.value)}
                    variant="outlined"
                    error={!!validationErrors['2a']}
                    helperText={validationErrors['2a']}
                  />
                </QuestionBox>
              )}
            </CardContent>
          </SectionCard>

          {/* Section 3: Performance */}
          <SectionCard>
            <CardContent>
              <Typography variant="h5" gutterBottom color="primary">
                3. {t('survey.sections.performance')}
              </Typography>
              {['3a', '3b', '3c', '3d'].map((key) => (
                <QuestionBox key={key}>
                  <Typography variant="subtitle1" gutterBottom>
                    {t(`survey.questions.${key}`)}
                    {isQuestionRequired(key) && <span style={{ color: 'red' }}> *</span>}
                  </Typography>
                  {renderRadioOptions(key)}
                  {validationErrors[key] && (
                    <Typography color="error" variant="caption" sx={{ mt: 1, display: 'block' }}>
                      {validationErrors[key]}
                    </Typography>
                  )}
                </QuestionBox>
              ))}
              
              {/* Conditional Question 3a */}
              {shouldShowQuestion('3a') && (
                <QuestionBox>
                  <Typography variant="subtitle1" gutterBottom>
                    {t('survey.questions.3a')}
                    <span style={{ color: 'red' }}> *</span>
                  </Typography>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    placeholder="Please provide your reasons..."
                    value={formData['3a'] || ''}
                    onChange={(e) => handleFieldChange('3a', e.target.value)}
                    variant="outlined"
                    error={!!validationErrors['3a']}
                    helperText={validationErrors['3a']}
                  />
                </QuestionBox>
              )}
            </CardContent>
          </SectionCard>

          {/* Section 4: Reward */}
          <SectionCard>
            <CardContent>
              <Typography variant="h5" gutterBottom color="primary">
                4. {t('survey.sections.reward')}
              </Typography>
              {['4a', '4b', '4c', '4d'].map((key) => (
                <QuestionBox key={key}>
                  <Typography variant="subtitle1" gutterBottom>
                    {t(`survey.questions.${key}`)}
                    {isQuestionRequired(key) && <span style={{ color: 'red' }}> *</span>}
                  </Typography>
                  {renderRadioOptions(key)}
                  {validationErrors[key] && (
                    <Typography color="error" variant="caption" sx={{ mt: 1, display: 'block' }}>
                      {validationErrors[key]}
                    </Typography>
                  )}
                </QuestionBox>
              ))}
            </CardContent>
          </SectionCard>

          {/* Section 5: Teamwork */}
          <SectionCard>
            <CardContent>
              <Typography variant="h5" gutterBottom color="primary">
                5. {t('survey.sections.teamwork')}
              </Typography>
              {['5a', '5b', '5c', '5d', '5e'].map((key) => (
                <QuestionBox key={key}>
                  <Typography variant="subtitle1" gutterBottom>
                    {t(`survey.questions.${key}`)}
                    {isQuestionRequired(key) && <span style={{ color: 'red' }}> *</span>}
                  </Typography>
                  {renderRadioOptions(key)}
                  {validationErrors[key] && (
                    <Typography color="error" variant="caption" sx={{ mt: 1, display: 'block' }}>
                      {validationErrors[key]}
                    </Typography>
                  )}
                </QuestionBox>
              ))}
            </CardContent>
          </SectionCard>

          {/* Section 6: Superior */}
          <SectionCard>
            <CardContent>
              <Typography variant="h5" gutterBottom color="primary">
                6. {t('survey.sections.superior')}
              </Typography>
              {['6a', '6b', '6c', '6d', '6e', '6f'].map((key) => (
                <QuestionBox key={key}>
                  <Typography variant="subtitle1" gutterBottom>
                    {t(`survey.questions.${key}`)}
                    {isQuestionRequired(key) && <span style={{ color: 'red' }}> *</span>}
                  </Typography>
                  {renderRadioOptions(key)}
                  {validationErrors[key] && (
                    <Typography color="error" variant="caption" sx={{ mt: 1, display: 'block' }}>
                      {validationErrors[key]}
                    </Typography>
                  )}
                </QuestionBox>
              ))}
            </CardContent>
          </SectionCard>

          {/* Section 7: Learning */}
          <SectionCard>
            <CardContent>
              <Typography variant="h5" gutterBottom color="primary">
                7. {t('survey.sections.learning')}
              </Typography>
              {['7a', '7b', '7c', '7d'].map((key) => (
                <QuestionBox key={key}>
                  <Typography variant="subtitle1" gutterBottom>
                    {t(`survey.questions.${key}`)}
                    {isQuestionRequired(key) && <span style={{ color: 'red' }}> *</span>}
                  </Typography>
                  {renderRadioOptions(key)}
                  {validationErrors[key] && (
                    <Typography color="error" variant="caption" sx={{ mt: 1, display: 'block' }}>
                      {validationErrors[key]}
                    </Typography>
                  )}
                </QuestionBox>
              ))}
            </CardContent>
          </SectionCard>

          {/* Section 8: Communication */}
          <SectionCard>
            <CardContent>
              <Typography variant="h5" gutterBottom color="primary">
                8. {t('survey.sections.communication')}
              </Typography>
              {['8a', '8b', '8c', '8e'].map((key) => (
                <QuestionBox key={key}>
                  <Typography variant="subtitle1" gutterBottom>
                    {t(`survey.questions.${key}`)}
                    {isQuestionRequired(key) && <span style={{ color: 'red' }}> *</span>}
                  </Typography>
                  {renderRadioOptions(key)}
                  {validationErrors[key] && (
                    <Typography color="error" variant="caption" sx={{ mt: 1, display: 'block' }}>
                      {validationErrors[key]}
                    </Typography>
                  )}
                </QuestionBox>
              ))}
              {renderCommunicationContent()}
              {renderCommunicationMode()}
            </CardContent>
          </SectionCard>

          {/* Section 9: HR Policies */}
          <SectionCard>
            <CardContent>
              <Typography variant="h5" gutterBottom color="primary">
                9. {t('survey.sections.hr_policies')}
              </Typography>
              {['9a', '9b', '9c', '9d'].map((key) => (
                <QuestionBox key={key}>
                  <Typography variant="subtitle1" gutterBottom>
                    {t(`survey.questions.${key}`)}
                    {isQuestionRequired(key) && <span style={{ color: 'red' }}> *</span>}
                  </Typography>
                  {renderRadioOptions(key)}
                  {validationErrors[key] && (
                    <Typography color="error" variant="caption" sx={{ mt: 1, display: 'block' }}>
                      {validationErrors[key]}
                    </Typography>
                  )}
                </QuestionBox>
              ))}
            </CardContent>
          </SectionCard>

          {/* Section 10: Leadership */}
          <SectionCard>
            <CardContent>
              <Typography variant="h5" gutterBottom color="primary">
                10. {t('survey.sections.leadership')}
              </Typography>
              {['10a', '10b', '10c', '10d', '10e', '10f'].map((key) => (
                <QuestionBox key={key}>
                  <Typography variant="subtitle1" gutterBottom>
                    {t(`survey.questions.${key}`)}
                    {isQuestionRequired(key) && <span style={{ color: 'red' }}> *</span>}
                  </Typography>
                  {renderRadioOptions(key)}
                  {validationErrors[key] && (
                    <Typography color="error" variant="caption" sx={{ mt: 1, display: 'block' }}>
                      {validationErrors[key]}
                    </Typography>
                  )}
                </QuestionBox>
              ))}
            </CardContent>
          </SectionCard>

          {/* Section 11: Career */}
          <SectionCard>
            <CardContent>
              <Typography variant="h5" gutterBottom color="primary">
                11. {t('survey.sections.career')}
              </Typography>
              {['11a', '11b', '11c', '11d'].map((key) => (
                <QuestionBox key={key}>
                  <Typography variant="subtitle1" gutterBottom>
                    {t(`survey.questions.${key}`)}
                    {isQuestionRequired(key) && <span style={{ color: 'red' }}> *</span>}
                  </Typography>
                  {renderRadioOptions(key)}
                  {validationErrors[key] && (
                    <Typography color="error" variant="caption" sx={{ mt: 1, display: 'block' }}>
                      {validationErrors[key]}
                    </Typography>
                  )}
                </QuestionBox>
              ))}
            </CardContent>
          </SectionCard>

          {/* Section 12: Culture */}
          <SectionCard>
            <CardContent>
              <Typography variant="h5" gutterBottom color="primary">
                12. {t('survey.sections.culture')}
              </Typography>
              {['12a', '12b', '12c', '12e', '12f'].map((key) => (
                <QuestionBox key={key}>
                  <Typography variant="subtitle1" gutterBottom>
                    {t(`survey.questions.${key}`)}
                    {isQuestionRequired(key) && <span style={{ color: 'red' }}> *</span>}
                  </Typography>
                  {renderRadioOptions(key)}
                  {validationErrors[key] && (
                    <Typography color="error" variant="caption" sx={{ mt: 1, display: 'block' }}>
                      {validationErrors[key]}
                    </Typography>
                  )}
                </QuestionBox>
              ))}
            </CardContent>
          </SectionCard>

          {/* Section 13: Values */}
          <SectionCard>
            <CardContent>
              <Typography variant="h5" gutterBottom color="primary">
                13. {t('survey.sections.values')}
              </Typography>
              {['13a', '13b', '13c', '13d', '13e'].map((key) => (
                <QuestionBox key={key}>
                  <Typography variant="subtitle1" gutterBottom>
                    {t(`survey.questions.${key}`)}
                    {isQuestionRequired(key) && <span style={{ color: 'red' }}> *</span>}
                  </Typography>
                  {renderRadioOptions(key)}
                  {validationErrors[key] && (
                    <Typography color="error" variant="caption" sx={{ mt: 1, display: 'block' }}>
                      {validationErrors[key]}
                    </Typography>
                  )}
                </QuestionBox>
              ))}
            </CardContent>
          </SectionCard>

          {/* Section 14: Welfare */}
          <SectionCard>
            <CardContent>
              <Typography variant="h5" gutterBottom color="primary">
                14. {t('survey.sections.welfare')}
              </Typography>
              <QuestionBox>
                <Typography variant="subtitle1" gutterBottom>
                  {t('survey.questions.14a')}
                  {isQuestionRequired('14a') && <span style={{ color: 'red' }}> *</span>}
                </Typography>
                {renderRadioOptions('14a')}
                {validationErrors['14a'] && (
                  <Typography color="error" variant="caption" sx={{ mt: 1, display: 'block' }}>
                    {validationErrors['14a']}
                  </Typography>
                )}
              </QuestionBox>
              {renderWelfareFacilities()}
              {['14f', '14g', '14h'].map((key) => (
                <QuestionBox key={key}>
                  <Typography variant="subtitle1" gutterBottom>
                    {t(`survey.questions.${key}`)}
                    {isQuestionRequired(key) && <span style={{ color: 'red' }}> *</span>}
                  </Typography>
                  {renderRadioOptions(key)}
                  {validationErrors[key] && (
                    <Typography color="error" variant="caption" sx={{ mt: 1, display: 'block' }}>
                      {validationErrors[key]}
                    </Typography>
                  )}
                </QuestionBox>
              ))}
            </CardContent>
          </SectionCard>

          {/* Section 15: Involvement */}
          <SectionCard>
            <CardContent>
              <Typography variant="h5" gutterBottom color="primary">
                15. {t('survey.sections.involvement')}
              </Typography>
              {['15a', '15b', '15c', '15d'].map((key) => (
                <QuestionBox key={key}>
                  <Typography variant="subtitle1" gutterBottom>
                    {t(`survey.questions.${key}`)}
                    {isQuestionRequired(key) && <span style={{ color: 'red' }}> *</span>}
                  </Typography>
                  {renderRadioOptions(key)}
                  {validationErrors[key] && (
                    <Typography color="error" variant="caption" sx={{ mt: 1, display: 'block' }}>
                      {validationErrors[key]}
                    </Typography>
                  )}
                </QuestionBox>
              ))}
            </CardContent>
          </SectionCard>

          {/* Section 16: Innovation */}
          <SectionCard>
            <CardContent>
              <Typography variant="h5" gutterBottom color="primary">
                16. {t('survey.sections.innovation')}
              </Typography>
              {['16a', '16b', '16c', '16d'].map((key) => (
                <QuestionBox key={key}>
                  <Typography variant="subtitle1" gutterBottom>
                    {t(`survey.questions.${key}`)}
                    {isQuestionRequired(key) && <span style={{ color: 'red' }}> *</span>}
                  </Typography>
                  {renderRadioOptions(key)}
                  {validationErrors[key] && (
                    <Typography color="error" variant="caption" sx={{ mt: 1, display: 'block' }}>
                      {validationErrors[key]}
                    </Typography>
                  )}
                </QuestionBox>
              ))}
            </CardContent>
          </SectionCard>

          {/* Section 17: Text Fields */}
          <SectionCard>
            <CardContent>
              <Typography variant="h5" gutterBottom color="primary">
                17. {t('survey.sections.good_things')} / {t('survey.sections.improvements')}
              </Typography>
              {renderTextFields()}
            </CardContent>
          </SectionCard>

          {/* Submit Buttons */}
          <Box 
            display="flex" 
            justifyContent="center" 
            gap={3} 
            mt={6} 
            mb={4}
            sx={{
              background: 'linear-gradient(135deg, #f8f9ff 0%, #e3f2fd 100%)',
              padding: 3,
              borderRadius: '16px',
              border: '1px solid #e8eaf6'
            }}
          >
            <Button
              variant="contained"
              color="primary"
              size="large"
              type="submit"
              sx={{ 
                minWidth: 180,
                height: 56,
                borderRadius: '12px',
                fontSize: '1.1rem',
                fontWeight: 600,
                textTransform: 'none',
                background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
                boxShadow: '0 4px 20px rgba(25, 118, 210, 0.3)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #1565c0 0%, #0d47a1 100%)',
                  boxShadow: '0 6px 25px rgba(25, 118, 210, 0.4)',
                  transform: 'translateY(-2px)'
                }
              }}
            >
              📤 {t('survey.submit')}
            </Button>
            <Button
              variant="outlined"
              color="secondary"
              size="large"
              onClick={handleReset}
              sx={{ 
                minWidth: 180,
                height: 56,
                borderRadius: '12px',
                fontSize: '1.1rem',
                fontWeight: 600,
                textTransform: 'none',
                borderColor: '#f50057',
                color: '#f50057',
                '&:hover': {
                  borderColor: '#c51162',
                  backgroundColor: 'rgba(245, 0, 87, 0.04)',
                  transform: 'translateY(-2px)'
                }
              }}
            >
              🔄 {t('survey.reset')}
            </Button>
          </Box>
        </form>
      </SurveyContainer>

      {/* Footer */}
      <Box
        component="footer"
        sx={{
          background: 'linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 100%)',
          padding: theme.spacing(3),
          textAlign: 'center',
          borderTop: '1px solid #d0d0d0',
          marginTop: 4
        }}
      >
        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
          📊 {t('footer.version')} 1.0.0 | {t('footer.copyright')}
        </Typography>
      </Box>

      {/* Success Snackbar */}
      <Snackbar
        open={showSuccess}
        autoHideDuration={6000}
        onClose={() => setShowSuccess(false)}
      >
        <Alert onClose={() => setShowSuccess(false)} severity="success">
          Survey submitted successfully!
        </Alert>
      </Snackbar>

      {/* Error Snackbar */}
      <Snackbar
        open={showError}
        autoHideDuration={6000}
        onClose={() => setShowError(false)}
      >
        <Alert onClose={() => setShowError(false)} severity="error">
          {errorMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default BELSurvey; 