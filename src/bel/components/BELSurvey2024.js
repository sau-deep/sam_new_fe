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
  useMediaQuery,
  Checkbox,
  FormGroup,
  Slider,
  Chip,
  Paper,
  LinearProgress,
  Fade,
  Zoom,
  CircularProgress
} from '@mui/material';
import { styled, keyframes } from '@mui/material/styles';
import { 
  Language as LanguageIcon,
  Send as SendIcon,
  Refresh as RefreshIcon,
  EmojiEmotions as EmojiIcon
} from '@mui/icons-material';
import belLogo from '../assets/bel_logo.png';
import apiService from '../../services/api';
import belI18n from '../i18n-beltest';
import BELPersonalInfoForm from './BELPersonalInfoForm';
import {
  EMPTY_PERSONAL_INFO,
  DEPARTMENT_ALLOWED,
  DEPARTMENT_MAX_LENGTH,
  GRADE_ALLOWED,
  GRADE_MAX_LENGTH
} from '../constants/personalInfo';

// Number of ranks to collect per ranking question (Q13 → top 2, Q16 → top 3)
const RANKING_MAX = { q13: 2, q16: 3 };

// Animations
const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
`;

const pulse = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
`;

// Styled components
const HeaderContainer = styled(Box)(({ theme }) => ({
  background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 50%, #0d47a1 100%)',
  color: 'white',
  padding: theme.spacing(2),
  textAlign: 'center',
  marginBottom: theme.spacing(2),
  boxShadow: '0 4px 16px rgba(25, 118, 210, 0.3)',
  borderRadius: '0 0 15px 15px',
  position: 'relative',
  overflow: 'hidden',

  [theme.breakpoints.down('md')]: {
    padding: theme.spacing(1.5),
    marginBottom: theme.spacing(1.5)
  }
}));

const SurveyContainer = styled(Container)(({ theme }) => ({
  paddingTop: theme.spacing(1),
  paddingBottom: theme.spacing(1),
  maxWidth: '1200px',
  [theme.breakpoints.down('md')]: {
    paddingTop: theme.spacing(0.5),
    paddingBottom: theme.spacing(0.5)
  }
}));

const SectionCard = styled(Card)(({ theme }) => ({
  marginBottom: theme.spacing(1.5),
  boxShadow: '0 6px 20px rgba(0,0,0,0.08)',
  borderRadius: '12px',
  border: '1px solid rgba(255,255,255,0.2)',
  backdropFilter: 'blur(10px)',
  background: 'linear-gradient(135deg, #ffffff 0%, #f8f9ff 100%)',
  animation: `${fadeIn} 0.6s ease-out`,
  '&:hover': {
    boxShadow: '0 8px 25px rgba(0,0,0,0.12)',
    transform: 'translateY(-2px)',
    transition: 'all 0.3s ease'
  },
  [theme.breakpoints.down('md')]: {
    marginBottom: theme.spacing(1)
  }
}));

const QuestionBox = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'hasError'
})(({ theme, hasError }) => ({
  marginBottom: theme.spacing(1),
  padding: theme.spacing(1.5),
  border: hasError ? '2px solid #f44336' : '1px solid #e8eaf6',
  borderRadius: '8px',
  backgroundColor: hasError ? '#ffebee' : '#f8f9ff',
  transition: 'all 0.3s ease',
  position: 'relative',
  boxShadow: hasError ? '0 0 8px rgba(244, 67, 54, 0.2)' : 'none',
  '&:hover': {
    backgroundColor: hasError ? '#ffcdd2' : '#f0f4ff',
    borderColor: hasError ? '#f44336' : '#1976d2',
    transform: 'translateY(-1px)',
    boxShadow: hasError ? '0 4px 15px rgba(244, 67, 54, 0.3)' : '0 4px 15px rgba(25, 118, 210, 0.1)'
  },
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    width: '3px',
    height: '100%',
    background: hasError ? 'linear-gradient(135deg, #f44336, #e57373)' : 'linear-gradient(135deg, #1976d2, #42a5f5)',
    borderRadius: '2px 0 0 2px',
    opacity: hasError ? 1 : 0,
    transition: 'opacity 0.3s ease'
  },
  '&:hover::before': {
    opacity: 1
  },
  [theme.breakpoints.down('md')]: {
    marginBottom: theme.spacing(0.8),
    padding: theme.spacing(1)
  }
}));

const ColorfulRadioOption = styled(Box)(({ theme, selected, color = '#1976d2' }) => ({
  margin: theme.spacing(0.2),
  padding: theme.spacing(1),
  borderRadius: '8px',
  border: selected ? '2px solid #1976d2' : '1px solid transparent',
  backgroundColor: selected ? color : `${color}40`,
  color: selected ? 'white' : '#333',
  transition: 'all 0.3s ease',
  cursor: 'pointer',
  minWidth: '80px',
  textAlign: 'center',
  fontWeight: selected ? 600 : 500,
  fontSize: '0.9rem',
  boxShadow: selected ? `0 4px 12px ${color}60, 0 0 0 1px #fff` : '0 2px 6px rgba(0,0,0,0.08)',
  transform: selected ? 'scale(1.02)' : 'scale(1)',
  '&:hover': {
    transform: 'scale(1.05)',
    backgroundColor: selected ? color : `${color}60`,
    boxShadow: `0 4px 15px ${color}50`
  },
  [theme.breakpoints.down('sm')]: {
    minWidth: '70px',
    padding: theme.spacing(0.8),
    fontSize: '0.85rem',
    margin: theme.spacing(0.1)
  }
}));

const EmojiRatingBox = styled(Box, {
  shouldForwardProp: (prop) => !['selected', 'bgColor'].includes(prop)
})(({ theme, selected, bgColor }) => ({
  width: '60px',
  height: '60px',
  margin: theme.spacing(0.2),
  borderRadius: '8px',
  backgroundColor: selected ? bgColor : `${bgColor}40`,
  border: selected ? '2px solid #1976d2' : '1px solid transparent',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  transition: 'all 0.3s ease',
  boxShadow: selected ? `0 4px 12px ${bgColor}60, 0 0 0 1px #fff` : '0 2px 6px rgba(0,0,0,0.08)',
  transform: selected ? 'scale(1.02)' : 'scale(1)',
  '&:hover': {
    transform: 'scale(1.05)',
    backgroundColor: selected ? bgColor : `${bgColor}60`,
    boxShadow: `0 4px 15px ${bgColor}50`
  },
  '& .emoji': {
    fontSize: '1.1rem',
    marginBottom: '1px',
    opacity: selected ? 1 : 0.7
  },
  '& .label': {
    fontSize: '0.7rem',
    fontWeight: 600,
    color: selected ? 'white' : '#333',
    textAlign: 'center',
    lineHeight: 1.1
  },
  [theme.breakpoints.down('sm')]: {
    width: '50px',
    height: '50px',
    margin: theme.spacing(0.1),
    '& .emoji': {
      fontSize: '0.95rem'
    },
    '& .label': {
      fontSize: '0.6rem'
    }
  }
}));

const NPSButton = styled(Box)(({ theme, selected, score }) => {
  let bgColor, textColor;
  
  if (score <= 6) {
    bgColor = '#f44336'; // Red for detractors
  } else if (score <= 8) {
    bgColor = '#ff9800'; // Orange for passives
  } else {
    bgColor = '#4caf50'; // Green for promoters
  }
  
  return {
    minWidth: '36px',
    height: '36px',
    margin: theme.spacing(0.2),
    borderRadius: '6px',
    border: selected ? '2px solid #1976d2' : '1px solid transparent',
    backgroundColor: selected ? bgColor : `${bgColor}40`,
    color: selected ? 'white' : bgColor,
    fontSize: '1rem',
    fontWeight: selected ? 600 : 500,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: selected ? `0 4px 12px ${bgColor}60, 0 0 0 1px #fff` : '0 2px 6px rgba(0,0,0,0.08)',
    transform: selected ? 'scale(1.05)' : 'scale(1)',
    '&:hover': {
      transform: 'scale(1.1)',
      backgroundColor: selected ? bgColor : `${bgColor}60`,
      boxShadow: `0 4px 15px ${bgColor}50`
    },
    [theme.breakpoints.down('sm')]: {
      minWidth: '30px',
      height: '30px',
      fontSize: '0.85rem',
      margin: theme.spacing(0.15)
    }
  };
});

const ProgressContainer = styled(Box)(({ theme }) => ({
  position: 'sticky',
  top: 0,
  zIndex: 1000,
  backgroundColor: 'rgba(255,255,255,0.95)',
  backdropFilter: 'blur(10px)',
  padding: theme.spacing(1, 2),
  borderRadius: '0 0 15px 15px',
  boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
}));

const LanguageToggle = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(2),
  backgroundColor: 'rgba(255,255,255,0.2)',
  padding: theme.spacing(1, 2),
  borderRadius: '25px',
  backdropFilter: 'blur(10px)',
  border: '1px solid rgba(255,255,255,0.3)'
}));

const BELSurvey2024 = () => {
  const { t, i18n } = useTranslation('translation', { i18n: belI18n });
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [formData, setFormData] = useState({});
  const [language, setLanguage] = useState('en');
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showMaxSelectionAlert, setShowMaxSelectionAlert] = useState(false);
  const [currentSection, setCurrentSection] = useState(0);
  const [progress, setProgress] = useState(0);
  const [validationErrors, setValidationErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState('personal'); // 'personal' -> 'survey'
  const [personalInfo, setPersonalInfo] = useState(EMPTY_PERSONAL_INFO);
  const [personalInfoErrors, setPersonalInfoErrors] = useState({});

  const totalSections = 13;
  const totalRequiredQuestions = 65; // Approximate count of required questions

  // Initialize form data
  useEffect(() => {
    setFormData({});
  }, []);

  // Calculate progress based on required fields only
  useEffect(() => {
    const getRequiredFields = () => {
      const required = [
        // All questions are mandatory except text inputs (excluding Section 13)
        'q1', 'q2', 'q3', 'q5', 'q9', 'q11', 'q12', 'q14', 'q18', 'q20', 'q21', 'q22', 'q42', 'q23', 'q28', 'q30', 'q31', 'q32', 'q34',
        // Multi-part questions
        'q4_psychological', 'q4_innovation', 'q4_diversity', 'q4_communication', 'q4_trust',
        'q10_vision', 'q10_transparency', 'q10_feedback', 'q10_change',
        'q15_market', 'q15_contributions', 'q15_colleagues',
        'q19_efficiency', 'q19_customers', 'q19_information',
        'q24_market', 'q24_technology', 'q24_innovation', 'q24_digital',
        'q27_strategy', 'q27_changes', 'q27_performance', 'q27_recognition',
        // Section 13 (Open-ended Insights) questions are mandatory
        'q37', 'q38',
        'q39_1', 'q39_2', 'q40_1', 'q40_2'
      ];
      
      // Add conditional required fields
      // Q2a is optional text input
      // Q3a is optional text input
      // Q11a is optional text input
      if (formData['q25'] === 'other') required.push('q25_other');
      if (formData['q34'] && (formData['q34'] === 'yes_definitely' || formData['q34'] === 'probably')) {
        // At least one Q35 option must be selected
        const q35Selected = Object.keys(formData).some(key => 
          (key.startsWith('q35_') && formData[key]) || (key === 'q35_other_selected' && formData[key])
        );
        if (!q35Selected) required.push('q35_required');
      }
      if (formData['q35_other_selected']) required.push('q35_other');
      if (formData['q36_other_selected']) required.push('q36_other');
      
      // Multi-select required (at least one selection)
      const multiSelectRequired = ['q6', 'q8', 'q26', 'q29'];
      multiSelectRequired.forEach(qKey => {
        // Multi-selects need at least one selection
        const hasSelection = Object.keys(formData).some(key => 
          key.startsWith(qKey + '_') && formData[key]
        );
        if (!hasSelection) required.push(qKey + '_required');
      });
      
      // Ranking questions (all required ranks must be filled)
      const rankingRequired = ['q13', 'q16'];
      rankingRequired.forEach(qKey => {
        const rankings = Object.keys(formData).filter(key =>
          key.startsWith(qKey + '_') && ['1', '2', '3'].includes(formData[key])
        ).length;
        if (rankings < RANKING_MAX[qKey]) required.push(qKey + '_required');
      });
      
      return required;
    };
    
    const requiredFields = getRequiredFields();
    const answeredRequired = requiredFields.filter(field => {
      if (field.endsWith('_required')) {
        const qKey = field.replace('_required', '');
        if (qKey === 'q13' || qKey === 'q16') {
          return Object.keys(formData).filter(key =>
            key.startsWith(qKey + '_') && ['1', '2', '3'].includes(formData[key])
          ).length >= RANKING_MAX[qKey];
        } else if (qKey === 'q35') {
          return Object.keys(formData).some(key => 
            (key.startsWith('q35_') && formData[key]) || (key === 'q35_other_selected' && formData[key])
          );
        } else {
          return Object.keys(formData).some(key => 
            key.startsWith(qKey + '_') && formData[key]
          );
        }
      }
      return formData[field] && formData[field] !== '' && formData[field] !== false;
    }).length;
    
    setProgress(Math.min(100, (answeredRequired / requiredFields.length) * 100));
  }, [formData]);

  // Handle language change
  const handleLanguageChange = (event) => {
    const newLang = event.target.value;
    setLanguage(newLang);
    belI18n.changeLanguage(newLang);
  };

  // Convert form data to English keys for backend
  const convertToEnglishData = (formData) => {
    // Create a mapping of Hindi display values to English keys
    const hindiToEnglishMapping = {
      // Q1 frequency options
      'हमेशा (हर दिन)': 'always',
      'बहुत अक्सर (सप्ताह में 4-5 दिन)': 'very_often',
      'अक्सर (सप्ताह में 2-3 दिन)': 'often',
      'कभी-कभी (सप्ताह में एक बार)': 'sometimes',
      'शायद ही कभी (महीने में कुछ बार)': 'rarely',
      'कभी नहीं': 'never',
      
      // Q3 satisfaction options
      'मुझे अपनी नौकरी पसंद है और काम पर आने का इंतजार करता हूं': 'love_job',
      'मैं आम तौर पर अपने काम से संतुष्ट हूं': 'generally_satisfied',
      'मेरी नौकरी मेरी बुनियादी जरूरतों को पूरा करती है': 'meets_needs',
      'मैं अपने काम से कुछ हद तक असंतुष्ट हूं': 'somewhat_dissatisfied',
      'मैं सक्रिय रूप से अन्य अवसरों की तलाश कर रहा हूं': 'looking_opportunities',
      
      // Agreement options
      'पूर्णतः सहमत': 'strongly_agree',
      'सहमत': 'agree',
      'तटस्थ': 'neutral',
      'असहमत': 'disagree',
      'पूर्णतः असहमत': 'strongly_disagree',
      
      // Add more mappings as needed for other options
    };
    
    const englishData = {};
    
    Object.keys(formData).forEach(key => {
      const value = formData[key];
      
      // If the value is a Hindi display text, convert to English key
      if (typeof value === 'string' && hindiToEnglishMapping[value]) {
        englishData[key] = hindiToEnglishMapping[value];
      } else {
        // Keep the original value (for English or non-translatable values)
        englishData[key] = value;
      }
    });
    
    return englishData;
  };

  // Handle form field changes
  const handleFieldChange = (fieldName, value) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));
    
    // Clear validation error when field is filled
    if (validationErrors[fieldName] && value !== '' && value !== false && value !== null && value !== undefined) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }
  };

  // ---- Personal Information step (shown before the survey questions) ----
  const handlePersonalInfoChange = (fieldName, value) => {
    setPersonalInfo(prev => ({ ...prev, [fieldName]: value }));
    if (personalInfoErrors[fieldName] && value !== '' && value !== null && value !== undefined) {
      setPersonalInfoErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }
  };

  const validatePersonalInfo = () => {
    const newErrors = {};
    const requiredMsg = t('personalInfo.validation.required');

    ['sbuName', 'age', 'serviceInBel', 'gender', 'departmentName', 'gradeWageGroup'].forEach(field => {
      const value = personalInfo[field];
      if (!value || value.toString().trim() === '') {
        newErrors[field] = requiredMsg;
      }
    });

    // Format checks (defense-in-depth; the inputs already restrict typing)
    if (!newErrors.departmentName &&
        (!DEPARTMENT_ALLOWED.test(personalInfo.departmentName) ||
         personalInfo.departmentName.length > DEPARTMENT_MAX_LENGTH)) {
      newErrors.departmentName = t('personalInfo.validation.departmentName');
    }
    if (!newErrors.gradeWageGroup &&
        (!GRADE_ALLOWED.test(personalInfo.gradeWageGroup) ||
         personalInfo.gradeWageGroup.length > GRADE_MAX_LENGTH)) {
      newErrors.gradeWageGroup = t('personalInfo.validation.gradeWageGroup');
    }

    setPersonalInfoErrors(newErrors);
    return { isValid: Object.keys(newErrors).length === 0 };
  };

  const handleContinue = () => {
    const { isValid } = validatePersonalInfo();
    if (!isValid) {
      setErrorMessage(t('personalInfo.validation.incomplete'));
      setShowError(true);
      return;
    }
    setShowError(false);
    setStep('survey');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handle checkbox changes
  const handleCheckboxChange = (fieldName, checked) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: checked
    }));
    
    // Clear validation error when checkbox group has selection
    if (checked) {
      const questionKey = fieldName.split('_')[0];
      if (validationErrors[questionKey]) {
        setValidationErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[questionKey];
          return newErrors;
        });
      }
    }
  };

  // Handle checkbox changes with limit
  const handleCheckboxChangeWithLimit = (fieldName, checked, limit = 3) => {
    if (checked) {
      const selectedCount = Object.keys(formData).filter(key => 
        key.startsWith(fieldName.split('_')[0] + '_') && formData[key]
      ).length;
      if (selectedCount >= limit) {
        setShowMaxSelectionAlert(true);
        setErrorMessage(`Maximum ${limit} options are allowed. Please deselect an option first.`);
        return;
      }
    }
    handleCheckboxChange(fieldName, checked);
  };

  // Handle single-select "chip" questions (Q26, Q29). Stored as `<questionKey>_<option>`
  // booleans like the multi-selects, but only one option may be true at a time.
  const handleSingleSelectChip = (questionKey, optionKey) => {
    const fieldName = `${questionKey}_${optionKey}`;
    const isCurrentlySelected = !!formData[fieldName];
    setFormData(prev => {
      const next = { ...prev };
      // Clear any previous selection within this question group
      Object.keys(next).forEach(key => {
        if (key.startsWith(`${questionKey}_`)) delete next[key];
      });
      // Toggle: pick the clicked option, or clear it if it was already selected
      if (!isCurrentlySelected) next[fieldName] = true;
      return next;
    });

    // Clear the group's validation error once an option is chosen
    if (!isCurrentlySelected && validationErrors[questionKey]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[questionKey];
        return newErrors;
      });
    }
  };

  // Handle Q8 checkbox changes with mutual exclusivity
  const handleQ8CheckboxChange = (fieldName, checked) => {
    if (fieldName === 'q8_none') {
      if (checked) {
        // If 'none' is selected, unselect all other options
        const updates = { [fieldName]: true };
        ['q8_clear_direction', 'q8_recognizes', 'q8_supports_development', 'q8_gives_feedback', 
         'q8_trusts_decisions', 'q8_available', 'q8_demonstrates_values'].forEach(key => {
          updates[key] = false;
        });
        setFormData(prev => ({ ...prev, ...updates }));
      } else {
        handleCheckboxChange(fieldName, checked);
      }
    } else {
      if (checked && formData['q8_none']) {
        // If any other option is selected and 'none' is selected, unselect 'none'
        setFormData(prev => ({ ...prev, [fieldName]: true, 'q8_none': false }));
      } else {
        handleCheckboxChange(fieldName, checked);
      }
    }
  };

  // Handle ranking changes for any question
  const handleRankingChange = (questionKey, itemKey, newRank) => {
    const fieldName = `${questionKey}_${itemKey}`;
    const currentRank = formData[fieldName];
    
    if (newRank === currentRank) return; // No change needed
    
    // Find if another item has the target rank
    const conflictingField = Object.keys(formData).find(key => 
      key.startsWith(`${questionKey}_`) && formData[key] === newRank
    );
    
    const updates = { [fieldName]: newRank };
    
    // If there's a conflict, swap the ranks
    if (conflictingField && currentRank) {
      updates[conflictingField] = currentRank;
    } else if (conflictingField) {
      updates[conflictingField] = '';
    }
    
    setFormData(prev => ({ ...prev, ...updates }));
    
    // Clear validation error once all required ranks are filled
    setTimeout(() => {
      const updatedFormData = { ...formData, ...updates };
      const rankings = Object.keys(updatedFormData).filter(key =>
        key.startsWith(`${questionKey}_`) && ['1', '2', '3'].includes(updatedFormData[key])
      ).length;

      if (rankings >= (RANKING_MAX[questionKey] || 3) && validationErrors[questionKey]) {
        setValidationErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[questionKey];
          return newErrors;
        });
      }
    }, 100);
  };

  // Function to check if a question is required
  const isQuestionRequired = (questionKey) => {
    // All questions are required except text inputs (excluding Section 13)
    const alwaysRequired = [
      'q1', 'q2', 'q3', 'q5', 'q9', 'q11', 'q12', 'q14', 'q18', 'q20', 'q21', 'q22', 'q42', 'q23', 'q28', 'q30', 'q31', 'q32', 'q34',
      'q37', 'q38', 'q39', 'q40'
    ];
    
    // Multi-part questions that are required
    const multiPartRequired = [
      'q4_psychological', 'q4_innovation', 'q4_diversity', 'q4_communication', 'q4_trust',
      'q10_vision', 'q10_transparency', 'q10_feedback', 'q10_change',
      'q15_market', 'q15_contributions', 'q15_colleagues',
      'q19_efficiency', 'q19_customers', 'q19_information',
      'q24_market', 'q24_technology', 'q24_innovation', 'q24_digital',
      'q27_strategy', 'q27_changes', 'q27_performance', 'q27_recognition',
      'q39_1', 'q39_2',
      'q40_1', 'q40_2'
    ];
    
    // Conditionally required questions
    const conditionallyRequired = {
      // 'q2a': () => formData['q2'] && parseInt(formData['q2']) <= 8, // Optional text input
      // 'q3a': () => formData['q3'] && (formData['q3'] === 'somewhat_dissatisfied' || formData['q3'] === 'looking_opportunities'), // Optional text input
      // 'q11a': () => formData['q11'] && (formData['q11'] === 'unclear' || formData['q11'] === 'no_path'), // Optional text input
      'q35': () => formData['q34'] && (formData['q34'] === 'yes_definitely' || formData['q34'] === 'probably'),
      'q25_other': () => formData['q25'] === 'other',
      'q35_other': () => formData['q35_other_selected'],
      'q36_other': () => formData['q36_other_selected']
    };
    
    if (alwaysRequired.includes(questionKey) || multiPartRequired.includes(questionKey)) {
      return true;
    }
    
    if (conditionallyRequired[questionKey]) {
      return conditionallyRequired[questionKey]();
    }
    
    return false;
  };

  // Helper function to render question title with validation
  const renderQuestionTitle = (questionKey, title) => (
    <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
      {title}
      {isQuestionRequired(questionKey) && <span style={{ color: 'red' }}> *</span>}
    </Typography>
  );

  // Validation function to check if all required fields are filled
  const validateForm = () => {
    const errors = [];
    const missingFields = [];
    const newValidationErrors = {};

    // Helper function to check if a value is empty
    const isEmpty = (value) => {
      if (value === null || value === undefined || value === '') return true;
      if (typeof value === 'boolean') return false;
      if (Array.isArray(value)) return value.length === 0;
      return false;
    };

    // Helper function to add validation error
    const addError = (field, message = 'This field is required') => {
      missingFields.push(field);
      newValidationErrors[field] = message;
    };

    // All questions are mandatory except text inputs (excluding Section 13)
    
    // Single-select questions (mandatory)
    const singleSelectQuestions = ['q1', 'q2', 'q3', 'q5', 'q9', 'q11', 'q12', 'q14', 'q18', 'q20', 'q21', 'q22', 'q42', 'q23', 'q28', 'q30', 'q31', 'q32', 'q34'];
    singleSelectQuestions.forEach(field => {
      if (isEmpty(formData[field])) addError(field);
    });

    // Multi-part questions (mandatory)
    const multiPartQuestions = [
      ['q4_psychological', 'q4_innovation', 'q4_diversity', 'q4_communication', 'q4_trust'],
      ['q10_vision', 'q10_transparency', 'q10_feedback', 'q10_change'],
      ['q15_market', 'q15_contributions', 'q15_colleagues'],
      ['q19_efficiency', 'q19_customers', 'q19_information'],
      ['q24_market', 'q24_technology', 'q24_innovation', 'q24_digital'],
      ['q27_strategy', 'q27_changes', 'q27_performance', 'q27_recognition']
    ];
    multiPartQuestions.forEach(group => {
      group.forEach(field => {
        if (isEmpty(formData[field])) addError(field);
      });
    });

    // Multi-select questions (mandatory - at least one selection)
    const multiSelectRequired = ['q6', 'q8', 'q26', 'q29'];
    multiSelectRequired.forEach(qKey => {
      const hasSelection = Object.keys(formData).some(key => 
        key.startsWith(qKey + '_') && formData[key]
      );
      if (!hasSelection) addError(qKey + '_required', 'Please select at least one option');
    });
    
    // Ranking questions (mandatory - all required ranks must be filled)
    const rankingRequired = ['q13', 'q16'];
    rankingRequired.forEach(qKey => {
      const need = RANKING_MAX[qKey];
      const rankings = Object.keys(formData).filter(key =>
        key.startsWith(qKey + '_') && ['1', '2', '3'].includes(formData[key])
      ).length;
      if (rankings < need) addError(qKey + '_required', `Please complete all ${need} rankings`);
    });

    // Handle conditional validations for text inputs (optional except Section 13)
    // Q2a - Conditional: Show only if NPS score is 8 or below (optional - no validation)
    // Q3a - Conditional: Show only if dissatisfied or looking (optional - no validation)
    // Q11a - Conditional: Show only if unclear or no path (optional)
    // Q17 - New benefit suggestion (optional)
    // Q22a - Wellbeing support (optional)
    // Q25_other - Innovation barrier other (optional)
    // Q30a - Performance review improvement (optional)
    // Q33a - Productivity acceleration (optional)
    // Q35_other, Q36_other - Stay/leave reasons other (optional)

    // Q25 - If 'other' is selected, check if text is provided (optional)
    if (formData['q25'] === 'other' && isEmpty(formData['q25_other'])) {
      addError('q25_other', 'Please specify the other barrier');
    }

    // Q35 - Stay reasons (conditional: only if answered 'yes' or 'probably' to Q34)
    if (formData['q34'] && (formData['q34'] === 'yes_definitely' || formData['q34'] === 'probably')) {
      const q35Selected = Object.keys(formData).filter(key => 
        (key.startsWith('q35_') && formData[key]) || (key === 'q35_other_selected' && formData[key])
      ).length;
      if (q35Selected === 0) addError('q35', 'Please select at least one reason for staying');
      
      // If 'other' is selected, check if text is provided (optional)
      if (formData['q35_other_selected'] && isEmpty(formData['q35_other'])) {
        addError('q35_other', 'Please specify the other reason');
      }
    }

    // Q36 - Leave factors (optional for all, but if any selected and 'other' chosen, text required)
    if (formData['q36_other_selected'] && isEmpty(formData['q36_other'])) {
      addError('q36_other', 'Please specify the other factor');
    }

    // Section 13 - Open-ended Insights (mandatory except Q41)
    if (isEmpty(formData['q37'])) addError('q37');
    if (isEmpty(formData['q38'])) addError('q38');
    ['q39_1', 'q39_2'].forEach(field => {
      if (isEmpty(formData[field])) addError(field, 'Please provide all 2 improvements');
    });
    ['q40_1', 'q40_2'].forEach(field => {
      if (isEmpty(formData[field])) addError(field, 'Please provide all 2 things working well');
    });
    // Q41 is optional text input

    // Set validation errors
    setValidationErrors(newValidationErrors);

    if (missingFields.length > 0) {
      errors.push(`Please complete all required fields marked with * (${missingFields.length} fields missing)`);
      
      // Scroll to first missing field
      setTimeout(() => {
        const firstMissingField = missingFields[0];
        const element = document.querySelector(`[data-question="${firstMissingField}"]`);
        if (element) {
          element.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center',
            inline: 'nearest'
          });
        }
      }, 100);
    }

    return {
      isValid: errors.length === 0,
      errors: errors,
      missingFields: missingFields
    };
  };

  // Function to convert form data to human-readable format
  const convertToReadableFormat = (formData) => {
    const readableData = {};
    
    
    // Question mappings with full text and response options
    const questionMappings = {
      'q1': { question: 'How often do you feel enthusiastic and motivated about your work at BEL?', options: { 'always': 'Always', 'very_often': 'Very Often', 'often': 'Often', 'sometimes': 'Sometimes', 'rarely': 'Rarely', 'never': 'Never' } },
      'q2': { question: 'On a scale of 1-10, how likely are you to recommend this BEL as a great place to work?', options: null },
      'q2a': { question: 'If you gave a score of 8 or below, what would move us closer to a 10?', options: null },
      'q3': { question: 'Which statement best describes your current job satisfaction?', options: { 'love_job': 'I love my job and look forward to coming to work', 'generally_satisfied': 'I\'m generally satisfied with my work', 'meets_needs': 'My job meets my basic needs', 'somewhat_dissatisfied': 'I\'m somewhat dissatisfied with my work', 'looking_opportunities': 'I\'m actively looking for other opportunities' } },
      'q3a': { question: 'If you selected "somewhat dissatisfied" or "actively looking," what are the main reasons?', options: null },
      'q4_psychological': { question: 'Rate workplace culture - Psychological safety (1-5)', options: { '1': '1 - Poor', '2': '2 - Below Average', '3': '3 - Average', '4': '4 - Good', '5': '5 - Excellent' } },
      'q4_innovation': { question: 'Rate workplace culture - Innovation encouragement (1-5)', options: { '1': '1 - Poor', '2': '2 - Below Average', '3': '3 - Average', '4': '4 - Good', '5': '5 - Excellent' } },
      'q4_diversity': { question: 'Rate workplace culture - Diversity & inclusion (1-5)', options: { '1': '1 - Poor', '2': '2 - Below Average', '3': '3 - Average', '4': '4 - Good', '5': '5 - Excellent' } },
      'q4_communication': { question: 'Rate workplace culture - Open communication (1-5)', options: { '1': '1 - Poor', '2': '2 - Below Average', '3': '3 - Average', '4': '4 - Good', '5': '5 - Excellent' } },
      'q4_trust': { question: 'Rate workplace culture - Trust among colleagues (1-5)', options: { '1': '1 - Poor', '2': '2 - Below Average', '3': '3 - Average', '4': '4 - Good', '5': '5 - Excellent' } },
      'q5': { question: 'Which best describes your sense of belonging at work?', options: { 'truly_belong': 'I feel like I truly belong and can be my authentic self', 'generally_included': 'I generally feel included but sometimes feel like an outsider', 'dont_fit': 'I often feel like I don\'t quite fit in', 'excluded': 'I feel excluded or isolated' } },
      'q9': { question: 'I have a clear understanding of my role and how it contributes to the company\'s goals and growth of the Unit', options: { 'strongly_agree': 'Strongly Agree', 'agree': 'Agree', 'neutral': 'Neutral', 'disagree': 'Disagree', 'strongly_disagree': 'Strongly Disagree' } },
      'q10_vision': { question: 'Rate senior leadership - Vision & strategy communication', options: { 'a_plus': 'A+', 'a': 'A', 'b': 'B', 'c': 'C', 'd': 'D', 'f': 'F' } },
      'q10_transparency': { question: 'Rate senior leadership - Transparency in decision-making', options: { 'a_plus': 'A+', 'a': 'A', 'b': 'B', 'c': 'C', 'd': 'D', 'f': 'F' } },
      'q10_feedback': { question: 'Rate senior leadership - Acting on employee feedback', options: { 'a_plus': 'A+', 'a': 'A', 'b': 'B', 'c': 'C', 'd': 'D', 'f': 'F' } },
      'q10_change': { question: 'Rate senior leadership - Leading through change', options: { 'a_plus': 'A+', 'a': 'A', 'b': 'B', 'c': 'C', 'd': 'D', 'f': 'F' } },
      'q11': { question: 'Do you have a clear understanding of your career path at this BEL?', options: { 'very_clear': 'Yes, very clear', 'somewhat_clear': 'Somewhat clear', 'unclear': 'Unclear', 'no_path': 'No path exists' } },
      'q11a': { question: 'If unclear/no path, what support do you need?', options: null },
      'q12': { question: 'In the past year, how many hours of professional development have you received?', options: { '0': '0 hours', '1_10': '1-10 hours', '11_25': '11-25 hours', '26_50': '26-50 hours', '50_plus': '50+ hours' } },
      'q14': { question: 'Rate the quality of development opportunities available', options: { 'world_class': 'World-class', 'above_average': 'Above average', 'average': 'Average', 'below_average': 'Below average', 'poor': 'Poor' } },
      'q15_market': { question: 'How fairly compensated - Similar roles in the market', options: { 'much_above': 'Much above', 'above': 'Above', 'fair': 'Fair', 'below': 'Below', 'much_below': 'Much below' } },
      'q15_contributions': { question: 'How fairly compensated - Your contributions to the BEL', options: { 'much_above': 'Much above', 'above': 'Above', 'fair': 'Fair', 'below': 'Below', 'much_below': 'Much below' } },
      'q15_colleagues': { question: 'How fairly compensated - Colleagues in similar roles', options: { 'much_above': 'Much above', 'above': 'Above', 'fair': 'Fair', 'below': 'Below', 'much_below': 'Much below' } },
      'q17': { question: 'Is there one new benefit you would like us to consider adding?', options: null },
      'q18': { question: 'The technology tools I use for work are', options: { 'cutting_edge': 'Cutting-edge', 'modern': 'Modern & meets needs', 'adequate': 'Adequate but could be better', 'outdated': 'Outdated & slow', 'hindering': 'Seriously hindering' } },
      'q19_efficiency': { question: 'How well does technology enable you to - Work efficiently', options: { 'excellent': 'Excellent', 'good': 'Good', 'fair': 'Fair', 'poor': 'Poor' } },
      'q19_customers': { question: 'How well does technology enable you to - Serve customers effectively', options: { 'excellent': 'Excellent', 'good': 'Good', 'fair': 'Fair', 'poor': 'Poor' } },
      'q19_information': { question: 'How well does technology enable you to - Access information quickly', options: { 'excellent': 'Excellent', 'good': 'Good', 'fair': 'Fair', 'poor': 'Poor' } },
      'q20': { question: 'My current work-life balance is', options: { 'excellent': 'Excellent', 'good': 'Good', 'fair': 'Fair', 'poor': 'Poor', 'terrible': 'Terrible' } },
      'q21': { question: 'I am able to disconnect from work-related duties outside of my working hours', options: { 'strongly_agree': 'Strongly Agree', 'agree': 'Agree', 'neutral': 'Neutral', 'disagree': 'Disagree', 'strongly_disagree': 'Strongly Disagree' } },
      'q22': { question: 'How effectively does the BEL support your mental health and wellbeing?', options: { 'outstanding': 'Outstanding support', 'good': 'Good support', 'some': 'Some support', 'limited': 'Limited support', 'no_support': 'No support' } },
      'q22a': { question: 'What additional wellbeing support would be valuable?', options: null },
      'q23': { question: 'How encouraged do you feel to share new ideas and suggestions?', options: { 'highly_encouraged': 'Highly encouraged', 'somewhat_encouraged': 'Somewhat encouraged', 'discouraged': 'Discouraged', 'strongly_discouraged': 'Strongly discouraged' } },
      'q24_market': { question: 'Rate organization capability - Adapting to market changes', options: { 'leading': 'Leading', 'following': 'Following', 'lagging': 'Lagging', 'struggling': 'Struggling' } },
      'q24_technology': { question: 'Rate organization capability - Technology adoption', options: { 'leading': 'Leading', 'following': 'Following', 'lagging': 'Lagging', 'struggling': 'Struggling' } },
      'q24_innovation': { question: 'Rate organization capability - Innovation culture', options: { 'leading': 'Leading', 'following': 'Following', 'lagging': 'Lagging', 'struggling': 'Struggling' } },
      'q24_digital': { question: 'Rate organization capability - Digital transformation', options: { 'leading': 'Leading', 'following': 'Following', 'lagging': 'Lagging', 'struggling': 'Struggling' } },
      'q25': { question: 'What\'s the biggest barrier to innovation in your area?', options: { 'time_resources': 'Lack of time/resources', 'risk_averse': 'Risk-averse culture', 'unclear_processes': 'Unclear processes', 'insufficient_funding': 'Insufficient funding', 'lack_support': 'Lack of leadership support', 'skills_gaps': 'Skills/capability gaps', 'other': 'Other' } },
      'q25_other': { question: 'Innovation barrier - Other (specify)', options: null },
      'q27_strategy': { question: 'Rate communication effectiveness - Company strategy and goals', options: { 'excellent': 'Excellent', 'good': 'Good', 'fair': 'Fair', 'poor': 'Poor' } },
      'q27_changes': { question: 'Rate communication effectiveness - Changes affecting your role', options: { 'excellent': 'Excellent', 'good': 'Good', 'fair': 'Fair', 'poor': 'Poor' } },
      'q27_performance': { question: 'Rate communication effectiveness - Performance expectations', options: { 'excellent': 'Excellent', 'good': 'Good', 'fair': 'Fair', 'poor': 'Poor' } },
      'q27_recognition': { question: 'Rate communication effectiveness - Recognition and achievements', options: { 'excellent': 'Excellent', 'good': 'Good', 'fair': 'Fair', 'poor': 'Poor' } },
      'q28': { question: 'How often do you receive recognition for your contributions?', options: { 'daily': 'Daily', 'weekly': 'Weekly', 'monthly': 'Monthly', 'quarterly': 'Quarterly', 'annually': 'Annually', 'rarely': 'Rarely/Never' } },
      'q30': { question: 'Do you feel your performance is evaluated fairly and accurately?', options: { 'completely_fair': 'Yes, completely fair', 'mostly_fair': 'Mostly fair', 'somewhat_fair': 'Somewhat fair', 'unfair': 'Unfair', 'very_unfair': 'Very unfair' } },
      'q30a': { question: 'How could our performance review process be improved?', options: null },
      'q31': { question: 'How would you rate your onboarding experience overall?', options: { 'exceptional': 'Exceptional', 'good': 'Good', 'average': 'Average', 'poor': 'Poor', 'terrible': 'Terrible' } },
      'q32': { question: 'Did you receive the necessary resources and training to feel successful when you first started working?', options: { 'had_everything': 'Yes, I had everything I needed', 'had_most': 'I had most of what I needed', 'missing_few': 'I was missing a few key things', 'did_not_have': 'I did not have the resources and training I needed' } },
      'q34': { question: 'Do you see yourself working at BEL FIVE years from now?', options: { 'yes_definitely': 'Yes, definitely', 'probably': 'Probably', 'unsure': 'Unsure', 'probably_not': 'Probably not', 'definitely_not': 'Definitely not' } },
      'q35_other': { question: 'Reasons for staying - Other (specify)', options: null },
      'q36_other': { question: 'Factors influencing leaving decision - Other (specify)', options: null },
      'q37': { question: 'If you were CMD for a day, What is the first thing you would change in BEL?', options: null },
      'q38': { question: 'What would make you more effective in your role?', options: null },
      'q39_1': { question: 'List 2 things good in BEL-GAD unit - Item 1', options: null },
      'q39_2': { question: 'List 2 things good in BEL-GAD unit - Item 2', options: null },
      'q40_1': { question: 'List 2 things to change in BEL-GAD unit - Item 1', options: null },
      'q40_2': { question: 'List 2 things to change in BEL-GAD unit - Item 2', options: null },
      'q41': { question: 'Any other feedback or suggestions?', options: null },
      'q42': { question: 'Do you got enough opportunities to participate in extra curricular activities?', options: { 'yes': 'Yes', 'yes_work_pressure': 'Yes but due to work pressure I could not participate', 'yes_manager_discourages': 'Yes but reporting manager do not encourage to participate', 'no_rare_activities': 'No, very rare activities are organized' } }
    };

    // Multi-select question mappings with section organization
    const multiSelectMappings = {
      'q6': {
        question: 'Culture Descriptors (Select up to 3)',
        section: 'WORK ENVIRONMENT & CULTURE',
        options: {
          'collaborative': 'Collaborative',
          'competitive': 'Competitive',
          'innovative': 'Innovative',
          'hierarchical': 'Hierarchical',
          'flexible': 'Flexible',
          'fast_paced': 'Fast-paced',
          'supportive': 'Supportive',
          'inclusive': 'Inclusive',
          'transparent': 'Transparent',
          'bureaucratic': 'Bureaucratic'
        }
      },
      'q8': {
        question: 'Manager Behaviors (Select all that apply)',
        section: 'LEADERSHIP & MANAGEMENT EXCELLENCE',
        options: {
          'clear_direction': 'Provides clear direction and priorities',
          'recognizes': 'Recognizes and appreciates my contributions',
          'supports_development': 'Supports my professional development',
          'gives_feedback': 'Gives constructive feedback regularly',
          'trusts_decisions': 'Trusts me to make decisions in my role',
          'available': 'Is available when I need guidance',
          'demonstrates_values': 'Demonstrates company values consistently',
          'none': 'None of the above'
        }
      },
      // Q16 is now handled as a ranking question, not multi-select
      'q26': {
        question: 'Most Effective Communication Channel of BEL-GAD',
        section: 'COMMUNICATION & INFORMATION FLOW',
        options: {
          'email': 'Email/Email newsletters',
          'meetings': 'Team meetings',
          'notice_board': 'Notice board',
          'digital_platforms': 'Digital workplace platforms',
          'video_messages': 'Video messages from leadership',
          'presentations': 'Department presentations',
          'one_on_one': 'One-on-one with manager',
          'anything_else': 'Any other'
        }
      },
      'q29': {
        question: 'Preferred Recognition Form',
        section: 'RECOGNITION & PERFORMANCE',
        options: {
          'public_praise': 'Public praise from manager/leadership',
          'thank_you_notes': 'Written thank you notes',
          'monetary': 'Monetary rewards/bonuses',
          'development': 'Professional development opportunities',
          'responsibilities': 'Increased responsibilities/stretch assignments',
          'peer_awards': 'Peer nominations/awards',
          'advancement': 'Career advancement'
        }
      },
      'q35': {
        question: 'Reasons for Staying (Select all that apply)',
        section: 'FUTURE OUTLOOK',
        options: {
          'meaningful_work': 'My work is meaningful and enjoyable',
          'great_relationships': 'I have a great relationship with my manager and team',
          'satisfied_compensation': 'I am satisfied with my compensation and benefits',
          'growth_opportunities': 'I see strong opportunities for career growth',
          'believe_mission': "I believe in the company's mission and leadership",
          'culture_fit': 'The company culture is a great fit for me'
        }
      },
      'q36': {
        question: 'Factors That Might Lead to Leaving (Select all that apply)',
        section: 'FUTURE OUTLOOK',
        options: {
          'compensation_concerns': 'Concerns about compensation or benefits',
          'lack_growth': 'Lack of career growth opportunities',
          'management_issues': 'Dissatisfaction with management or leadership',
          'work_not_engaging': 'The work is not engaging or meaningful',
          'culture_issues': 'Issues with company culture or work environment',
          'better_opportunities': 'Better opportunities elsewhere',
          'work_life_balance': 'Poor work-life balance'
        }
      }
    };

    // Process each form field
    Object.keys(formData).forEach(key => {
      const value = formData[key];
      
      // Skip empty values but allow false for boolean fields that should be captured
      if (value === '' || value === null || value === undefined) return;
      // For boolean false values, only skip if it's a checkbox that wasn't selected
      if (value === false && key.includes('_') && !key.includes('other')) return;


      // Handle single-select questions first
      if (questionMappings[key]) {
        const mapping = questionMappings[key];
        const questionText = mapping.question;
        let responseText = value;
        
        if (mapping.options && mapping.options[value]) {
          responseText = mapping.options[value];
        }
        
        readableData[questionText] = responseText;
      }
      // Handle multi-select questions (exclude Q13 ranking and 'other' fields)
      else if (key.includes('_') && !key.includes('other') && !key.startsWith('q13_') && value === true) {
        const [questionKey] = key.split('_', 1);
        const fullKey = key.replace(`${questionKey}_`, '');
        
        if (multiSelectMappings[questionKey]) {
          const questionText = multiSelectMappings[questionKey].question;
          const optionText = multiSelectMappings[questionKey].options[fullKey] || fullKey;
          
          if (!readableData[questionText]) {
            readableData[questionText] = [];
          }
          readableData[questionText].push(optionText);
        }
      }
      // Handle ranking questions (Q13 and Q16)
      else if ((key.startsWith('q13_') || key.startsWith('q16_')) && value !== '' && ['1', '2', '3'].includes(value)) {
        const rankingItems = {
          // Q13 items
          'q13_technical': 'Technical/functional skills',
          'q13_leadership': 'Leadership and management training',
          'q13_digital': 'Digital/technology skills',
          'q13_communication': 'Communication and presentation skills',
          'q13_project_management': 'Project management',
          'q13_cross_functional': 'Cross-functional experience',
          'q13_mentoring': 'Mentoring/coaching',
          'q13_certifications': 'Industry certifications',
          // Q16 items
          'q16_medical': 'Medical policy',
          'q16_pension': 'Pension scheme',
          'q16_retired_health': 'Retired employee health scheme',
          'q16_besafe': 'BESAFE Scheme',
          'q16_leaves': 'Number of leaves granted',
          'q16_prp_ppi': 'PRP/PPI',
          'q16_creche': 'Creche facility',
          'q16_quarters': 'Company quarters',
          'q16_iut': 'IUT Benefits',
          'q16_club': 'Club facility',
          'q16_canteen': 'Canteen'
        };
        
        const itemText = rankingItems[key] || key;
        let questionText;
        
        if (key.startsWith('q13_')) {
          questionText = `Rank your top 2 development priorities - Priority ${value}`;
        } else if (key.startsWith('q16_')) {
          questionText = `Rank your top 3 benefits - Priority ${value}`;
        }
        
        readableData[questionText] = itemText;
      }
    });

    // Convert multi-select arrays to comma-separated strings
    Object.keys(readableData).forEach(key => {
      if (Array.isArray(readableData[key])) {
        readableData[key] = readableData[key].join(', ');
      }
    });

    // Verify all expected questions are captured
    const expectedQuestionCount = 41; // Base questions
    const actualQuestionCount = Object.keys(readableData).length;
    
    
    // Check for missing questions
    const expectedSingleSelectQuestions = Object.keys(questionMappings);
    const processedSingleSelect = expectedSingleSelectQuestions.filter(q => 
      Object.keys(readableData).some(readable => questionMappings[q] && questionMappings[q].question === readable)
    );
    
    
    if (processedSingleSelect.length < expectedSingleSelectQuestions.length) {
      const missing = expectedSingleSelectQuestions.filter(q => !processedSingleSelect.includes(q));
      console.warn('Missing single-select questions:', missing);
    }
    

    return readableData;
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

      setIsSubmitting(true);

      // Convert to English data first, then clean up
      const englishFormData = convertToEnglishData(formData);
      
      // Clean up form data - remove empty values and convert to proper format
      const cleanedResponses = {};
      Object.keys(englishFormData).forEach(key => {
        const value = englishFormData[key];
        if (value !== '' && value !== null && value !== undefined) {
          // Convert boolean values to strings for backend compatibility
          if (typeof value === 'boolean') {
            cleanedResponses[key] = value ? 'true' : 'false';
          } else {
            cleanedResponses[key] = value.toString();
          }
        }
      });

      // Convert to readable format (use original formData for display purposes)
      const readableResponses = convertToReadableFormat(formData);

      // Add the personal-information answers to the readable export so they show
      // up as columns in the admin export automatically. Keys deliberately avoid
      // the substring "other" (convertToReadableFormat drops such keys).
      readableResponses['SBU Name'] = personalInfo.sbuName;
      readableResponses['Age'] = personalInfo.age;
      readableResponses['Service in BEL'] = personalInfo.serviceInBel;
      readableResponses['Gender'] = personalInfo.gender;
      readableResponses['Department Name'] = personalInfo.departmentName;
      readableResponses['Grade/Wage Group'] = personalInfo.gradeWageGroup;

      const surveyData = {
        language,
        personalInfo,
        department: personalInfo.departmentName, // reuses the existing `department` column
        responses: cleanedResponses,
        readableResponses: readableResponses,
        timestamp: new Date().toISOString(),
        version: '2024.1.0'
      };

      const response = await apiService.post('/bel/survey', surveyData);
      

      // Check if response is successful
      if (response && (response.success === true || response.statusCode === 200)) {
        setShowSuccess(true);
        setShowError(false); // Clear any existing errors
        setTimeout(() => {
          setFormData({});
          setProgress(0);
          setPersonalInfo(EMPTY_PERSONAL_INFO);
          setPersonalInfoErrors({});
          setStep('personal');
        }, 3000);
      } else {
        throw new Error(response?.message || 'Failed to submit survey');
      }
    } catch (error) {
      console.error('Survey submission error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to submit survey. Please try again.';
      setErrorMessage(errorMessage);
      setShowError(true);
      setShowSuccess(false); // Ensure success message is hidden
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle form reset
  const handleReset = () => {
    setFormData({});
    setProgress(0);
    setCurrentSection(0);
    setValidationErrors({});
    setShowError(false);
    setShowSuccess(false);
  };

  // Render NPS scale
  const renderNPSScale = (questionKey) => (
    <Box sx={{ 
      display: 'flex', 
      flexWrap: 'wrap',
      gap: 1, 
      justifyContent: 'center', 
      mt: 2 
    }}>
      {[ 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
        <NPSButton
          key={score}
          selected={formData[questionKey] === score.toString()}
          score={score}
          onClick={() => handleFieldChange(questionKey, score.toString())}
        >
          {score === 10 ? '10' : score}
        </NPSButton>
      ))}
    </Box>
  );

  // Render Q1 work motivation frequency options
  const renderWorkMotivationFrequency = (questionKey) => {
    const options = [
      { key: 'always', label: t('survey.options.frequency.always'), color: '#2e7d32' },
      { key: 'very_often', label: t('survey.options.frequency.very_often'), color: '#4caf50' },
      { key: 'often', label: t('survey.options.frequency.often'), color: '#8bc34a' },
      { key: 'sometimes', label: t('survey.options.frequency.sometimes'), color: '#ff9800' },
      { key: 'rarely', label: t('survey.options.frequency.rarely'), color: '#ff5722' },
      { key: 'never', label: t('survey.options.frequency.never'), color: '#f44336' }
    ];
    
    return (
      <Box sx={{ 
        display: 'flex', 
        flexDirection: isMobile ? 'column' : 'row',
        flexWrap: isMobile ? 'nowrap' : 'wrap',
        gap: 1, 
        justifyContent: 'center', 
        mt: 2 
      }}>
        {options.map((option) => (
          <Box
            key={option.key}
            onClick={() => handleFieldChange(questionKey, option.key)}
            sx={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'flex-start',
              padding: '12px 16px',
              margin: '4px',
              borderRadius: '12px',
              backgroundColor: formData[questionKey] === option.key ? option.color : `${option.color}40`,
              color: formData[questionKey] === option.key ? 'white' : option.color,
              border: formData[questionKey] === option.key ? '3px solid #1976d2' : '2px solid transparent',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              minWidth: isMobile ? '100%' : '180px',
              boxShadow: formData[questionKey] === option.key 
                ? `0 6px 20px ${option.color}80, 0 0 0 2px #fff` 
                : '0 3px 10px rgba(0,0,0,0.1)',
              transform: formData[questionKey] === option.key ? 'scale(1.02)' : 'scale(1)',
              '&:hover': {
                transform: 'scale(1.05)',
                backgroundColor: formData[questionKey] === option.key ? option.color : `${option.color}60`,
                boxShadow: `0 6px 20px ${option.color}60`
              }
            }}
          >
            <Box sx={{ fontSize: '1rem', fontWeight: 600, color: formData[questionKey] === option.key ? 'white' : '#333', textAlign: 'left', lineHeight: 1.2 }}>
              {option.label}
            </Box>
          </Box>
        ))}
      </Box>
    );
  };

  // Render colorful emoji rating options
  const renderEmojiRating = (questionKey, type = 'satisfaction') => {
    const ratingConfigs = {
      satisfaction: [
        { key: 'poor', emoji: '😞', label: 'Poor', color: '#f44336' },
        { key: 'average', emoji: '😐', label: 'Average', color: '#ff9800' },
        { key: 'good', emoji: '🙂', label: 'Good', color: '#8bc34a' },
        { key: 'outstanding', emoji: '😍', label: 'Outstanding', color: '#4caf50' }
      ],
      frequency: [
        { key: 'never', emoji: '😞', label: 'Never', color: '#f44336' },
        { key: 'rarely', emoji: '😕', label: 'Rarely', color: '#ff5722' },
        { key: 'sometimes', emoji: '😐', label: 'Sometimes', color: '#ff9800' },
        { key: 'often', emoji: '🙂', label: 'Often', color: '#8bc34a' },
        { key: 'very_often', emoji: '😄', label: 'Very Often', color: '#4caf50' },
        { key: 'always', emoji: '😍', label: 'Always', color: '#2e7d32' }
      ],
      agreement: [
        { key: 'strongly_disagree', emoji: '😠', label: t('survey.options.agreement.strongly_disagree'), color: '#f44336' },
        { key: 'disagree', emoji: '😕', label: t('survey.options.agreement.disagree'), color: '#ff5722' },
        { key: 'neutral', emoji: '😐', label: t('survey.options.agreement.neutral'), color: '#ff9800' },
        { key: 'agree', emoji: '🙂', label: t('survey.options.agreement.agree'), color: '#8bc34a' },
        { key: 'strongly_agree', emoji: '😍', label: t('survey.options.agreement.strongly_agree'), color: '#4caf50' }
      ],
      rating_1_5: [
        { key: '1', emoji: '😞', label: '1 - Poor', color: '#f44336' },
        { key: '2', emoji: '😕', label: '2 - Below Average', color: '#ff5722' },
        { key: '3', emoji: '😐', label: '3 - Average', color: '#ff9800' },
        { key: '4', emoji: '🙂', label: '4 - Good', color: '#8bc34a' },
        { key: '5', emoji: '😍', label: '5 - Excellent', color: '#4caf50' }
      ]
    };
    
    const config = ratingConfigs[type] || ratingConfigs.satisfaction;
    
    return (
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center', mt: 2 }}>
        {config.map((option) => (
          <EmojiRatingBox
            key={option.key}
            selected={formData[questionKey] === option.key}
            bgColor={option.color}
            onClick={() => handleFieldChange(questionKey, option.key)}
          >
            <div className="emoji">{option.emoji}</div>
            <div className="label">{option.label}</div>
          </EmojiRatingBox>
        ))}
      </Box>
    );
  };

  // Render colorful scale (1-7, 1-10, etc.)
  const renderColorfulScale = (questionKey, maxScale = 7) => {
    const getScaleColor = (value, max) => {
      const ratio = value / max;
      if (ratio <= 0.3) return '#f44336'; // Red
      if (ratio <= 0.6) return '#ff9800'; // Orange
      return '#4caf50'; // Green
    };
    
    return (
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center', mt: 2 }}>
        {Array.from({ length: maxScale }, (_, i) => i + 1).map((value) => {
          const isSelected = formData[questionKey] === value.toString();
          const color = getScaleColor(value, maxScale);
          return (
            <Box
              key={value}
              onClick={() => handleFieldChange(questionKey, value.toString())}
              sx={{
                width: '50px',
                height: '50px',
                borderRadius: '12px',
                backgroundColor: isSelected ? color : `${color}40`,
                color: isSelected ? 'white' : color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.2rem',
                fontWeight: isSelected ? 700 : 500,
                cursor: 'pointer',
                border: isSelected ? '3px solid #1976d2' : '2px solid transparent',
                boxShadow: isSelected 
                  ? `0 8px 25px ${color}60` 
                  : '0 4px 15px rgba(0,0,0,0.1)',
                transform: isSelected ? 'scale(1.15)' : 'scale(1)',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'scale(1.2)',
                  backgroundColor: isSelected ? color : `${color}60`,
                  boxShadow: `0 8px 30px ${color}70`
                }
              }}
            >
              {value}
            </Box>
          );
        })}
      </Box>
    );
  };

  // Render colorful checkbox group
  const renderCheckboxGroup = (questionKey, options, type = 'default') => {
    const colors = [
      '#1976d2', '#9c27b0', '#f44336', '#ff9800', '#4caf50', 
      '#00bcd4', '#795548', '#607d8b', '#e91e63', '#3f51b5'
    ];
    
    return (
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1.5 }}>
        {Object.entries(options).map(([key, label], index) => {
          const isSelected = formData[`${questionKey}_${key}`] || false;
          const color = colors[index % colors.length];
          
          return (
            <Box
              key={key}
              onClick={() => {
                if (questionKey === 'q26' || questionKey === 'q29') {
                  handleSingleSelectChip(questionKey, key);
                } else if (questionKey === 'q6') {
                  handleCheckboxChangeWithLimit(`${questionKey}_${key}`, !isSelected, 3);
                } else if (questionKey === 'q8') {
                  handleQ8CheckboxChange(`${questionKey}_${key}`, !isSelected);
                } else {
                  handleCheckboxChange(`${questionKey}_${key}`, !isSelected);
                }
              }}
              sx={{
                padding: '8px 12px',
                borderRadius: '12px',
                backgroundColor: isSelected ? color : '#f5f5f5',
                color: isSelected ? 'white' : '#333',
                border: `2px solid ${isSelected ? '#1976d2' : '#e0e0e0'}`,
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                fontWeight: 600,
                fontSize: '0.9rem',
                minWidth: '100px',
                textAlign: 'center',
                boxShadow: isSelected ? `0 4px 12px ${color}30` : '0 2px 6px rgba(0,0,0,0.08)',
                transform: isSelected ? 'scale(1.01)' : 'scale(1)',
                '&:hover': {
                  transform: 'scale(1.03)',
                  boxShadow: `0 6px 18px ${color}40`,
                  backgroundColor: isSelected ? color : '#eeeeee'
                }
              }}
            >
              {isSelected && '✓ '}{label}
            </Box>
          );
        })}
      </Box>
    );
  };

  // Render ranking component with medal icons and dropdowns
  const renderRankingComponent = (questionKey, options, title, maxRank = 3) => {
    const ranks = Array.from({ length: maxRank }, (_, i) => i + 1);
    const validRankStrs = ranks.map(String);
    const getMedalIcon = (rank) => {
      switch(rank) {
        case 1: return '🥇';
        case 2: return '🥈';
        case 3: return '🥉';
        default: return '🏅';
      }
    };

    const getRankColor = (rank) => {
      switch(rank) {
        case 1: return '#f57c00'; // Orange for 1st place
        case 2: return '#1976d2'; // Blue for 2nd place
        case 3: return '#388e3c'; // Green for 3rd place
        default: return '#e0e0e0';
      }
    };

    const getAvailableOptions = (currentRank) => {
      const usedOptions = Object.keys(formData)
        .filter(key => key.startsWith(`${questionKey}_`) && validRankStrs.includes(formData[key]))
        .map(key => key.replace(`${questionKey}_`, ''));
      
      return Object.keys(options).filter(optionKey => {
        const currentSelection = Object.keys(formData).find(key => 
          key.startsWith(`${questionKey}_`) && formData[key] === currentRank.toString()
        );
        const isCurrentSelection = currentSelection && currentSelection.replace(`${questionKey}_`, '') === optionKey;
        return !usedOptions.includes(optionKey) || isCurrentSelection;
      });
    };

    return (
      <Box sx={{ mt: 2 }}>
        <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, mb: 2, textAlign: 'center' }}>
          {title}
        </Typography>

        {ranks.map((rank) => {
          const selectedOption = Object.keys(formData).find(key =>
            key.startsWith(`${questionKey}_`) && formData[key] === rank.toString()
          );
          const selectedKey = selectedOption ? selectedOption.replace(`${questionKey}_`, '') : null;
          const selectedLabel = selectedKey ? options[selectedKey] : null;
          const availableOptions = getAvailableOptions(rank);
          const rankColor = getRankColor(rank);

          return (
            <Box key={rank} sx={{ 
              display: 'flex', 
              alignItems: 'center',
              gap: isMobile ? 1 : 1.5,
              p: isMobile ? 1 : 1.5,
              mb: 1.5,
              borderRadius: '12px',
              backgroundColor: selectedLabel ? `${rankColor}20` : '#fafafa',
              border: selectedLabel ? `2px solid ${rankColor}` : '1px solid #e0e0e0',
              transition: 'all 0.3s ease'
            }}>
              {/* Medal Icon */}
              <Box sx={{
                width: isMobile ? '35px' : '40px',
                height: isMobile ? '35px' : '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: isMobile ? '1.3rem' : '1.5rem',
                flexShrink: 0
              }}>
                {getMedalIcon(rank)}
              </Box>

              {/* Rank Number */}
              <Box sx={{ 
                minWidth: isMobile ? '60px' : '80px', 
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center'
              }}>
                <Typography variant="h6" sx={{ 
                  fontWeight: 700, 
                  color: selectedLabel ? rankColor : '#666',
                  fontSize: isMobile ? '1rem' : '1.1rem',
                  lineHeight: 1
                }}>
                  {rank}
                </Typography>
              </Box>

              {/* Dropdown */}
              <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Select
                  fullWidth
                  value={selectedKey || ''}
                  onChange={(e) => {
                    const newValue = e.target.value;
                    if (newValue) {
                      handleRankingChange(questionKey, newValue, rank.toString());
                    } else if (selectedOption) {
                      handleFieldChange(selectedOption, '');
                    }
                  }}
                  displayEmpty
                  size="small"
                  renderValue={(selected) => {
                    if (!selected) return language === 'hi' ? 'विकल्प चुनें...' : 'Select option...';
                    const label = options[selected] || selected;
                    return isMobile && label.length > 25 ? `${label.substring(0, 25)}...` : label;
                  }}
                  sx={{
                    borderRadius: '8px',
                    backgroundColor: selectedLabel ? `${rankColor}15` : 'white',
                    color: selectedLabel ? rankColor : 'inherit',
                    fontWeight: selectedLabel ? 600 : 400,
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: selectedLabel ? rankColor : '#e0e0e0'
                    },
                    '& .MuiSelect-select': {
                      color: selectedLabel ? rankColor : 'inherit'
                    }
                  }}
                >
                  <MenuItem value="">
                    <em style={{ color: '#999' }}>
                      {language === 'hi' ? `रैंक ${rank} के लिए विकल्प चुनें` : `Select option for rank ${rank}`}
                    </em>
                  </MenuItem>
                  {availableOptions.map((optionKey) => (
                    <MenuItem key={optionKey} value={optionKey}>
                      {options[optionKey]}
                    </MenuItem>
                  ))}
                </Select>
                
                {selectedLabel && (
                  <Button
                    size="small"
                    onClick={() => handleFieldChange(selectedOption, '')}
                    sx={{ 
                      color: '#f44336', 
                      minWidth: '24px',
                      width: '24px',
                      height: '24px',
                      p: 0
                    }}
                  >
                    ✕
                  </Button>
                )}
              </Box>
            </Box>
          );
        })}

        {/* Progress Indicator */}
        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Typography variant="body2" sx={{ color: '#666', mb: 1, fontSize: isMobile ? '0.8rem' : '0.9rem' }}>
            {language === 'hi' ?
              `प्रगति: ${Object.keys(formData).filter(key =>
                key.startsWith(`${questionKey}_`) && validRankStrs.includes(formData[key])
              ).length} में से ${maxRank} रैंकिंग पूरी` :
              `Progress: ${Object.keys(formData).filter(key =>
                key.startsWith(`${questionKey}_`) && validRankStrs.includes(formData[key])
              ).length} of ${maxRank} rankings completed`
            }
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
            {ranks.map((rank) => {
              const isCompleted = Object.keys(formData).some(key => 
                key.startsWith(`${questionKey}_`) && formData[key] === rank.toString()
              );
              return (
                <Box
                  key={rank}
                  sx={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    backgroundColor: isCompleted ? getRankColor(rank) : '#e0e0e0',
                    transition: 'all 0.3s ease'
                  }}
                />
              );
            })}
          </Box>
        </Box>
      </Box>
    );
  };

  return (
    <Box>
      {/* Progress Bar */}
      <ProgressContainer>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {step === 'survey' && (
          <>
          <Typography variant="body2" sx={{ minWidth: '80px' }}>
            Progress: {Math.round(progress)}%
          </Typography>
          <LinearProgress 
            variant="determinate" 
            value={progress} 
            sx={{ 
              flexGrow: 1, 
              height: 8, 
              borderRadius: 4,
              '& .MuiLinearProgress-bar': {
                background: 'linear-gradient(90deg, #1976d2, #42a5f5)'
              }
            }} 
          />
          </>
          )}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 'auto' }}>
            <Typography variant="caption" sx={{ color: 'white', fontWeight: 600 }}>
              {t('survey.language')}:
            </Typography>
            <Select
              value={language}
              onChange={handleLanguageChange}
              size="small"
              sx={{ 
                backgroundColor: 'white', 
                minWidth: 120,
                borderRadius: '20px',
                fontSize: '0.9rem',
                fontWeight: 600,
                '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
                '& .MuiSelect-select': { py: 0.5 }
              }}
            >
              <MenuItem value="en">🇺🇸 English</MenuItem>
              <MenuItem value="hi">🇮🇳 हिंदी</MenuItem>
            </Select>
          </Box>
        </Box>
      </ProgressContainer>

      {/* Header */}
      <HeaderContainer>
        <Zoom in timeout={1000}>
          <Box sx={{ position: 'relative', zIndex: 1 }}>
            <Box display="flex" alignItems="center" justifyContent="center" gap={isMobile ? 1.5 : 2} mb={isMobile ? 1 : 1.5}>
              <img src={belLogo} alt="BEL Logo" style={{ height: isMobile ? '35px' : '50px' }} />
              <Box textAlign={isMobile ? 'center' : 'left'}>
                <Typography variant={isMobile ? "h6" : "h4"} component="h1" sx={{ fontWeight: 700, lineHeight: isMobile ? 1.1 : 1.2 }}>
                  {t('survey.title')}
                </Typography>
                <Typography variant={isMobile ? "caption" : "body2"} sx={{ opacity: 0.9, mt: isMobile ? 0.3 : 0.5, lineHeight: 1.2 }}>
                  {t('survey.subtitle')}
                </Typography>
                <br />
                <Typography variant={isMobile ? "caption" : "caption"} sx={{ opacity: 0.8, mt: isMobile ? 0.2 : 0.3 }}>
                  {t('survey.estimatedTime')}
                </Typography>
              </Box>
            </Box>
            

          </Box>
        </Zoom>
      </HeaderContainer>

      {/* Personal Information Step */}
      {step === 'personal' && (
        <BELPersonalInfoForm
          values={personalInfo}
          errors={personalInfoErrors}
          onChange={handlePersonalInfoChange}
          onContinue={handleContinue}
          t={t}
          isMobile={isMobile}
        />
      )}

      {/* Survey Form */}
      {step === 'survey' && (
      <SurveyContainer>
        <form onSubmit={handleSubmit}>
          
          {/* Section 1: Overall Job Satisfaction & Engagement */}
          <Fade in timeout={800}>
            <SectionCard>
              <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Typography variant="h5" gutterBottom sx={{ color: '#1976d2', fontWeight: 700, mb: 1.5 }}>
                  🎆 1. {t('survey.sections.overall')}
                </Typography>
                
                {/* Q1 */}
                <QuestionBox hasError={!!validationErrors['q1']} data-question="q1">
                  {renderQuestionTitle('q1', t('survey.questions.q1'))}
                  {renderWorkMotivationFrequency('q1')}
                </QuestionBox>

                {/* Q2 */}
                <QuestionBox hasError={!!validationErrors['q2']} data-question="q2">
                  {renderQuestionTitle('q2', t('survey.questions.q2'))}
                  {renderNPSScale('q2')}
                </QuestionBox>

                {/* Q2a - Conditional: Show only if NPS score is 8 or below */}
                {formData['q2'] && parseInt(formData['q2']) <= 8 && (
                  <QuestionBox hasError={!!validationErrors['q2a']} data-question="q2a">
                    {renderQuestionTitle('q2a', t('survey.questions.q2a'))}
                    <TextField
                      fullWidth
                      multiline
                      rows={3}
                      value={formData['q2a'] || ''}
                      onChange={(e) => handleFieldChange('q2a', e.target.value)}
                      placeholder={t('survey.placeholders.text_response')}
                      variant="outlined"
                      error={!!validationErrors['q2a']}
                      helperText={validationErrors['q2a']}
                      sx={{ mt: 1 }}
                    />
                  </QuestionBox>
                )}

                {/* Q3 */}
                <QuestionBox hasError={!!validationErrors['q3']} data-question="q3">
                  {renderQuestionTitle('q3', t('survey.questions.q3'))}
                  <Box sx={{ 
                    display: 'flex', 
                    flexDirection: 'column',
                    gap: 0.3, 
                    mt: 1 
                  }}>
                    {[
                      { key: 'love_job', label: t('survey.options.satisfaction.love_job'), emoji: '😍', color: '#2e7d32' },
                      { key: 'generally_satisfied', label: t('survey.options.satisfaction.generally_satisfied'), emoji: '😊', color: '#4caf50' },
                      { key: 'meets_needs', label: t('survey.options.satisfaction.meets_needs'), emoji: '😐', color: '#ff9800' },
                      { key: 'somewhat_dissatisfied', label: t('survey.options.satisfaction.somewhat_dissatisfied'), emoji: '😕', color: '#ff5722' },
                      { key: 'looking_opportunities', label: t('survey.options.satisfaction.looking_opportunities'), emoji: '😞', color: '#f44336' }
                    ].map((option) => (
                      <Box
                        key={option.key}
                        onClick={() => handleFieldChange('q3', option.key)}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: isMobile ? '6px 8px' : '8px 10px',
                          borderRadius: '8px',
                          backgroundColor: formData['q3'] === option.key ? option.color : `${option.color}40`,
                          color: formData['q3'] === option.key ? 'white' : option.color,
                          border: formData['q3'] === option.key ? '2px solid #1976d2' : '1px solid transparent',
                          cursor: 'pointer',
                          transition: 'all 0.3s ease',
                          boxShadow: formData['q3'] === option.key 
                            ? `0 4px 12px ${option.color}60` 
                            : '0 2px 6px rgba(0,0,0,0.1)',
                          transform: formData['q3'] === option.key ? 'scale(1.02)' : 'scale(1)',
                          '&:hover': {
                            transform: 'scale(1.02)',
                            backgroundColor: formData['q3'] === option.key ? option.color : `${option.color}60`,
                            boxShadow: `0 4px 15px ${option.color}60`
                          }
                        }}
                      >
                        <Box sx={{ fontSize: isMobile ? '1.2rem' : '1.3rem', mr: isMobile ? 1 : 2, opacity: formData['q3'] === option.key ? 1 : 0.7 }}>{option.emoji}</Box>
                        <Box sx={{ fontSize: '1rem', fontWeight: 600, color: formData['q3'] === option.key ? 'white' : '#333' }}>
                          {option.label}
                        </Box>
                      </Box>
                    ))}
                  </Box>
                </QuestionBox>

                {/* Q3a - Conditional: Show only if job satisfaction is "somewhat dissatisfied" or "actively looking" */}
                {(formData['q3'] === 'somewhat_dissatisfied' || formData['q3'] === 'looking_opportunities') && (
                  <QuestionBox hasError={!!validationErrors['q3a']} data-question="q3a">
                    {renderQuestionTitle('q3a', t('survey.questions.q3a'))}
                    <TextField
                      fullWidth
                      multiline
                      rows={3}
                      value={formData['q3a'] || ''}
                      onChange={(e) => handleFieldChange('q3a', e.target.value)}
                      placeholder={t('survey.placeholders.text_response')}
                      variant="outlined"
                      error={!!validationErrors['q3a']}
                      helperText={validationErrors['q3a']}
                      sx={{ mt: 1 }}
                    />
                  </QuestionBox>
                )}
              </CardContent>
            </SectionCard>
          </Fade>

          {/* Section 2: Work Environment & Culture */}
          <Fade in timeout={1000}>
            <SectionCard>
              <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Typography variant="h5" gutterBottom sx={{ color: '#1976d2', fontWeight: 700, mb: 1.5 }}>
                  🌈 2. {t('survey.sections.environment')}
                </Typography>
                
                {/* Q4 */}
                <QuestionBox hasError={!!(validationErrors['q4_psychological'] || validationErrors['q4_innovation'] || validationErrors['q4_diversity'] || validationErrors['q4_communication'] || validationErrors['q4_trust'])} data-question="q4">
                  {renderQuestionTitle('q4', t('survey.questions.q4'))}
                  
                  <Box sx={{ mt: 2 }}>
                    {[
                      { key: 'q4_psychological', label: t('survey.questions.q4_psychological') },
                      { key: 'q4_innovation', label: t('survey.questions.q4_innovation') },
                      { key: 'q4_diversity', label: t('survey.questions.q4_diversity') },
                      { key: 'q4_communication', label: t('survey.questions.q4_communication') },
                      { key: 'q4_trust', label: t('survey.questions.q4_trust') }
                    ].map((item) => (
                      <Box key={item.key} sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        p: 1.5, 
                        mb: 1.5,
                        backgroundColor: '#f8f9ff',
                        borderRadius: '12px',
                        border: '1px solid #e3f2fd',
                        [theme.breakpoints.down('md')]: {
                          flexDirection: 'column',
                          alignItems: 'flex-start',
                          gap: 1
                        }
                      }}>
                        <Typography variant="body1" sx={{ 
                          fontWeight: 500, 
                          minWidth: isMobile ? '100%' : '200px',
                          textAlign: isMobile ? 'center' : 'left',
                          mb: isMobile ? 1 : 0
                        }}>
                          {item.label}
                        </Typography>
                        <Box sx={{ 
                          display: 'flex', 
                          gap: 0.5, 
                          justifyContent: 'center',
                          alignItems: 'center'
                        }}>
                          {[1, 2, 3, 4, 5].map((value) => {
                            const isSelected = formData[item.key] === value.toString();
                            const getColor = (val) => {
                              if (val <= 2) return '#f44336'; // Red for 1-2
                              if (val === 3) return '#ff9800'; // Orange for 3
                              return '#4caf50'; // Green for 4-5
                            };
                            const color = getColor(value);
                            
                            return (
                              <Box
                                key={value}
                                onClick={() => handleFieldChange(item.key, value.toString())}
                                sx={{
                                  width: isMobile ? '40px' : '45px',
                                  height: isMobile ? '40px' : '45px',
                                  borderRadius: '8px',
                                  backgroundColor: isSelected ? color : `${color}40`,
                                  color: isSelected ? 'white' : color,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: isMobile ? '1rem' : '1.1rem',
                                  fontWeight: isSelected ? 700 : 500,
                                  cursor: 'pointer',
                                  border: isSelected ? '2px solid #1976d2' : '1px solid transparent',
                                  boxShadow: isSelected 
                                    ? `0 4px 12px ${color}60` 
                                    : '0 2px 8px rgba(0,0,0,0.1)',
                                  transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                                  transition: 'all 0.3s ease',
                                  '&:hover': {
                                    transform: 'scale(1.1)',
                                    backgroundColor: isSelected ? color : `${color}60`,
                                    boxShadow: `0 4px 15px ${color}70`
                                  }
                                }}
                              >
                                {value}
                              </Box>
                            );
                          })}
                        </Box>
                      </Box>
                    ))}
                  </Box>
                </QuestionBox>

                {/* Q5 */}
                <QuestionBox hasError={!!validationErrors['q5']} data-question="q5">
                  {renderQuestionTitle('q5', t('survey.questions.q5'))}
                  <Box sx={{ 
                    display: 'flex', 
                    flexDirection: 'column',
                    gap: 0.5, 
                    mt: 1.5 
                  }}>
                    {[
                      { key: 'truly_belong', label: t('survey.options.belonging.truly_belong'), emoji: '🌟', color: '#4caf50' },
                      { key: 'generally_included', label: t('survey.options.belonging.generally_included'), emoji: '😊', color: '#8bc34a' },
                      { key: 'dont_fit', label: t('survey.options.belonging.dont_fit'), emoji: '😕', color: '#ff9800' },
                      { key: 'excluded', label: t('survey.options.belonging.excluded'), emoji: '😞', color: '#f44336' }
                    ].map((option) => (
                      <Box
                        key={option.key}
                        onClick={() => handleFieldChange('q5', option.key)}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '8px 12px',
                          borderRadius: '12px',
                          backgroundColor: formData['q5'] === option.key ? option.color : `${option.color}40`,
                          color: formData['q5'] === option.key ? 'white' : option.color,
                          border: formData['q5'] === option.key ? '3px solid #1976d2' : '2px solid transparent',
                          cursor: 'pointer',
                          transition: 'all 0.3s ease',
                          boxShadow: formData['q5'] === option.key 
                            ? `0 6px 20px ${option.color}80, 0 0 0 2px #fff` 
                            : '0 3px 10px rgba(0,0,0,0.1)',
                          transform: formData['q5'] === option.key ? 'scale(1.02)' : 'scale(1)',
                          '&:hover': {
                            transform: 'scale(1.02)',
                            backgroundColor: formData['q5'] === option.key ? option.color : `${option.color}60`,
                            boxShadow: `0 6px 20px ${option.color}60`
                          }
                        }}
                      >
                        <Box sx={{ fontSize: '1.3rem', mr: 1.5, opacity: formData['q5'] === option.key ? 1 : 0.7 }}>{option.emoji}</Box>
                        <Box sx={{ fontSize: '0.9rem', fontWeight: 600, color: formData['q5'] === option.key ? 'white' : '#333' }}>
                          {option.label}
                        </Box>
                      </Box>
                    ))}
                  </Box>
                </QuestionBox>

                {/* Q6 */}
                <QuestionBox hasError={!!validationErrors['q6']} data-question="q6">
                  {renderQuestionTitle('q6', t('survey.questions.q6'))}
                  {renderCheckboxGroup('q6', {
                    collaborative: t('survey.options.culture_words.collaborative'),
                    competitive: t('survey.options.culture_words.competitive'),
                    innovative: t('survey.options.culture_words.innovative'),
                    hierarchical: t('survey.options.culture_words.hierarchical'),
                    flexible: t('survey.options.culture_words.flexible'),
                    fast_paced: t('survey.options.culture_words.fast_paced'),
                    supportive: t('survey.options.culture_words.supportive'),
                    inclusive: t('survey.options.culture_words.inclusive'),
                    transparent: t('survey.options.culture_words.transparent'),
                    bureaucratic: t('survey.options.culture_words.bureaucratic')
                  })}
                </QuestionBox>
              </CardContent>
            </SectionCard>
          </Fade>

          {/* Section 3: Leadership & Management Excellence */}
          <Fade in timeout={1200}>
            <SectionCard>
              <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Typography variant="h5" gutterBottom sx={{ color: '#1976d2', fontWeight: 700, mb: 1.5 }}>
                  👑 3. {t('survey.sections.leadership')}
                </Typography>
                
                {/* Q8 */}
                <QuestionBox hasError={!!validationErrors['q8']} data-question="q8">
                  {renderQuestionTitle('q8', t('survey.questions.q8'))}
                  {renderCheckboxGroup('q8', {
                    clear_direction: t('survey.options.manager_qualities.clear_direction'),
                    recognizes: t('survey.options.manager_qualities.recognizes'),
                    supports_development: t('survey.options.manager_qualities.supports_development'),
                    gives_feedback: t('survey.options.manager_qualities.gives_feedback'),
                    trusts_decisions: t('survey.options.manager_qualities.trusts_decisions'),
                    available: t('survey.options.manager_qualities.available'),
                    demonstrates_values: t('survey.options.manager_qualities.demonstrates_values'),
                    none: t('survey.options.manager_qualities.none')
                  })}
                </QuestionBox>

                {/* Q9 */}
                <QuestionBox hasError={!!validationErrors['q9']} data-question="q9">
                  {renderQuestionTitle('q9', t('survey.questions.q9'))}
                  {renderEmojiRating('q9', 'agreement')}
                </QuestionBox>

                {/* Q10 */}
                <QuestionBox hasError={!!(validationErrors['q10_vision'] || validationErrors['q10_transparency'] || validationErrors['q10_feedback'] || validationErrors['q10_change'])} data-question="q10">
                  {renderQuestionTitle('q10', t('survey.questions.q10'))}
                  
                  <Box sx={{ mt: 2 }}>
                    {[
                      { key: 'q10_vision', label: t('survey.questions.q10_vision') },
                      { key: 'q10_transparency', label: t('survey.questions.q10_transparency') },
                      { key: 'q10_feedback', label: t('survey.questions.q10_feedback') },
                      { key: 'q10_change', label: t('survey.questions.q10_change') }
                    ].map((item) => (
                      <Box key={item.key} sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        p: 1.5, 
                        mb: 1.5,
                        backgroundColor: '#f8f9ff',
                        borderRadius: '12px',
                        border: '1px solid #e3f2fd',
                        [theme.breakpoints.down('md')]: {
                          flexDirection: 'column',
                          alignItems: 'flex-start',
                          gap: 1
                        }
                      }}>
                        <Typography variant="body1" sx={{ 
                          fontWeight: 500, 
                          minWidth: isMobile ? '100%' : '250px',
                          textAlign: isMobile ? 'center' : 'left',
                          mb: isMobile ? 1 : 0
                        }}>
                          {item.label}
                        </Typography>
                        <Box sx={{ 
                          display: 'flex', 
                          gap: 0.5, 
                          justifyContent: 'center',
                          alignItems: 'center'
                        }}>
                          {[
                            { key: 'a_plus', label: t('survey.options.grades.a_plus'), color: '#4caf50' },
                            { key: 'a', label: t('survey.options.grades.a'), color: '#8bc34a' },
                            { key: 'b', label: t('survey.options.grades.b'), color: '#cddc39' },
                            { key: 'c', label: t('survey.options.grades.c'), color: '#ff9800' },
                            { key: 'd', label: t('survey.options.grades.d'), color: '#ff5722' }
                          ].map((option) => (
                            <Box
                              key={option.key}
                              onClick={() => handleFieldChange(item.key, option.key)}
                              sx={{
                                minWidth: isMobile ? '40px' : '50px',
                                height: isMobile ? '40px' : '45px',
                                borderRadius: '8px',
                                backgroundColor: formData[item.key] === option.key ? option.color : `${option.color}40`,
                                color: formData[item.key] === option.key ? 'white' : option.color,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: isMobile ? '0.9rem' : '1.1rem',
                                fontWeight: formData[item.key] === option.key ? 700 : 500,
                                cursor: 'pointer',
                                border: formData[item.key] === option.key ? '2px solid #1976d2' : '1px solid transparent',
                                boxShadow: formData[item.key] === option.key 
                                  ? `0 4px 12px ${option.color}60` 
                                  : '0 2px 8px rgba(0,0,0,0.1)',
                                transform: formData[item.key] === option.key ? 'scale(1.05)' : 'scale(1)',
                                transition: 'all 0.3s ease',
                                '&:hover': {
                                  transform: 'scale(1.1)',
                                  backgroundColor: formData[item.key] === option.key ? option.color : `${option.color}60`,
                                  boxShadow: `0 4px 15px ${option.color}70`
                                }
                              }}
                            >
                              {option.label}
                            </Box>
                          ))}
                        </Box>
                      </Box>
                    ))}
                  </Box>
                </QuestionBox>
              </CardContent>
            </SectionCard>
          </Fade>

          {/* Section 4: Career Growth & Development */}
          <Fade in timeout={1400}>
            <SectionCard>
              <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Typography variant="h5" gutterBottom sx={{ color: '#1976d2', fontWeight: 700, mb: 1.5 }}>
                  📈 4. {t('survey.sections.growth')}
                </Typography>
                
                {/* Q11 */}
                <QuestionBox hasError={!!validationErrors['q11']} data-question="q11">
                  {renderQuestionTitle('q11', t('survey.questions.q11'))}
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center', mt: 2 }}>
                    {[
                      { key: 'very_clear', label: t('survey.options.career_clarity.very_clear'), color: '#4caf50' },
                      { key: 'somewhat_clear', label: t('survey.options.career_clarity.somewhat_clear'), color: '#8bc34a' },
                      { key: 'unclear', label: t('survey.options.career_clarity.unclear'), color: '#ff9800' },
                      { key: 'no_path', label: t('survey.options.career_clarity.no_path'), color: '#f44336' }
                    ].map((option) => (
                      <ColorfulRadioOption
                        key={option.key}
                        selected={formData['q11'] === option.key}
                        color={option.color}
                        onClick={() => handleFieldChange('q11', option.key)}
                      >
                        {option.label}
                      </ColorfulRadioOption>
                    ))}
                  </Box>
                </QuestionBox>

                {/* Q11a - Conditional: Show only if unclear or no path */}
                {(formData['q11'] === 'unclear' || formData['q11'] === 'no_path') && (
                  <QuestionBox hasError={!!validationErrors['q11a']} data-question="q11a">
                    {renderQuestionTitle('q11a', t('survey.questions.q11a'))}
                    <TextField
                      fullWidth
                      multiline
                      rows={3}
                      value={formData['q11a'] || ''}
                      onChange={(e) => handleFieldChange('q11a', e.target.value)}
                      placeholder={t('survey.placeholders.text_response')}
                      variant="outlined"
                      error={!!validationErrors['q11a']}
                      helperText={validationErrors['q11a']}
                      sx={{ mt: 1 }}
                    />
                  </QuestionBox>
                )}

                {/* Q12 */}
                <QuestionBox hasError={!!validationErrors['q12']} data-question="q12">
                  {renderQuestionTitle('q12', t('survey.questions.q12'))}
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center', mt: 2 }}>
                    {[
                      { key: '0', label: t('survey.options.development_hours.0'), color: '#f44336' },
                      { key: '1_10', label: t('survey.options.development_hours.1_10'), color: '#ff5722' },
                      { key: '11_25', label: t('survey.options.development_hours.11_25'), color: '#ff9800' },
                      { key: '26_50', label: t('survey.options.development_hours.26_50'), color: '#8bc34a' },
                      { key: '50_plus', label: t('survey.options.development_hours.50_plus'), color: '#4caf50' }
                    ].map((option) => (
                      <ColorfulRadioOption
                        key={option.key}
                        selected={formData['q12'] === option.key}
                        color={option.color}
                        onClick={() => handleFieldChange('q12', option.key)}
                      >
                        {option.label}
                      </ColorfulRadioOption>
                    ))}
                  </Box>
                </QuestionBox>

                {/* Q13 */}
                <QuestionBox hasError={!!validationErrors['q13']} data-question="q13">
                  {renderQuestionTitle('q13', t('survey.questions.q13'))}
                  {renderRankingComponent('q13', {
                    technical: t('survey.options.development_priorities.technical'),
                    leadership: t('survey.options.development_priorities.leadership'),
                    digital: t('survey.options.development_priorities.digital'),
                    communication: t('survey.options.development_priorities.communication'),
                    project_management: t('survey.options.development_priorities.project_management'),
                    cross_functional: t('survey.options.development_priorities.cross_functional'),
                    mentoring: t('survey.options.development_priorities.mentoring'),
                    certifications: t('survey.options.development_priorities.certifications')
                  }, language === 'hi' ? 'नीचे दिए गए ड्रॉपडाउन का उपयोग करके अपनी शीर्ष 2 विकास प्राथमिकताओं का चयन करें:' : 'Select your top 2 development priorities using the dropdown below:', 2)}
                </QuestionBox>

                {/* Q14 */}
                <QuestionBox hasError={!!validationErrors['q14']} data-question="q14">
                  {renderQuestionTitle('q14', t('survey.questions.q14'))}
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center', mt: 2 }}>
                    {[
                      { key: 'world_class', label: t('survey.options.quality_rating.world_class'), color: '#4caf50' },
                      { key: 'above_average', label: t('survey.options.quality_rating.above_average'), color: '#8bc34a' },
                      { key: 'average', label: t('survey.options.quality_rating.average'), color: '#ff9800' },
                      { key: 'below_average', label: t('survey.options.quality_rating.below_average'), color: '#ff5722' },
                      { key: 'poor', label: t('survey.options.quality_rating.poor'), color: '#f44336' }
                    ].map((option) => (
                      <ColorfulRadioOption
                        key={option.key}
                        selected={formData['q14'] === option.key}
                        color={option.color}
                        onClick={() => handleFieldChange('q14', option.key)}
                      >
                        {option.label}
                      </ColorfulRadioOption>
                    ))}
                  </Box>
                </QuestionBox>
              </CardContent>
            </SectionCard>
          </Fade>

          {/* Section 5: Compensation & Total Rewards */}
          <Fade in timeout={1500}>
            <SectionCard>
              <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Typography variant="h5" gutterBottom sx={{ color: '#1976d2', fontWeight: 700, mb: 1.5 }}>
                  💰 5. {t('survey.sections.compensation')}
                </Typography>
                
                {/* Q15 */}
                <QuestionBox hasError={!!(validationErrors['q15_market'] || validationErrors['q15_contributions'] || validationErrors['q15_colleagues'])} data-question="q15">
                  {renderQuestionTitle('q15', t('survey.questions.q15'))}
                  
                  <Box sx={{ mt: 2 }}>
                    {[
                      { key: 'q15_market', label: t('survey.questions.q15_market') },
                      { key: 'q15_contributions', label: t('survey.questions.q15_contributions') },
                      { key: 'q15_colleagues', label: t('survey.questions.q15_colleagues') }
                    ].map((item) => (
                      <Box key={item.key} sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        p: 1.5, 
                        mb: 1.5,
                        backgroundColor: '#f8f9ff',
                        borderRadius: '12px',
                        border: '1px solid #e3f2fd',
                        [theme.breakpoints.down('md')]: {
                          flexDirection: 'column',
                          alignItems: 'flex-start',
                          gap: 1
                        }
                      }}>
                        <Typography variant="body1" sx={{ 
                          fontWeight: 500, 
                          minWidth: isMobile ? '100%' : '250px',
                          textAlign: isMobile ? 'center' : 'left',
                          mb: isMobile ? 1 : 0
                        }}>
                          {item.label}
                        </Typography>
                        <Box sx={{ 
                          display: 'flex', 
                          gap: 0.5, 
                          justifyContent: 'center',
                          alignItems: 'center',
                          flexWrap: 'wrap'
                        }}>
                          {[
                            { key: 'much_above', label: t('survey.options.compensation.much_above'), color: '#4caf50' },
                            { key: 'above', label: t('survey.options.compensation.above'), color: '#8bc34a' },
                            { key: 'fair', label: t('survey.options.compensation.fair'), color: '#ff9800' },
                            { key: 'below', label: t('survey.options.compensation.below'), color: '#ff5722' },
                            { key: 'much_below', label: t('survey.options.compensation.much_below'), color: '#f44336' }
                          ].map((option) => (
                            <Box
                              key={option.key}
                              onClick={() => handleFieldChange(item.key, option.key)}
                              sx={{
                                padding: isMobile ? '6px 10px' : '8px 12px',
                                borderRadius: '8px',
                                backgroundColor: formData[item.key] === option.key ? option.color : `${option.color}40`,
                                color: formData[item.key] === option.key ? 'white' : option.color,
                                border: formData[item.key] === option.key ? '2px solid #1976d2' : '1px solid transparent',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                                fontWeight: 600,
                                fontSize: isMobile ? '0.75rem' : '0.85rem',
                                minWidth: isMobile ? '70px' : '90px',
                                textAlign: 'center',
                                boxShadow: formData[item.key] === option.key ? `0 4px 12px ${option.color}30` : '0 2px 6px rgba(0,0,0,0.08)',
                                transform: formData[item.key] === option.key ? 'scale(1.02)' : 'scale(1)',
                                '&:hover': {
                                  transform: 'scale(1.05)',
                                  boxShadow: `0 4px 15px ${option.color}40`,
                                  backgroundColor: formData[item.key] === option.key ? option.color : `${option.color}60`
                                }
                              }}
                            >
                              {option.label}
                            </Box>
                          ))}
                        </Box>
                      </Box>
                    ))}
                  </Box>
                </QuestionBox>

                {/* Q16 */}
                <QuestionBox hasError={!!validationErrors['q16']} data-question="q16">
                  {renderQuestionTitle('q16', t('survey.questions.q16'))}
                  {renderRankingComponent('q16', {
                    medical: t('survey.options.benefits.medical'),
                    pension: t('survey.options.benefits.pension'),
                    retired_health: t('survey.options.benefits.retired_health'),
                    besafe: t('survey.options.benefits.besafe'),
                    leaves: t('survey.options.benefits.leaves'),
                    prp_ppi: t('survey.options.benefits.prp_ppi'),
                    creche: t('survey.options.benefits.creche'),
                    quarters: t('survey.options.benefits.quarters'),
                    iut: t('survey.options.benefits.iut'),
                    club: t('survey.options.benefits.club'),
                    canteen: t('survey.options.benefits.canteen')
                  }, language === 'hi' ? 'आपके लिए सबसे महत्वपूर्ण शीर्ष 3 लाभों को रैंक करें:' : 'Rank your top 3 most important benefits:')}
                </QuestionBox>

                {/* Q17 */}
                <QuestionBox hasError={!!validationErrors['q17']} data-question="q17">
                  {renderQuestionTitle('q17', t('survey.questions.q17'))}
                  <TextField
                    fullWidth
                    value={formData['q17'] || ''}
                    onChange={(e) => handleFieldChange('q17', e.target.value)}
                    placeholder={language === 'hi' ? 'कृपया नए लाभ का उल्लेख करें जिसे आप जोड़ना चाहते हैं...' : 'Please mention the new benefit you would like to add...'}
                    variant="outlined"
                    sx={{ mt: 1 }}
                  />
                </QuestionBox>
              </CardContent>
            </SectionCard>
          </Fade>

          {/* Section 6: Technology & Digital Enablement */}
          <Fade in timeout={1600}>
            <SectionCard>
              <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Typography variant="h5" gutterBottom sx={{ color: '#1976d2', fontWeight: 700, mb: 1.5 }}>
                  💻 6. {t('survey.sections.technology')}
                </Typography>
                
                {/* Q18 */}
                <QuestionBox hasError={!!validationErrors['q18']} data-question="q18">
                  {renderQuestionTitle('q18', t('survey.questions.q18'))}
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center', mt: 2 }}>
                    {[
                      { key: 'cutting_edge', label: t('survey.options.technology.cutting_edge'), color: '#4caf50' },
                      { key: 'modern', label: t('survey.options.technology.modern'), color: '#8bc34a' },
                      { key: 'adequate', label: t('survey.options.technology.adequate'), color: '#ff9800' },
                      { key: 'outdated', label: t('survey.options.technology.outdated'), color: '#ff5722' },
                      { key: 'hindering', label: t('survey.options.technology.hindering'), color: '#f44336' }
                    ].map((option) => (
                      <ColorfulRadioOption
                        key={option.key}
                        selected={formData['q18'] === option.key}
                        color={option.color}
                        onClick={() => handleFieldChange('q18', option.key)}
                      >
                        {option.label}
                      </ColorfulRadioOption>
                    ))}
                  </Box>
                </QuestionBox>

                {/* Q19 */}
                <QuestionBox hasError={!!(validationErrors['q19_efficiency'] || validationErrors['q19_customers'] || validationErrors['q19_information'])} data-question="q19">
                  {renderQuestionTitle('q19', t('survey.questions.q19'))}

                  <Box sx={{ mt: 2 }}>
                    {[
                      { key: 'q19_efficiency', label: t('survey.questions.q19_efficiency') },
                      { key: 'q19_customers', label: t('survey.questions.q19_customers') },
                      { key: 'q19_information', label: t('survey.questions.q19_information') }
                    ].map((item) => (
                      <Box key={item.key} sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        p: 1.5, 
                        mb: 1.5,
                        backgroundColor: '#f8f9ff',
                        borderRadius: '12px',
                        border: '1px solid #e3f2fd',
                        [theme.breakpoints.down('md')]: {
                          flexDirection: 'column',
                          alignItems: 'flex-start',
                          gap: 1
                        }
                      }}>
                        <Typography variant="body1" sx={{ 
                          fontWeight: 500, 
                          minWidth: isMobile ? '100%' : '250px',
                          textAlign: isMobile ? 'center' : 'left',
                          mb: isMobile ? 1 : 0
                        }}>
                          {item.label}
                        </Typography>
                        <Box sx={{ 
                          display: 'flex', 
                          gap: 0.5, 
                          justifyContent: 'center',
                          alignItems: 'center'
                        }}>
                          {[
                            { key: 'excellent', label: t('survey.options.effectiveness.excellent'), color: '#4caf50' },
                            { key: 'good', label: t('survey.options.effectiveness.good'), color: '#8bc34a' },
                            { key: 'fair', label: t('survey.options.effectiveness.fair'), color: '#ff9800' },
                            { key: 'poor', label: t('survey.options.effectiveness.poor'), color: '#f44336' }
                          ].map((option) => (
                            <Box
                              key={option.key}
                              onClick={() => handleFieldChange(item.key, option.key)}
                              sx={{
                                minWidth: isMobile ? '70px' : '90px',
                                height: isMobile ? '35px' : '40px',
                                padding: isMobile ? '6px 8px' : '8px 12px',
                                borderRadius: '8px',
                                backgroundColor: formData[item.key] === option.key ? option.color : `${option.color}40`,
                                color: formData[item.key] === option.key ? 'white' : option.color,
                                border: formData[item.key] === option.key ? '2px solid #1976d2' : '1px solid transparent',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                                fontWeight: 600,
                                fontSize: isMobile ? '0.7rem' : '0.8rem',
                                textAlign: 'center',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: formData[item.key] === option.key ? `0 4px 12px ${option.color}30` : '0 2px 6px rgba(0,0,0,0.08)',
                                transform: formData[item.key] === option.key ? 'scale(1.02)' : 'scale(1)',
                                '&:hover': {
                                  transform: 'scale(1.05)',
                                  boxShadow: `0 4px 15px ${option.color}40`,
                                  backgroundColor: formData[item.key] === option.key ? option.color : `${option.color}60`
                                }
                              }}
                            >
                              {option.label}
                            </Box>
                          ))}
                        </Box>
                      </Box>
                    ))}
                  </Box>
                </QuestionBox>
              </CardContent>
            </SectionCard>
          </Fade>

          {/* Section 7: Work-Life Balance */}
          <Fade in timeout={1800}>
            <SectionCard>
              <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Typography variant="h5" gutterBottom sx={{ color: '#1976d2', fontWeight: 700, mb: 1.5 }}>
                  ⚖️ 7. {t('survey.sections.worklife')}
                </Typography>
                
                {/* Q20 */}
                <QuestionBox hasError={!!validationErrors['q20']} data-question="q20">
                  {renderQuestionTitle('q20', t('survey.questions.q20'))}
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center', mt: 2 }}>
                    {[
                      { key: 'excellent', label: t('survey.options.work_life.excellent'), color: '#4caf50' },
                      { key: 'good', label: t('survey.options.work_life.good'), color: '#8bc34a' },
                      { key: 'fair', label: t('survey.options.work_life.fair'), color: '#ff9800' },
                      { key: 'poor', label: t('survey.options.work_life.poor'), color: '#ff5722' },
                      { key: 'terrible', label: t('survey.options.work_life.terrible'), color: '#f44336' }
                    ].map((option) => (
                      <ColorfulRadioOption
                        key={option.key}
                        selected={formData['q20'] === option.key}
                        color={option.color}
                        onClick={() => handleFieldChange('q20', option.key)}
                      >
                        {option.label}
                      </ColorfulRadioOption>
                    ))}
                  </Box>
                </QuestionBox>

                {/* Q21 */}
                <QuestionBox hasError={!!validationErrors['q21']} data-question="q21">
                  {renderQuestionTitle('q21', t('survey.questions.q21'))}
                  {renderEmojiRating('q21', 'agreement')}
                </QuestionBox>

                {/* Q22 */}
                <QuestionBox hasError={!!validationErrors['q22']} data-question="q22">
                  {renderQuestionTitle('q22', t('survey.questions.q22'))}
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center', mt: 2 }}>
                    {[
                      { key: 'outstanding', label: t('survey.options.wellbeing_support.outstanding'), color: '#4caf50' },
                      { key: 'good', label: t('survey.options.wellbeing_support.good'), color: '#8bc34a' },
                      { key: 'some', label: t('survey.options.wellbeing_support.some'), color: '#ff9800' },
                      { key: 'limited', label: t('survey.options.wellbeing_support.limited'), color: '#ff5722' },
                      { key: 'no_support', label: t('survey.options.wellbeing_support.no_support'), color: '#f44336' }
                    ].map((option) => (
                      <ColorfulRadioOption
                        key={option.key}
                        selected={formData['q22'] === option.key}
                        color={option.color}
                        onClick={() => handleFieldChange('q22', option.key)}
                      >
                        {option.label}
                      </ColorfulRadioOption>
                    ))}
                  </Box>
                </QuestionBox>

                {/* Q22a */}
                <QuestionBox hasError={!!validationErrors['q22a']} data-question="q22a">
                  {renderQuestionTitle('q22a', t('survey.questions.q22a'))}
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    value={formData['q22a'] || ''}
                    onChange={(e) => handleFieldChange('q22a', e.target.value)}
                    placeholder={t('survey.placeholders.text_response')}
                    variant="outlined"
                    error={!!validationErrors['q22a']}
                    helperText={validationErrors['q22a']}
                    sx={{ mt: 1 }}
                  />
                </QuestionBox>

                {/* Q42 - Extra-curricular activities */}
                <QuestionBox hasError={!!validationErrors['q42']} data-question="q42">
                  {renderQuestionTitle('q42', t('survey.questions.q42'))}
                  <Box sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 0.5,
                    mt: 1.5
                  }}>
                    {[
                      { key: 'yes', label: t('survey.options.extracurricular.yes'), emoji: '✅', color: '#4caf50' },
                      { key: 'yes_work_pressure', label: t('survey.options.extracurricular.yes_work_pressure'), emoji: '😓', color: '#ff9800' },
                      { key: 'yes_manager_discourages', label: t('survey.options.extracurricular.yes_manager_discourages'), emoji: '🚫', color: '#ff5722' },
                      { key: 'no_rare_activities', label: t('survey.options.extracurricular.no_rare_activities'), emoji: '📭', color: '#f44336' }
                    ].map((option) => (
                      <Box
                        key={option.key}
                        onClick={() => handleFieldChange('q42', option.key)}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '8px 12px',
                          borderRadius: '12px',
                          backgroundColor: formData['q42'] === option.key ? option.color : `${option.color}40`,
                          color: formData['q42'] === option.key ? 'white' : option.color,
                          border: formData['q42'] === option.key ? '3px solid #1976d2' : '2px solid transparent',
                          cursor: 'pointer',
                          transition: 'all 0.3s ease',
                          boxShadow: formData['q42'] === option.key
                            ? `0 6px 20px ${option.color}80, 0 0 0 2px #fff`
                            : '0 3px 10px rgba(0,0,0,0.1)',
                          transform: formData['q42'] === option.key ? 'scale(1.02)' : 'scale(1)',
                          '&:hover': {
                            transform: 'scale(1.02)',
                            backgroundColor: formData['q42'] === option.key ? option.color : `${option.color}60`,
                            boxShadow: `0 6px 20px ${option.color}60`
                          }
                        }}
                      >
                        <Box sx={{ fontSize: '1.3rem', mr: 1.5, opacity: formData['q42'] === option.key ? 1 : 0.7 }}>{option.emoji}</Box>
                        <Box sx={{ fontSize: '0.9rem', fontWeight: 600, color: formData['q42'] === option.key ? 'white' : '#333' }}>
                          {option.label}
                        </Box>
                      </Box>
                    ))}
                  </Box>
                </QuestionBox>
              </CardContent>
            </SectionCard>
          </Fade>

          {/* Section 8: Innovation & Future Focus */}
          <Fade in timeout={1900}>
            <SectionCard>
              <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Typography variant="h5" gutterBottom sx={{ color: '#1976d2', fontWeight: 700, mb: 1.5 }}>
                  💡 8. {t('survey.sections.innovation')}
                </Typography>
                
                {/* Q23 */}
                <QuestionBox hasError={!!validationErrors['q23']} data-question="q23">
                  {renderQuestionTitle('q23', t('survey.questions.q23'))}
                  <Box sx={{ 
                    display: 'flex', 
                    flexDirection: 'column',
                    gap: 1, 
                    mt: 2 
                  }}>
                    {[
                      { key: 'highly_encouraged', label: t('survey.options.idea_encouragement.highly_encouraged'), emoji: '🌟', color: '#4caf50' },
                      { key: 'somewhat_encouraged', label: t('survey.options.idea_encouragement.somewhat_encouraged'), emoji: '😊', color: '#8bc34a' },
                      { key: 'discouraged', label: t('survey.options.idea_encouragement.discouraged'), emoji: '😕', color: '#ff9800' },
                      { key: 'strongly_discouraged', label: t('survey.options.idea_encouragement.strongly_discouraged'), emoji: '😞', color: '#f44336' }
                    ].map((option) => (
                      <Box
                        key={option.key}
                        onClick={() => handleFieldChange('q23', option.key)}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '12px 16px',
                          borderRadius: '12px',
                          backgroundColor: formData['q23'] === option.key ? option.color : `${option.color}40`,
                          color: formData['q23'] === option.key ? 'white' : option.color,
                          border: formData['q23'] === option.key ? '3px solid #1976d2' : '2px solid transparent',
                          cursor: 'pointer',
                          transition: 'all 0.3s ease',
                          boxShadow: formData['q23'] === option.key 
                            ? `0 6px 20px ${option.color}80, 0 0 0 2px #fff` 
                            : '0 3px 10px rgba(0,0,0,0.1)',
                          transform: formData['q23'] === option.key ? 'scale(1.02)' : 'scale(1)',
                          '&:hover': {
                            transform: 'scale(1.02)',
                            backgroundColor: formData['q23'] === option.key ? option.color : `${option.color}60`,
                            boxShadow: `0 6px 20px ${option.color}60`
                          }
                        }}
                      >
                        <Box sx={{ fontSize: '1.5rem', mr: 2, opacity: formData['q23'] === option.key ? 1 : 0.7 }}>{option.emoji}</Box>
                        <Box sx={{ fontSize: '1rem', fontWeight: 600, color: formData['q23'] === option.key ? 'white' : '#333' }}>
                          {option.label}
                        </Box>
                      </Box>
                    ))}
                  </Box>
                </QuestionBox>

                {/* Q24 */}
                <QuestionBox hasError={!!(validationErrors['q24_market'] || validationErrors['q24_technology'] || validationErrors['q24_innovation'] || validationErrors['q24_digital'])} data-question="q24">
                  {renderQuestionTitle('q24', t('survey.questions.q24'))}
                  
                  <Box sx={{ mt: 2 }}>
                    {[
                      { key: 'q24_market', label: t('survey.questions.q24_market') },
                      { key: 'q24_technology', label: t('survey.questions.q24_technology') },
                      { key: 'q24_innovation', label: t('survey.questions.q24_innovation') },
                      { key: 'q24_digital', label: t('survey.questions.q24_digital') }
                    ].map((item) => (
                      <Box key={item.key} sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        p: 1.5, 
                        mb: 1.5,
                        backgroundColor: '#f8f9ff',
                        borderRadius: '12px',
                        border: '1px solid #e3f2fd',
                        [theme.breakpoints.down('md')]: {
                          flexDirection: 'column',
                          alignItems: 'flex-start',
                          gap: 1
                        }
                      }}>
                        <Typography variant="body1" sx={{ 
                          fontWeight: 500, 
                          minWidth: isMobile ? '100%' : '250px',
                          textAlign: isMobile ? 'center' : 'left',
                          mb: isMobile ? 1 : 0
                        }}>
                          {item.label}
                        </Typography>
                        <Box sx={{ 
                          display: 'flex', 
                          gap: 0.5, 
                          justifyContent: 'center',
                          alignItems: 'center'
                        }}>
                          {[
                            { key: 'leading', label: t('survey.options.capability.leading'), color: '#4caf50' },
                            { key: 'following', label: t('survey.options.capability.following'), color: '#8bc34a' },
                            { key: 'lagging', label: t('survey.options.capability.lagging'), color: '#ff9800' },
                            { key: 'struggling', label: t('survey.options.capability.struggling'), color: '#f44336' }
                          ].map((option) => (
                            <Box
                              key={option.key}
                              onClick={() => handleFieldChange(item.key, option.key)}
                              sx={{
                                padding: isMobile ? '6px 10px' : '8px 12px',
                                borderRadius: '8px',
                                backgroundColor: formData[item.key] === option.key ? option.color : `${option.color}40`,
                                color: formData[item.key] === option.key ? 'white' : option.color,
                                border: formData[item.key] === option.key ? '2px solid #1976d2' : '1px solid transparent',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                                fontWeight: 600,
                                fontSize: isMobile ? '0.75rem' : '0.85rem',
                                minWidth: isMobile ? '70px' : '90px',
                                textAlign: 'center',
                                boxShadow: formData[item.key] === option.key ? `0 4px 12px ${option.color}30` : '0 2px 6px rgba(0,0,0,0.08)',
                                transform: formData[item.key] === option.key ? 'scale(1.02)' : 'scale(1)',
                                '&:hover': {
                                  transform: 'scale(1.05)',
                                  boxShadow: `0 4px 15px ${option.color}40`,
                                  backgroundColor: formData[item.key] === option.key ? option.color : `${option.color}60`
                                }
                              }}
                            >
                              {option.label}
                            </Box>
                          ))}
                        </Box>
                      </Box>
                    ))}
                  </Box>
                </QuestionBox>

                {/* Q25 */}
                <QuestionBox hasError={!!(validationErrors['q25'] || validationErrors['q25_other'])} data-question="q25">
                  {renderQuestionTitle('q25', t('survey.questions.q25'))}
                  <Box sx={{ 
                    display: 'flex', 
                    flexDirection: 'column',
                    gap: 1, 
                    mt: 2 
                  }}>
                    {[
                      { key: 'time_resources', label: t('survey.options.innovation_barriers.time_resources'), emoji: '⏰', color: '#ff9800' },
                      { key: 'risk_averse', label: t('survey.options.innovation_barriers.risk_averse'), emoji: '🛡️', color: '#ff5722' },
                      { key: 'unclear_processes', label: t('survey.options.innovation_barriers.unclear_processes'), emoji: '❓', color: '#9c27b0' },
                      { key: 'insufficient_funding', label: t('survey.options.innovation_barriers.insufficient_funding'), emoji: '💰', color: '#f44336' },
                      { key: 'lack_support', label: t('survey.options.innovation_barriers.lack_support'), emoji: '🚫', color: '#795548' },
                      { key: 'skills_gaps', label: t('survey.options.innovation_barriers.skills_gaps'), emoji: '📚', color: '#607d8b' }
                    ].map((option) => (
                      <Box
                        key={option.key}
                        onClick={() => handleFieldChange('q25', option.key)}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '12px 16px',
                          borderRadius: '12px',
                          backgroundColor: formData['q25'] === option.key ? option.color : `${option.color}40`,
                          color: formData['q25'] === option.key ? 'white' : option.color,
                          border: formData['q25'] === option.key ? '3px solid #1976d2' : '2px solid transparent',
                          cursor: 'pointer',
                          transition: 'all 0.3s ease',
                          boxShadow: formData['q25'] === option.key 
                            ? `0 6px 20px ${option.color}80, 0 0 0 2px #fff` 
                            : '0 3px 10px rgba(0,0,0,0.1)',
                          transform: formData['q25'] === option.key ? 'scale(1.02)' : 'scale(1)',
                          '&:hover': {
                            transform: 'scale(1.02)',
                            backgroundColor: formData['q25'] === option.key ? option.color : `${option.color}60`,
                            boxShadow: `0 6px 20px ${option.color}60`
                          }
                        }}
                      >
                        <Box sx={{ fontSize: '1.5rem', mr: 2, opacity: formData['q25'] === option.key ? 1 : 0.7 }}>{option.emoji}</Box>
                        <Box sx={{ fontSize: '1rem', fontWeight: 600, color: formData['q25'] === option.key ? 'white' : '#333' }}>
                          {option.label}
                        </Box>
                      </Box>
                    ))}
                    
                    {/* Other option with text field */}
                    <Box
                      onClick={() => handleFieldChange('q25', 'other')}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '12px 16px',
                        borderRadius: '12px',
                        backgroundColor: formData['q25'] === 'other' ? '#1976d2' : '#1976d240',
                        color: formData['q25'] === 'other' ? 'white' : '#333',
                        border: formData['q25'] === 'other' ? '3px solid #1976d2' : '2px solid transparent',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        boxShadow: formData['q25'] === 'other' 
                          ? '0 6px 20px #1976d280, 0 0 0 2px #fff' 
                          : '0 3px 10px rgba(0,0,0,0.1)',
                        transform: formData['q25'] === 'other' ? 'scale(1.02)' : 'scale(1)',
                        '&:hover': {
                          transform: 'scale(1.02)',
                          backgroundColor: formData['q25'] === 'other' ? '#1976d2' : '#1976d260',
                          boxShadow: '0 6px 20px #1976d260'
                        }
                      }}
                    >
                      <Box sx={{ fontSize: '1.5rem', mr: 2 }}>🔧</Box>
                      <Box sx={{ fontSize: '1rem', fontWeight: formData['q25'] === 'other' ? 700 : 600, flexGrow: 1 }}>
                        {language === 'hi' ? 'अन्य:' : 'Other:'}
                      </Box>
                    </Box>
                    
                    {formData['q25'] === 'other' && (
                      <TextField
                        fullWidth
                        value={formData['q25_other'] || ''}
                        onChange={(e) => handleFieldChange('q25_other', e.target.value)}
                        placeholder={language === 'hi' ? 'कृपया निर्दिष्ट करें...' : 'Please specify...'}
                        variant="outlined"
                        sx={{ mt: 1 }}
                      />
                    )}
                  </Box>
                </QuestionBox>
              </CardContent>
            </SectionCard>
          </Fade>

          {/* Section 9: Communication & Information Flow */}
          <Fade in timeout={2000}>
            <SectionCard>
              <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Typography variant="h5" gutterBottom sx={{ color: '#1976d2', fontWeight: 700, mb: 1.5 }}>
                  💬 9. {t('survey.sections.communication')}
                </Typography>
                
                {/* Q26 */}
                <QuestionBox hasError={!!validationErrors['q26']} data-question="q26">
                  {renderQuestionTitle('q26', t('survey.questions.q26'))}
                  {renderCheckboxGroup('q26', {
                    email: t('survey.options.communication_preferences.email'),
                    meetings: t('survey.options.communication_preferences.meetings'),
                    notice_board: t('survey.options.communication_preferences.notice_board'),
                    digital_platforms: t('survey.options.communication_preferences.digital_platforms'),
                    video_messages: t('survey.options.communication_preferences.video_messages'),
                    presentations: t('survey.options.communication_preferences.presentations'),
                    one_on_one: t('survey.options.communication_preferences.one_on_one'),
                    anything_else: t('survey.options.communication_preferences.anything_else')
                  })}
                </QuestionBox>

                {/* Q27 */}
                <QuestionBox hasError={!!(validationErrors['q27_strategy'] || validationErrors['q27_changes'] || validationErrors['q27_performance'] || validationErrors['q27_recognition'])} data-question="q27">
                  {renderQuestionTitle('q27', t('survey.questions.q27'))}
                  
                  <Box sx={{ mt: 2 }}>
                    {[
                      { key: 'q27_strategy', label: t('survey.questions.q27_strategy') },
                      { key: 'q27_changes', label: t('survey.questions.q27_changes') },
                      { key: 'q27_performance', label: t('survey.questions.q27_performance') },
                      { key: 'q27_recognition', label: t('survey.questions.q27_recognition') }
                    ].map((item) => (
                      <Box key={item.key} sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        p: 1.5, 
                        mb: 1.5,
                        backgroundColor: '#f8f9ff',
                        borderRadius: '12px',
                        border: '1px solid #e3f2fd',
                        [theme.breakpoints.down('md')]: {
                          flexDirection: 'column',
                          alignItems: 'flex-start',
                          gap: 1
                        }
                      }}>
                        <Typography variant="body1" sx={{ 
                          fontWeight: 500, 
                          minWidth: isMobile ? '100%' : '250px',
                          textAlign: isMobile ? 'center' : 'left',
                          mb: isMobile ? 1 : 0
                        }}>
                          {item.label}
                        </Typography>
                        <Box sx={{ 
                          display: 'flex', 
                          gap: 0.5, 
                          justifyContent: 'center',
                          alignItems: 'center'
                        }}>
                          {[
                            { key: 'excellent', label: t('survey.options.effectiveness.excellent'), color: '#4caf50' },
                            { key: 'good', label: t('survey.options.effectiveness.good'), color: '#8bc34a' },
                            { key: 'fair', label: t('survey.options.effectiveness.fair'), color: '#ff9800' },
                            { key: 'poor', label: t('survey.options.effectiveness.poor'), color: '#f44336' }
                          ].map((option) => (
                            <Box
                              key={option.key}
                              onClick={() => handleFieldChange(item.key, option.key)}
                              sx={{
                                minWidth: isMobile ? '70px' : '90px',
                                height: isMobile ? '35px' : '40px',
                                padding: isMobile ? '6px 8px' : '8px 12px',
                                borderRadius: '8px',
                                backgroundColor: formData[item.key] === option.key ? option.color : `${option.color}40`,
                                color: formData[item.key] === option.key ? 'white' : option.color,
                                border: formData[item.key] === option.key ? '2px solid #1976d2' : '1px solid transparent',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                                fontWeight: 600,
                                fontSize: isMobile ? '0.7rem' : '0.8rem',
                                textAlign: 'center',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: formData[item.key] === option.key ? `0 4px 12px ${option.color}30` : '0 2px 6px rgba(0,0,0,0.08)',
                                transform: formData[item.key] === option.key ? 'scale(1.02)' : 'scale(1)',
                                '&:hover': {
                                  transform: 'scale(1.05)',
                                  boxShadow: `0 4px 15px ${option.color}40`,
                                  backgroundColor: formData[item.key] === option.key ? option.color : `${option.color}60`
                                }
                              }}
                            >
                              {option.label}
                            </Box>
                          ))}
                        </Box>
                      </Box>
                    ))}
                  </Box>
                </QuestionBox>
              </CardContent>
            </SectionCard>
          </Fade>

          {/* Section 10: Recognition & Performance */}
          <Fade in timeout={2100}>
            <SectionCard>
              <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Typography variant="h5" gutterBottom sx={{ color: '#1976d2', fontWeight: 700, mb: 1.5 }}>
                  🏆 10. {t('survey.sections.recognition')}
                </Typography>
                
                {/* Q28 */}
                <QuestionBox hasError={!!validationErrors['q28']} data-question="q28">
                  {renderQuestionTitle('q28', t('survey.questions.q28'))}
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center', mt: 2 }}>
                    {[
                      { key: 'daily', label: t('survey.options.recognition_frequency.daily'), color: '#4caf50' },
                      { key: 'weekly', label: t('survey.options.recognition_frequency.weekly'), color: '#8bc34a' },
                      { key: 'monthly', label: t('survey.options.recognition_frequency.monthly'), color: '#ff9800' },
                      { key: 'quarterly', label: t('survey.options.recognition_frequency.quarterly'), color: '#ff5722' },
                      { key: 'annually', label: t('survey.options.recognition_frequency.annually'), color: '#f44336' },
                      { key: 'rarely', label: t('survey.options.recognition_frequency.rarely'), color: '#f44336' }
                    ].map((option) => (
                      <ColorfulRadioOption
                        key={option.key}
                        selected={formData['q28'] === option.key}
                        color={option.color}
                        onClick={() => handleFieldChange('q28', option.key)}
                      >
                        {option.label}
                      </ColorfulRadioOption>
                    ))}
                  </Box>
                </QuestionBox>

                {/* Q29 */}
                <QuestionBox hasError={!!validationErrors['q29']} data-question="q29">
                  {renderQuestionTitle('q29', t('survey.questions.q29'))}
                  {renderCheckboxGroup('q29', {
                    public_praise: t('survey.options.recognition_forms.public_praise'),
                    thank_you_notes: t('survey.options.recognition_forms.thank_you_notes'),
                    monetary: t('survey.options.recognition_forms.monetary'),
                    development: t('survey.options.recognition_forms.development'),
                    responsibilities: t('survey.options.recognition_forms.responsibilities'),
                    peer_awards: t('survey.options.recognition_forms.peer_awards'),
                    advancement: t('survey.options.recognition_forms.advancement')
                  })}
                </QuestionBox>

                {/* Q30 */}
                <QuestionBox hasError={!!validationErrors['q30']} data-question="q30">
                  {renderQuestionTitle('q30', t('survey.questions.q30'))}
                  <Box sx={{ 
                    display: 'flex', 
                    flexDirection: 'column',
                    gap: 1, 
                    mt: 2 
                  }}>
                    {[
                      { key: 'completely_fair', label: t('survey.options.performance_fairness.completely_fair'), emoji: '😍', color: '#4caf50' },
                      { key: 'mostly_fair', label: t('survey.options.performance_fairness.mostly_fair'), emoji: '😊', color: '#8bc34a' },
                      { key: 'somewhat_fair', label: t('survey.options.performance_fairness.somewhat_fair'), emoji: '😐', color: '#ff9800' },
                      { key: 'unfair', label: t('survey.options.performance_fairness.unfair'), emoji: '😕', color: '#ff5722' },
                      { key: 'very_unfair', label: t('survey.options.performance_fairness.very_unfair'), emoji: '😞', color: '#f44336' }
                    ].map((option) => (
                      <Box
                        key={option.key}
                        onClick={() => handleFieldChange('q30', option.key)}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '12px 16px',
                          borderRadius: '12px',
                          backgroundColor: formData['q30'] === option.key ? option.color : `${option.color}40`,
                          color: formData['q30'] === option.key ? 'white' : option.color,
                          border: formData['q30'] === option.key ? '3px solid #1976d2' : '2px solid transparent',
                          cursor: 'pointer',
                          transition: 'all 0.3s ease',
                          boxShadow: formData['q30'] === option.key 
                            ? `0 6px 20px ${option.color}80, 0 0 0 2px #fff` 
                            : '0 3px 10px rgba(0,0,0,0.1)',
                          transform: formData['q30'] === option.key ? 'scale(1.02)' : 'scale(1)',
                          '&:hover': {
                            transform: 'scale(1.02)',
                            backgroundColor: formData['q30'] === option.key ? option.color : `${option.color}60`,
                            boxShadow: `0 6px 20px ${option.color}60`
                          }
                        }}
                      >
                        <Box sx={{ fontSize: '1.5rem', mr: 2, opacity: formData['q30'] === option.key ? 1 : 0.7 }}>{option.emoji}</Box>
                        <Box sx={{ fontSize: '1rem', fontWeight: 600, color: formData['q30'] === option.key ? 'white' : '#333' }}>
                          {option.label}
                        </Box>
                      </Box>
                    ))}
                  </Box>
                </QuestionBox>

                {/* Q30a */}
                <QuestionBox hasError={!!validationErrors['q30a']} data-question="q30a">
                  {renderQuestionTitle('q30a', t('survey.questions.q30a'))}
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    value={formData['q30a'] || ''}
                    onChange={(e) => handleFieldChange('q30a', e.target.value)}
                    placeholder={t('survey.placeholders.text_response')}
                    variant="outlined"
                    sx={{ mt: 1 }}
                  />
                </QuestionBox>
              </CardContent>
            </SectionCard>
          </Fade>

          {/* Section 11: Onboarding Experience */}
          <Fade in timeout={2200}>
            <SectionCard>
              <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Typography variant="h5" gutterBottom sx={{ color: '#1976d2', fontWeight: 700, mb: 1.5 }}>
                  🎆 11. {t('survey.sections.onboarding')}
                </Typography>
                
                {/* Q31 */}
                <QuestionBox hasError={!!validationErrors['q31']} data-question="q31">
                  {renderQuestionTitle('q31', t('survey.questions.q31'))}
                  <Box sx={{ 
                    display: 'flex', 
                    flexDirection: 'column',
                    gap: 1, 
                    mt: 2 
                  }}>
                    {[
                      { key: 'exceptional', label: t('survey.options.onboarding.exceptional'), emoji: '🌟', color: '#4caf50' },
                      { key: 'good', label: t('survey.options.onboarding.good'), emoji: '😍', color: '#8bc34a' },
                      { key: 'average', label: t('survey.options.onboarding.average'), emoji: '😐', color: '#ff9800' },
                      { key: 'poor', label: t('survey.options.onboarding.poor'), emoji: '😕', color: '#ff5722' },
                      { key: 'terrible', label: t('survey.options.onboarding.terrible'), emoji: '😞', color: '#f44336' }
                    ].map((option) => (
                      <Box
                        key={option.key}
                        onClick={() => handleFieldChange('q31', option.key)}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '12px 16px',
                          borderRadius: '12px',
                          backgroundColor: formData['q31'] === option.key ? option.color : `${option.color}40`,
                          color: formData['q31'] === option.key ? 'white' : '#333',
                          border: formData['q31'] === option.key ? '3px solid #1976d2' : '2px solid transparent',
                          cursor: 'pointer',
                          transition: 'all 0.3s ease',
                          boxShadow: formData['q31'] === option.key 
                            ? `0 6px 20px ${option.color}80, 0 0 0 2px #fff` 
                            : '0 3px 10px rgba(0,0,0,0.1)',
                          transform: formData['q31'] === option.key ? 'scale(1.02)' : 'scale(1)',
                          '&:hover': {
                            transform: 'scale(1.02)',
                            boxShadow: `0 6px 20px ${option.color}60`
                          }
                        }}
                      >
                        <Box sx={{ fontSize: '1.5rem', mr: 2 }}>{option.emoji}</Box>
                        <Box sx={{ fontSize: '1rem', fontWeight: 600, color: formData['q31'] === option.key ? 'white' : '#333' }}>
                          {option.label}
                        </Box>
                      </Box>
                    ))}
                  </Box>
                </QuestionBox>

                {/* Q32 */}
                <QuestionBox hasError={!!validationErrors['q32']} data-question="q32">
                  {renderQuestionTitle('q32', t('survey.questions.q32'))}
                  <Box sx={{ 
                    display: 'flex', 
                    flexDirection: 'column',
                    gap: 1, 
                    mt: 2 
                  }}>
                    {[
                      { key: 'had_everything', label: t('survey.options.resources_training.had_everything'), emoji: '😍', color: '#4caf50' },
                      { key: 'had_most', label: t('survey.options.resources_training.had_most'), emoji: '😊', color: '#8bc34a' },
                      { key: 'missing_few', label: t('survey.options.resources_training.missing_few'), emoji: '😐', color: '#ff9800' },
                      { key: 'did_not_have', label: t('survey.options.resources_training.did_not_have'), emoji: '😞', color: '#f44336' }
                    ].map((option) => (
                      <Box
                        key={option.key}
                        onClick={() => handleFieldChange('q32', option.key)}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '12px 16px',
                          borderRadius: '12px',
                          backgroundColor: formData['q32'] === option.key ? option.color : `${option.color}40`,
                          color: formData['q32'] === option.key ? 'white' : '#333',
                          border: formData['q32'] === option.key ? '3px solid #1976d2' : '2px solid transparent',
                          cursor: 'pointer',
                          transition: 'all 0.3s ease',
                          boxShadow: formData['q32'] === option.key 
                            ? `0 6px 20px ${option.color}80, 0 0 0 2px #fff` 
                            : '0 3px 10px rgba(0,0,0,0.1)',
                          transform: formData['q32'] === option.key ? 'scale(1.02)' : 'scale(1)',
                          '&:hover': {
                            transform: 'scale(1.02)',
                            boxShadow: `0 6px 20px ${option.color}60`
                          }
                        }}
                      >
                        <Box sx={{ fontSize: '1.5rem', mr: 2 }}>{option.emoji}</Box>
                        <Box sx={{ fontSize: '1rem', fontWeight: 600, color: formData['q32'] === option.key ? 'white' : '#333' }}>
                          {option.label}
                        </Box>
                      </Box>
                    ))}
                  </Box>
                </QuestionBox>

              </CardContent>
            </SectionCard>
          </Fade>

          {/* Section 12: Future Outlook */}
          <Fade in timeout={2300}>
            <SectionCard>
              <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Typography variant="h5" gutterBottom sx={{ color: '#1976d2', fontWeight: 700, mb: 1.5 }}>
                  🔮 12. {t('survey.sections.future')}
                </Typography>
                
                {/* Q34 */}
                <QuestionBox hasError={!!validationErrors['q34']} data-question="q34">
                  {renderQuestionTitle('q34', t('survey.questions.q34'))}
                  <Box sx={{ 
                    display: 'flex', 
                    flexDirection: 'column',
                    gap: 1, 
                    mt: 2 
                  }}>
                    {[
                      { key: 'yes_definitely', label: t('survey.options.future_outlook.yes_definitely'), emoji: '😍', color: '#4caf50' },
                      { key: 'probably', label: t('survey.options.future_outlook.probably'), emoji: '😊', color: '#8bc34a' },
                      { key: 'unsure', label: t('survey.options.future_outlook.unsure'), emoji: '😐', color: '#ff9800' },
                      { key: 'probably_not', label: t('survey.options.future_outlook.probably_not'), emoji: '😕', color: '#ff5722' },
                      { key: 'definitely_not', label: t('survey.options.future_outlook.definitely_not'), emoji: '😞', color: '#f44336' }
                    ].map((option) => (
                      <Box
                        key={option.key}
                        onClick={() => handleFieldChange('q34', option.key)}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '12px 16px',
                          borderRadius: '12px',
                          backgroundColor: formData['q34'] === option.key ? option.color : `${option.color}40`,
                          color: formData['q34'] === option.key ? 'white' : '#333',
                          border: formData['q34'] === option.key ? '3px solid #1976d2' : '2px solid transparent',
                          cursor: 'pointer',
                          transition: 'all 0.3s ease',
                          boxShadow: formData['q34'] === option.key 
                            ? `0 6px 20px ${option.color}80, 0 0 0 2px #fff` 
                            : '0 3px 10px rgba(0,0,0,0.1)',
                          transform: formData['q34'] === option.key ? 'scale(1.02)' : 'scale(1)',
                          '&:hover': {
                            transform: 'scale(1.02)',
                            boxShadow: `0 6px 20px ${option.color}60`
                          }
                        }}
                      >
                        <Box sx={{ fontSize: '1.5rem', mr: 2 }}>{option.emoji}</Box>
                        <Box sx={{ fontSize: '1rem', fontWeight: 600, color: formData['q34'] === option.key ? 'white' : '#333' }}>
                          {option.label}
                        </Box>
                      </Box>
                    ))}
                  </Box>
                </QuestionBox>

                {/* Q35 - Conditional: Show only if answered 'Yes' or 'Probably' */}
                {(formData['q34'] === 'yes_definitely' || formData['q34'] === 'probably') && (
                  <QuestionBox hasError={!!(validationErrors['q35'] || validationErrors['q35_other'])} data-question="q35">
                    {renderQuestionTitle('q35', t('survey.questions.q35'))}
                    {renderCheckboxGroup('q35', {
                      meaningful_work: t('survey.options.stay_reasons.meaningful_work'),
                      great_relationships: t('survey.options.stay_reasons.great_relationships'),
                      satisfied_compensation: t('survey.options.stay_reasons.satisfied_compensation'),
                      growth_opportunities: t('survey.options.stay_reasons.growth_opportunities'),
                      believe_mission: t('survey.options.stay_reasons.believe_mission'),
                      culture_fit: t('survey.options.stay_reasons.culture_fit')
                    })}
                    
                    {/* Other option with text field */}
                    <Box sx={{ mt: 2 }}>
                      <Box
                        onClick={() => handleCheckboxChange('q35_other_selected', !formData['q35_other_selected'])}
                        sx={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          padding: '8px 12px',
                          borderRadius: '12px',
                          backgroundColor: formData['q35_other_selected'] ? '#1976d2' : '#f5f5f5',
                          color: formData['q35_other_selected'] ? 'white' : '#333',
                          border: `2px solid ${formData['q35_other_selected'] ? '#1976d2' : '#e0e0e0'}`,
                          cursor: 'pointer',
                          transition: 'all 0.3s ease',
                          fontWeight: 600,
                          fontSize: '0.9rem',
                          boxShadow: formData['q35_other_selected'] ? '0 4px 12px #1976d230' : '0 2px 6px rgba(0,0,0,0.08)',
                          transform: formData['q35_other_selected'] ? 'scale(1.01)' : 'scale(1)',
                          '&:hover': {
                            transform: 'scale(1.03)',
                            boxShadow: '0 6px 18px #1976d240',
                            backgroundColor: formData['q35_other_selected'] ? '#1976d2' : '#eeeeee'
                          }
                        }}
                      >
                        {formData['q35_other_selected'] && '✓ '}{language === 'hi' ? 'अन्य:' : 'Other:'}
                      </Box>
                      
                      {formData['q35_other_selected'] && (
                        <TextField
                          fullWidth
                          value={formData['q35_other'] || ''}
                          onChange={(e) => handleFieldChange('q35_other', e.target.value)}
                          placeholder={language === 'hi' ? 'कृपया निर्दिष्ट करें...' : 'Please specify...'}
                          variant="outlined"
                          sx={{ mt: 1 }}
                        />
                      )}
                    </Box>
                  </QuestionBox>
                )}

                {/* Q36 - Conditional: Show only if NOT planning to stay */}
                {(formData['q34'] && formData['q34'] !== 'yes_definitely' && formData['q34'] !== 'probably') && (
                  <QuestionBox hasError={!!validationErrors['q36_other']} data-question="q36">
                    {renderQuestionTitle('q36', t('survey.questions.q36'))}
                  {renderCheckboxGroup('q36', {
                    compensation_concerns: t('survey.options.leaving_factors.compensation_concerns'),
                    lack_growth: t('survey.options.leaving_factors.lack_growth'),
                    management_issues: t('survey.options.leaving_factors.management_issues'),
                    work_not_engaging: t('survey.options.leaving_factors.work_not_engaging'),
                    culture_issues: t('survey.options.leaving_factors.culture_issues'),
                    better_opportunities: t('survey.options.leaving_factors.better_opportunities'),
                    work_life_balance: t('survey.options.leaving_factors.work_life_balance')
                  })}
                  
                  {/* Other option with text field */}
                  <Box sx={{ mt: 2 }}>
                    <Box
                      onClick={() => handleCheckboxChange('q36_other_selected', !formData['q36_other_selected'])}
                      sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        padding: '8px 12px',
                        borderRadius: '12px',
                        backgroundColor: formData['q36_other_selected'] ? '#1976d2' : '#f5f5f5',
                        color: formData['q36_other_selected'] ? 'white' : '#333',
                        border: `2px solid ${formData['q36_other_selected'] ? '#1976d2' : '#e0e0e0'}`,
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        fontWeight: 600,
                        fontSize: '0.9rem',
                        boxShadow: formData['q36_other_selected'] ? '0 4px 12px #1976d230' : '0 2px 6px rgba(0,0,0,0.08)',
                        transform: formData['q36_other_selected'] ? 'scale(1.01)' : 'scale(1)',
                        '&:hover': {
                          transform: 'scale(1.03)',
                          boxShadow: '0 6px 18px #1976d240',
                          backgroundColor: formData['q36_other_selected'] ? '#1976d2' : '#eeeeee'
                        }
                      }}
                    >
                      {formData['q36_other_selected'] && '✓ '}{language === 'hi' ? 'अन्य:' : 'Other:'}
                    </Box>
                    
                    {formData['q36_other_selected'] && (
                      <TextField
                        fullWidth
                        value={formData['q36_other'] || ''}
                        onChange={(e) => handleFieldChange('q36_other', e.target.value)}
                        placeholder={language === 'hi' ? 'कृपया निर्दिष्ट करें...' : 'Please specify...'}
                        variant="outlined"
                        sx={{ mt: 1 }}
                      />
                    )}
                  </Box>
                </QuestionBox>
                )}
              </CardContent>
            </SectionCard>
          </Fade>

          {/* Section 13: Open-ended Insights */}
          <Fade in timeout={1400}>
            <SectionCard>
              <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Typography variant="h5" gutterBottom sx={{ color: '#1976d2', fontWeight: 700, mb: 1.5 }}>
                  📝 13. {t('survey.sections.insights')}
                </Typography>
                
                {/* Q37, Q38 */}
                {[37, 38].map((qNum) => (
                  <QuestionBox key={qNum} hasError={!!validationErrors[`q${qNum}`]} data-question={`q${qNum}`}>
                    {renderQuestionTitle(`q${qNum}`, t(`survey.questions.q${qNum}`))}
                    <TextField
                      fullWidth
                      multiline
                      rows={3}
                      value={formData[`q${qNum}`] || ''}
                      onChange={(e) => handleFieldChange(`q${qNum}`, e.target.value)}
                      placeholder={t('survey.placeholders.text_response')}
                      variant="outlined"
                      sx={{ mt: 1 }}
                    />
                  </QuestionBox>
                ))}

                {/* Q39 - 2 separate mandatory boxes */}
                <QuestionBox hasError={!!(validationErrors['q39_1'] || validationErrors['q39_2'])} data-question="q39">
                  {renderQuestionTitle('q39', t('survey.questions.q39'))}
                  {[1, 2].map((num) => (
                    <TextField
                      key={num}
                      fullWidth
                      required
                      value={formData[`q39_${num}`] || ''}
                      onChange={(e) => handleFieldChange(`q39_${num}`, e.target.value)}
                      placeholder={language === 'hi' ? `${num}. कृपया अपना उत्तर प्रदान करें...` : `${num}. Please provide your response...`}
                      variant="outlined"
                      sx={{ mt: 1, mb: 1 }}
                    />
                  ))}
                </QuestionBox>

                {/* Q40 - 2 separate mandatory boxes */}
                <QuestionBox hasError={!!(validationErrors['q40_1'] || validationErrors['q40_2'])} data-question="q40">
                  {renderQuestionTitle('q40', t('survey.questions.q40'))}
                  {[1, 2].map((num) => (
                    <TextField
                      key={num}
                      fullWidth
                      required
                      value={formData[`q40_${num}`] || ''}
                      onChange={(e) => handleFieldChange(`q40_${num}`, e.target.value)}
                      placeholder={language === 'hi' ? `${num}. कृपया अपना उत्तर प्रदान करें...` : `${num}. Please provide your response...`}
                      variant="outlined"
                      sx={{ mt: 1, mb: 1 }}
                    />
                  ))}
                </QuestionBox>

                {/* Q41 */}
                <QuestionBox hasError={!!validationErrors['q41']} data-question="q41">
                  {renderQuestionTitle('q41', t('survey.questions.q41'))}
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    value={formData['q41'] || ''}
                    onChange={(e) => handleFieldChange('q41', e.target.value)}
                    placeholder={t('survey.placeholders.text_response')}
                    variant="outlined"
                    sx={{ mt: 1 }}
                  />
                </QuestionBox>
              </CardContent>
            </SectionCard>
          </Fade>

          {/* Submit Buttons */}
          <Zoom in timeout={1600}>
            <Paper 
              elevation={6}
              sx={{
                p: 2.5,
                textAlign: 'center',
                background: 'linear-gradient(135deg, #f8f9ff 0%, #e3f2fd 100%)',
                borderRadius: '15px',
                border: '2px solid #e8eaf6'
              }}
            >
              <Typography variant="h6" gutterBottom sx={{ color: '#1976d2', fontWeight: 600 }}>
                {language === 'hi' ? 'जमा करने के लिए तैयार? 🚀' : 'Ready to submit? 🚀'}
              </Typography>
              <Typography variant="body2" sx={{ mb: 2, color: '#666' }}>
                {language === 'hi' ? 'आपके मूल्यवान फीडबैक साझा करने के लिए धन्यवाद!' : 'Thank you for sharing your valuable feedback!'}
              </Typography>
              
              <Box display="flex" justifyContent="center" gap={3} flexWrap="wrap">
                <Button
                  variant="contained"
                  size="medium"
                  type="submit"
                  disabled={isSubmitting}
                  startIcon={isSubmitting ? <CircularProgress size={18} color="inherit" /> : <SendIcon />}
                  sx={{ 
                    minWidth: 160,
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
                    },
                    '&:disabled': {
                      background: '#ccc',
                      transform: 'none'
                    }
                  }}
                >
                  {isSubmitting ? (language === 'hi' ? 'जमा कर रहे हैं...' : 'Submitting...') : t('survey.submit')}
                </Button>
                
                <Button
                  variant="outlined"
                  size="medium"
                  onClick={handleReset}
                  startIcon={<RefreshIcon />}
                  sx={{ 
                    minWidth: 160,
                    height: 48,
                    borderRadius: '24px',
                    fontSize: '1rem',
                    fontWeight: 600,
                    textTransform: 'none',
                    borderColor: '#f50057',
                    color: '#f50057',
                    borderWidth: 2,
                    '&:hover': {
                      borderColor: '#c51162',
                      backgroundColor: 'rgba(245, 0, 87, 0.04)',
                      transform: 'translateY(-1px)',
                      borderWidth: 2
                    }
                  }}
                >
                  {t('survey.reset')}
                </Button>
              </Box>
            </Paper>
          </Zoom>
        </form>
      </SurveyContainer>
      )}

      {/* Footer */}
      <Box
        component="footer"
        sx={{
          background: 'linear-gradient(135deg, #263238 0%, #37474f 100%)',
          color: 'white',
          padding: theme.spacing(2),
          textAlign: 'center',
          marginTop: 3
        }}
      >
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
          {t('footer.thank_you')}
        </Typography>
        <Typography variant="body2" sx={{ opacity: 0.8 }}>
          {t('footer.version')} 2024.1.0 | {t('footer.copyright')}
        </Typography>
      </Box>

      {/* Success Snackbar */}
      <Snackbar
        open={showSuccess}
        autoHideDuration={6000}
        onClose={() => setShowSuccess(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setShowSuccess(false)} 
          severity="success"
          sx={{ borderRadius: '12px', fontSize: '1.1rem' }}
        >
          🎉 {language === 'hi' ? 'सर्वेक्षण सफलतापूर्वक जमा किया गया! आपके मूल्यवान फीडबैक के लिए धन्यवाद।' : 'Survey submitted successfully! Thank you for your valuable feedback.'}
        </Alert>
      </Snackbar>

      {/* Error Snackbar */}
      <Snackbar
        open={showError}
        autoHideDuration={6000}
        onClose={() => setShowError(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setShowError(false)} 
          severity="error"
          sx={{ borderRadius: '12px', fontSize: '1.1rem' }}
        >
          ❌ {errorMessage}
        </Alert>
      </Snackbar>

      {/* Max Selection Alert Snackbar */}
      <Snackbar
        open={showMaxSelectionAlert}
        autoHideDuration={4000}
        onClose={() => setShowMaxSelectionAlert(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setShowMaxSelectionAlert(false)} 
          severity="warning"
          sx={{ borderRadius: '12px', fontSize: '1.1rem' }}
        >
          ⚠️ {errorMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default BELSurvey2024;
