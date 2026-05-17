import React, { useState, useEffect } from 'react';
import apiService from '../../services/api';
import belRobustService from '../../services/belRobustService';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Grid,
  Alert,
  CircularProgress,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Container,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ContentCopy as CopyIcon } from '@mui/icons-material';
import belLogo from '../assets/bel_logo.png';

// Create a theme for the BEL scan QR page
const belTheme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 600,
    },
    h5: {
      fontWeight: 600,
    },
    subtitle1: {
      fontWeight: 500,
    },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          textTransform: 'none',
          fontWeight: 500,
        },
      },
    },
  },
});

const formatDateToIST = (date) =>
  date.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

const BELScanQRPage = () => {
  const [formData, setFormData] = useState({
    candidateName: '',
    mobileNumber: '',
    email: '',
    completionYear: '',
    location: '',
    postAppliedFor: '',
    qualification: '',
    specialization: '',
    percentageInQualifyingDegree: '',
    category: '',
    dateOfBirth: null,
    pwbd: '',
    challanNumber: ''
  });

  const [formConfig, setFormConfig] = useState(null);
  const [selectedPost, setSelectedPost] = useState(null);

  const [findData, setFindData] = useState({
    mobileNumber: '',
    dateOfBirth: null
  });

  const [loading, setLoading] = useState(false);
  const [findLoading, setFindLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [rollNumber, setRollNumber] = useState('');
  const [foundCandidate, setFoundCandidate] = useState(null);
  const [foundCandidates, setFoundCandidates] = useState([]);
  const [multipleResults, setMultipleResults] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [nameError, setNameError] = useState(false);
  const [mobileError, setMobileError] = useState(false);
  const [emailError, setEmailError] = useState(false);
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [successRollNumber, setSuccessRollNumber] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
  
  // Get registration status from backend
  const [isRegistrationClosed, setIsRegistrationClosed] = useState(false);

  // Load form configuration and registration status on component mount
  useEffect(() => {
    loadFormConfiguration();
    loadRegistrationStatus();
  }, []);

  // Load registration status from backend
  const loadRegistrationStatus = async () => {
    try {
      const response = await apiService.get('/bel/config/registration-status');
      if (response.success && response.data !== undefined) {
        setIsRegistrationClosed(response.data);
      }
    } catch (error) {
      console.error('Error loading registration status:', error);
      // If API fails, default to false (open) - user can retry
      setIsRegistrationClosed(false);
    }
  };

  // Poll backend for changes every 5 seconds
  useEffect(() => {
    const interval = setInterval(loadRegistrationStatus, 5000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  // Debug formData changes
  useEffect(() => {
  }, [formData]);

  // Debug selectedPost changes
  useEffect(() => {
    if (selectedPost && formConfig) {
      const getAvailableLocations = () => {
        if (!formConfig) {
          return [];
        }
        
        if (!selectedPost) {
          return [];
        }
        
        const locations = belRobustService.getLocationsForPost(formConfig, selectedPost.valueCode);
        return locations;
      };
      getAvailableLocations();
    }
  }, [selectedPost, formConfig]);

  /**
   * Check if a field should be visible based on selected post configuration
   * and available active options
   */
  const isFieldVisible = (fieldName) => {
    // First, check if field has any active options (for dropdowns)
    if (fieldName === 'location' && formConfig) {
      const availableLocations = getAvailableLocations();
      if (!availableLocations || availableLocations.length === 0) {
        // If no active locations available, hide the field
        return false;
      }
    }

    if (fieldName === 'specialization' && formConfig && selectedPost) {
      const availableSpecs = formConfig.specializations[selectedPost.valueCode] || [];
      if (!availableSpecs || availableSpecs.length === 0) {
        // If no active specializations available, hide the field
        return false;
      }
    }

    // Then check post configuration
    if (selectedPost) {
      // Check hideFields array first
      if (selectedPost.hideFields && Array.isArray(selectedPost.hideFields)) {
        if (selectedPost.hideFields.includes(fieldName)) {
          return false;
        }
      }

      // Check showFields object
      if (selectedPost.showFields && typeof selectedPost.showFields === 'object') {
        // If field is explicitly defined in showFields, use that value
        if (fieldName in selectedPost.showFields) {
          return selectedPost.showFields[fieldName] === true;
        }
      }
    }

    // Default to visible
    return true;
  };

  /**
   * Check if a field is required based on selected post configuration
   */
  const isFieldRequired = (fieldName) => {
    if (!selectedPost) {
      // Default required fields
      return ['candidateName', 'mobileNumber', 'email', 'category', 'dateOfBirth', 
              'postAppliedFor', 'qualification', 'specialization', 'percentageInQualifyingDegree', 'completionYear', 'pwbd'].includes(fieldName);
    }

    // Check if field is in optionalFields
    if (selectedPost.optionalFields && Array.isArray(selectedPost.optionalFields)) {
      if (selectedPost.optionalFields.includes(fieldName)) {
        return false;
      }
    }

    // Check if field is in requiredFields
    if (selectedPost.requiredFields && Array.isArray(selectedPost.requiredFields)) {
      return selectedPost.requiredFields.includes(fieldName);
    }

    // Default required fields
    return ['candidateName', 'mobileNumber', 'email', 'category', 'dateOfBirth', 
            'postAppliedFor', 'specialization', 'percentageInQualifyingDegree', 'completionYear', 'pwbd'].includes(fieldName);
  };

  /**
   * Get custom field label from post configuration
   */
  const getFieldLabel = (fieldName, defaultLabel) => {
    if (selectedPost && selectedPost.fieldLabels && selectedPost.fieldLabels[fieldName]) {
      return selectedPost.fieldLabels[fieldName];
    }
    return defaultLabel;
  };

  /**
   * Get custom placeholder from post configuration
   */
  const getFieldPlaceholder = (fieldName, defaultPlaceholder) => {
    if (selectedPost && selectedPost.placeholders && selectedPost.placeholders[fieldName]) {
      return selectedPost.placeholders[fieldName];
    }
    return defaultPlaceholder;
  };

  const loadFormConfiguration = async () => {
    try {
      const response = await belRobustService.getFormConfiguration();
      if (response.success && response.data) {
        const parsedConfig = belRobustService.parseFormConfiguration(response.data);
        setFormConfig(parsedConfig);
      } else {
        console.error('Failed to load form configuration:', response.message);
      }
    } catch (error) {
      console.error('Error loading form configuration:', error);
    }
  };

  const handlePostChange = (postValueCode) => {
    
    if (!formConfig || !formConfig.posts) {
      console.warn('⚠️ formConfig or posts not available yet');
      return;
    }
    
    const post = formConfig.posts.find(p => p.valueCode === postValueCode);
    if (post) {
      setSelectedPost(post);
      setFormData(prev => {
        const updated = {
          ...prev,
          postAppliedFor: post.valueName,
          qualification: post.qualificationRequired || 'Not specified',
          specialization: '', // Reset specialization when post changes
          location: '' // Reset location when post changes to trigger hierarchical filtering
        };
        return updated;
      });
    } else {
      console.warn('⚠️ Post not found for valueCode:', postValueCode);
    }
  };

  const handleInputChange = (field, value) => {
    // Filter mobile number input to only allow numeric characters and limit to 10 digits
    let processedValue = value;
    if (field === 'mobileNumber') {
      processedValue = value.replace(/[^0-9]/g, '').slice(0, 10);
    }

    setFormData(prev => {
      const updatedData = {
        ...prev,
        [field]: processedValue
      };

      // If location is changed, handle post selection logic
      if (field === 'location') {
        if (processedValue === 'Ahmedabad') {
          // For Ahmedabad, automatically set post to Project Engineer-I
          updatedData.postAppliedFor = 'Project Engineer-I';
        } else if (processedValue === 'Bhopal') {
          // For Bhopal, clear post selection so user can choose
          updatedData.postAppliedFor = '';
        } else {
          // For no location selected, clear post
          updatedData.postAppliedFor = '';
        }
      }

      return updatedData;
    });

    // Real-time validation
    if (field === 'candidateName') {
      const nameRegex = /^[A-Za-z\s]+$/;
      setNameError(processedValue.trim() !== '' && !nameRegex.test(processedValue.trim()));
    }
    if (field === 'mobileNumber') {
      // Validate format: must be exactly 10 digits
      const mobileRegex = /^[0-9]{10}$/;
      setMobileError(processedValue.trim() !== '' && !mobileRegex.test(processedValue.trim()));
    }
    if (field === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      setEmailError(processedValue.trim() !== '' && !emailRegex.test(processedValue.trim()));
    }
  };

  // Get available locations based on selected post
  const getAvailableLocations = () => {
    
    if (!formConfig) {
      return [];
    }
    
    if (!selectedPost) {
      return [];
    }
    
    const locations = belRobustService.getLocationsForPost(formConfig, selectedPost.valueCode);
    return locations;
  };

  const handleFindInputChange = (field, value) => {
    setFindData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateForm = () => {
    // Simple name validation
    if (!formData.candidateName.trim()) {
      setMessage('Please enter candidate name');
      setMessageType('error');
      setSnackbarOpen(true);
      return false;
    }

    // Mobile number validation - must be exactly 10 digits
    if (!formData.mobileNumber.trim()) {
      setMessage('Please enter mobile number');
      setMessageType('error');
      setSnackbarOpen(true);
      return false;
    }
    
    // Validate 10-digit mobile number format
    const mobileRegex = /^[0-9]{10}$/;
    if (!mobileRegex.test(formData.mobileNumber.trim())) {
      setMessage('Mobile number should be exactly 10 digits (numbers only)');
      setMessageType('error');
      setSnackbarOpen(true);
      return false;
    }

    // Email validation
    if (!formData.email.trim()) {
      setMessage('Please enter email address');
      setMessageType('error');
      setSnackbarOpen(true);
      return false;
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      setMessage('Please enter a valid email address (e.g., example@domain.com)');
      setMessageType('error');
      setSnackbarOpen(true);
      return false;
    }

    // Simple completion year validation
    if (!formData.completionYear.trim()) {
      setMessage('Please enter completion year');
      setMessageType('error');
      setSnackbarOpen(true);
      return false;
    }

    // Post validation
    if (!selectedPost || !selectedPost.valueCode) {
      setMessage('Please select post applied for');
      setMessageType('error');
      setSnackbarOpen(true);
      return false;
    }

    // Location validation - only if field is visible
    if (isFieldVisible('location') && isFieldRequired('location') && !formData.location.trim()) {
      setMessage('Please select location');
      setMessageType('error');
      setSnackbarOpen(true);
      return false;
    }

    if (!formData.specialization.trim()) {
      setMessage('Please select specialization');
      setMessageType('error');
      setSnackbarOpen(true);
      return false;
    }

    if (!formData.percentageInQualifyingDegree || !formData.percentageInQualifyingDegree.trim()) {
      setMessage('Please enter percentage in qualifying degree');
      setMessageType('error');
      setSnackbarOpen(true);
      return false;
    }

    // Validate percentage is a valid number between 0 and 100
    const percentage = parseFloat(formData.percentageInQualifyingDegree);
    if (isNaN(percentage) || percentage < 0 || percentage > 100) {
      setMessage('Please enter a valid percentage between 0 and 100');
      setMessageType('error');
      setSnackbarOpen(true);
      return false;
    }

    if (!formData.category.trim()) {
      setMessage('Please select category');
      setMessageType('error');
      setSnackbarOpen(true);
      return false;
    }
    if (!formData.dateOfBirth) {
      setMessage('Please select date of birth');
      setMessageType('error');
      setSnackbarOpen(true);
      return false;
    }

    if (!formData.pwbd.trim()) {
      setMessage('Please select PwBD status');
      setMessageType('error');
      setSnackbarOpen(true);
      return false;
    }

    // E-Challan validation - mandatory except for SC/ST/PwBD
    const isExempted = formData.category === 'SC' || formData.category === 'ST' || formData.pwbd === 'Yes';
    if (!isExempted && !formData.challanNumber.trim()) {
      setMessage('Please enter E-Challan Number (exempted for SC/ST/PwBD candidates)');
      setMessageType('error');
      setSnackbarOpen(true);
      return false;
    }

    return true;
  };

  const validateFindForm = () => {
    const mobileRegex = /^[0-9]{10}$/;
    if (!findData.mobileNumber.trim()) {
      setMessage('Please enter mobile number');
      setMessageType('error');
      setSnackbarOpen(true);
      return false;
    }
    if (!mobileRegex.test(findData.mobileNumber.trim())) {
      setMessage('Mobile number should be exactly 10 digits (numbers only)');
      setMessageType('error');
      setSnackbarOpen(true);
      return false;
    }
    if (!findData.dateOfBirth) {
      setMessage('Please select date of birth');
      setMessageType('error');
      setSnackbarOpen(true);
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setMessage('');

    try {
      const result = await belRobustService.registerCandidate({
        candidateName: formData.candidateName,
        mobileNumber: formData.mobileNumber,
        email: formData.email,
        completionYear: formData.completionYear,
        location: formData.location,
        postAppliedFor: selectedPost.valueName, // Use selectedPost instead of formData
        qualification: formData.qualification,
        specialization: formData.specialization,
        percentageInQualifyingDegree: formData.percentageInQualifyingDegree,
        category: formData.category,
        dateOfBirth: formatDateToIST(formData.dateOfBirth),
        challanNumber: formData.challanNumber, // E-Challan number from form
        pwbd: formData.pwbd
      });

      // Check if registration was successful (success: true with statusCode: 200)
      if (result.success && result.statusCode === 200 && result.data && result.data.rollNumber) {
        setSuccessRollNumber(result.data.rollNumber);
        setSuccessDialogOpen(true);
      } else if (result.success && result.statusCode === 200) {
        setMessage(result.message || 'Registration successful!');
        setMessageType('success');
        setSnackbarOpen(true);
      } else {
        setMessage(result.message || 'Registration failed');
        setMessageType('error');
        setSnackbarOpen(true);
      }
    } catch (error) {
      setMessage('Network error occurred');
      setMessageType('error');
      setSnackbarOpen(true);
    } finally {
      setLoading(false);
    }
  };

  const handleFindRollNumber = async () => {
    if (!validateFindForm()) return;

    setFindLoading(true);
    setMessage('');
    setFoundCandidate(null);
    setFoundCandidates([]);
    setMultipleResults(false);

    try {
      const result = await apiService.post('/bel/scanqr/find', {
        mobileNumber: findData.mobileNumber,
        dateOfBirth: formatDateToIST(findData.dateOfBirth)
      });

      // Check if we have multiple candidates
      if (result.success && result.data && result.data.candidates) {
        // Multiple candidates found
        setFoundCandidates(result.data.candidates);
        setMultipleResults(true);
        setMessage(result.data.message || 'Multiple candidates found!');
        setMessageType('success');
        setSnackbarOpen(true);
      } else if (result.success && result.data && result.statusCode !== 404) {
        // Single candidate found
        setFoundCandidate(result.data);
        setMultipleResults(false);
        setMessage('Candidate found successfully!');
        setMessageType('success');
        setSnackbarOpen(true);
      } else if (result.success && result.statusCode === 404) {
        setMessage('Candidate not found. Please register first.');
        setMessageType('error');
        setSnackbarOpen(true);
      } else {
        setMessage(result.message || 'No candidate found. Please register first.');
        setMessageType('error');
        setSnackbarOpen(true);
      }
    } catch (error) {
      setMessage('Network error occurred');
      setMessageType('error');
      setSnackbarOpen(true);
    } finally {
      setFindLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      candidateName: '',
      mobileNumber: '',
      email: '',
      completionYear: '',
      location: '',
      postAppliedFor: '',
      qualification: '',
      specialization: '',
      percentageInQualifyingDegree: '',
      category: '',
      dateOfBirth: null,
      pwbd: '',
      challanNumber: ''
    });
    setSelectedPost(null); // Reset selected post
    setRollNumber('');
    setMessage('');
    // Reset error states
    setNameError(false);
    setMobileError(false);
    setEmailError(false);
  };

  const resetFindForm = () => {
    setFindData({
      mobileNumber: '',
      dateOfBirth: null
    });
    setFoundCandidate(null);
    setFoundCandidates([]);
    setMultipleResults(false);
    setMessage('');
  };

  const handleCopyRollNumber = async () => {
    try {
      const rollNumberText = `Registration Number - ${successRollNumber}`;
      await navigator.clipboard.writeText(rollNumberText);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error('Failed to copy registration number:', error);
    }
  };

  const handleCloseSuccessDialog = () => {
    setSuccessDialogOpen(false);
    setSuccessRollNumber('');
    resetForm();
  };

  // If registration is closed, show closure message
  if (isRegistrationClosed) {
    return (
      <ThemeProvider theme={belTheme}>
        <CssBaseline />
        <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5', py: 3, display: 'flex', flexDirection: 'column' }}>
          <Container maxWidth="md" sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Box sx={{ 
              border: '2px solid #dc004e', 
              borderRadius: 2, 
              p: 4, 
              bgcolor: 'white',
              boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
              textAlign: 'center',
              maxWidth: '600px',
              width: '100%'
            }}>
              {/* Header */}
              <Box sx={{ mb: 4 }}>
                <img 
                  src={belLogo} 
                  alt="BEL Logo" 
                  style={{ height: '60px', marginBottom: '16px' }}
                />
                <Typography variant="h4" component="h1" gutterBottom color="#dc004e">
                  Registration Closed
                </Typography>
              </Box>

              {/* Closure Message */}
              <Card sx={{ bgcolor: '#ffebee', border: '1px solid #f44336' }}>
                <CardContent>
                  <Typography variant="h5" sx={{ color: '#c62828', fontWeight: 'bold' }}>
                    Registration has been closed now
                  </Typography>
                </CardContent>
              </Card>
            </Box>
          </Container>
          
          {/* Footer */}
          <Box sx={{ 
            mt: 'auto', 
            py: 2, 
            bgcolor: '#1976d2', 
            color: 'white',
            textAlign: 'center',
            borderTop: '2px solid #1565c0'
          }}>
            <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
              Bharat Electronics Limited
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              Version 2.5
            </Typography>
          </Box>
        </Box>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={belTheme}>
      <CssBaseline />
      <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5', py: 3, display: 'flex', flexDirection: 'column' }}>
        <Container maxWidth="md" sx={{ flex: 1 }}>
          <Box sx={{ 
            border: '2px solid #1976d2', 
            borderRadius: 2, 
            p: 3, 
            bgcolor: 'white',
            boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
          }}>
          {/* Header */}
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <img 
              src={belLogo} 
              alt="BEL Logo" 
              style={{ height: '60px', marginBottom: '16px' }}
            />
            <Typography variant="h4" component="h1" gutterBottom>
              Walk-In Selection for the Post of Trainee Engineer-I/Trainee Officer-I for BEL-GAD
            </Typography>
          </Box>

          {/* Registration Form */}
          <Card sx={{ mb: 4, border: '1px solid #e0e0e0' }}>
            <CardContent>
              <Typography variant="h5" gutterBottom sx={{ mb: 3, color: '#1976d2' }}>
                उम्मीदवार पंजीकृत करें / Register Candidate
              </Typography>
              
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="उम्मीदवार का नाम / Name of candidate"
                      value={formData.candidateName}
                      onChange={(e) => handleInputChange('candidateName', e.target.value)}
                      inputProps={{ 
                        pattern: '[A-Za-z\\s]+',
                        title: 'Only letters and spaces are allowed'
                      }}
                      helperText="केवल अक्षर और स्थान की अनुमति है/Only letters and spaces allowed)"
                      error={nameError}
                      required
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="मोबाइल नं. / Mobile no"
                      value={formData.mobileNumber}
                      onChange={(e) => handleInputChange('mobileNumber', e.target.value)}
                      inputProps={{
                        maxLength: 10,
                        pattern: '[0-9]{10}',
                        title: 'Only 10 digits allowed'
                      }}
                      helperText="वास्तविक 10 अंकों मे/Exactly 10 Digit required"
                      error={mobileError}
                      required
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="ई-मेल आईडी / Email ID"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      error={emailError}
                      helperText={
                        emailError 
                          ? 'कृपया वैध ई-मेल पता दर्ज करें (जैसे: example@domain.com) / Please enter a valid email address (e.g., example@domain.com)'
                          : 'कृपया वैध ई-मेल पता दर्ज करें। / Please enter a valid email address'
                      }
                      required
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth required>
                      <InputLabel>वर्ग / Category</InputLabel>
                      <Select
                        value={formData.category}
                        label="वर्ग / Category"
                        onChange={(e) => handleInputChange('category', e.target.value)}
                      >
                        {formConfig && formConfig.categories ? 
                          formConfig.categories.map((category) => (
                            <MenuItem key={category} value={category}>
                              {category}
                            </MenuItem>
                          )) : (
                            // Fallback to hardcoded values if config not loaded
                            [
                              <MenuItem key="GEN" value="GEN">GEN</MenuItem>,
                              <MenuItem key="OBC" value="OBC">OBC</MenuItem>,
                              <MenuItem key="EWS" value="EWS">EWS</MenuItem>,
                              <MenuItem key="SC" value="SC">SC</MenuItem>,
                              <MenuItem key="ST" value="ST">ST</MenuItem>
                            ]
                          )
                        }
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <DatePicker
                      label="जन्म तिथि / Date of birth"
                      value={formData.dateOfBirth}
                      onChange={(newValue) => handleInputChange('dateOfBirth', newValue)}
                      renderInput={(params) => <TextField {...params} fullWidth required />}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth required>
                      <InputLabel>पद के लिए आवेदन / Post applied for</InputLabel>
                      <Select
                        value={selectedPost?.valueCode || ''}
                        label="पद के लिए आवेदन / Post applied for"
                        onChange={(e) => {
                          handlePostChange(e.target.value);
                        }}
                      >
                        {formConfig && formConfig.posts ? 
                          formConfig.posts.map((post) => (
                            <MenuItem key={post.valueCode} value={post.valueCode}>
                              {post.valueName}
                            </MenuItem>
                          )) : (
                            // Fallback to hardcoded values if config not loaded
                            [
                              <MenuItem key="pe1" value="Project Engineer-I">Project Engineer-I</MenuItem>,
                              <MenuItem key="foe" value="Field Operation Engineer">Field Operation Engineer</MenuItem>
                            ]
                          )
                        }
                      </Select>
                    </FormControl>
                  </Grid>
                  {isFieldVisible('location') && (
                    <Grid item xs={12} md={6}>
                      <FormControl fullWidth required={isFieldRequired('location')}>
                        <InputLabel>{getFieldLabel('location', 'स्थान / Location')}</InputLabel>
                        <Select
                          value={formData.location}
                          label={getFieldLabel('location', 'स्थान / Location')}
                          onChange={(e) => handleInputChange('location', e.target.value)}
                          disabled={!selectedPost}
                        >
                          {(() => {
                            const availableLocations = getAvailableLocations();
                            
                            if (availableLocations.length === 0) {
                              return (
                                <MenuItem disabled>
                                  {selectedPost ? `No locations available for ${selectedPost.valueName}` : 'Please select a post first'}
                                </MenuItem>
                              );
                            }
                            
                            return availableLocations.map((location) => (
                              <MenuItem key={location.valueCode} value={location.valueName}>
                                {location.valueName}
                              </MenuItem>
                            ));
                          })()}
                        </Select>
                      </FormControl>
                    </Grid>
                  )}
                  {isFieldVisible('qualification') && (
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label={getFieldLabel('qualification', 'अर्हता / Qualification')}
                        value={formData.qualification}
                        variant="outlined"
                        required={isFieldRequired('qualification')}
                        InputProps={{
                          readOnly: true,
                        }}
                        sx={{ backgroundColor: '#f5f5f5' }}
                        helperText="Auto-filled based on selected post"
                      />
                    </Grid>
                  )}
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth required>
                      <InputLabel>विशेषज्ञता / Specialization</InputLabel>
                      <Select
                        value={formData.specialization}
                        label="विशेषज्ञता / Specialization"
                        onChange={(e) => handleInputChange('specialization', e.target.value)}
                        disabled={!selectedPost}
                      >
                        {selectedPost && formConfig.specializations && formConfig.specializations[selectedPost.valueCode] ? 
                          formConfig.specializations[selectedPost.valueCode].map((spec) => (
                            <MenuItem key={spec.valueCode} value={spec.valueName}>
                              {spec.valueName}
                            </MenuItem>
                          )) : []
                        }
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      required
                      label="योग्यता डिग्री में प्रतिशत / Percentage in qualifying degree"
                      value={formData.percentageInQualifyingDegree}
                      onChange={(e) => handleInputChange('percentageInQualifyingDegree', e.target.value)}
                      inputProps={{ 
                        type: 'number',
                        min: 0,
                        max: 100,
                        step: 0.01
                      }}
                      helperText="नोट: CGPA को विश्वविद्यालय/संस्थान दिशानिर्देशों के अनुसार प्रतिशत में परिवर्तित करें। / Note: Convert CGPA into percentage as per the University/Institute guidelines"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="पूर्ण करने का वर्ष / Completion year"
                      value={formData.completionYear}
                      onChange={(e) => handleInputChange('completionYear', e.target.value)}
                      inputProps={{ 
                        maxLength: 4,
                        pattern: '[0-9]{4}',
                        title: 'Please enter a valid year (e.g., 2023)'
                      }}
                      helperText="(अर्हता समापन के वर्ष (जैसे-2023) दर्ज करें। / Enter the year of Qualification Completion(e.g.-2023))"
                      required
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth required>
                      <InputLabel>पीडब्ल्यूबीडी / PwBD</InputLabel>
                      <Select
                        value={formData.pwbd}
                        label="पीडब्ल्यूबीडी / PwBD"
                        onChange={(e) => handleInputChange('pwbd', e.target.value)}
                      >
                        {formConfig && formConfig.pwbdOptions ? 
                          formConfig.pwbdOptions.map((option) => (
                            <MenuItem key={option} value={option}>
                              {option}
                            </MenuItem>
                          )) : (
                            // Fallback to hardcoded values if config not loaded
                            [
                              <MenuItem key="Yes" value="Yes">Yes</MenuItem>,
                              <MenuItem key="No" value="No">No</MenuItem>
                            ]
                          )
                        }
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="ई-चालान संख्या / E-Challan Number"
                      value={formData.challanNumber}
                      onChange={(e) => handleInputChange('challanNumber', e.target.value)}
                      required={formData.category !== 'SC' && formData.category !== 'ST' && formData.pwbd !== 'Yes'}
                      disabled={formData.category === 'SC' || formData.category === 'ST' || formData.pwbd === 'Yes'}
                      helperText={
                        formData.category === 'SC' || formData.category === 'ST' || formData.pwbd === 'Yes'
                          ? 'छूट प्राप्त / Exempted for SC/ST/PwBD'
                          : 'अनिवार्य क्षेत्र / Mandatory field'
                      }
                      sx={{
                        '& .MuiInputBase-input.Mui-disabled': {
                          backgroundColor: '#f5f5f5'
                        }
                      }}
                    />
                  </Grid>
                </Grid>
              </LocalizationProvider>

              <Box sx={{ mt: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Button
                  variant="contained"
                  onClick={handleSubmit}
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={20} /> : null}
                >
                  {loading ? 'Registering...' : 'पंजीकृत करें। / Register'}
                </Button>
                <Button variant="outlined" onClick={resetForm}>
                  पुनः व्यवस्थित कर / Reset
                </Button>
              </Box>

              {rollNumber && (
                <Paper sx={{ mt: 3, p: 2, bgcolor: '#e3f2fd' }}>
                  <Typography variant="h6" color="primary" gutterBottom>
                    Registration Successful!
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    <strong>Registration Number:</strong> {rollNumber}
                  </Typography>
                </Paper>
              )}
            </CardContent>
          </Card>

          {/* Find Roll Number Form */}
          <Card sx={{ border: '1px solid #e0e0e0' }}>
            <CardContent>
              <Typography variant="h5" gutterBottom sx={{ mb: 3, color: '#1976d2' }}>
                अपना पंजीकरण संख्या पता करें। / Find My Registration Number
              </Typography>
              
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="मोबाइल नं. / Mobile no"
                      value={findData.mobileNumber}
                      onChange={(e) => handleFindInputChange('mobileNumber', e.target.value)}
                      inputProps={{ 
                        maxLength: 10,
                        pattern: '[0-9]{10}',
                        title: 'Only 10 digits allowed'
                      }}
                      helperText="वास्तविक 10 अंकों मे/Exactly 10 Digit required"
                      error={mobileError}
                      required
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <DatePicker
                      label="जन्म तिथि / Date of birth"
                      value={findData.dateOfBirth}
                      onChange={(newValue) => handleFindInputChange('dateOfBirth', newValue)}
                      renderInput={(params) => <TextField {...params} fullWidth required />}
                    />
                  </Grid>
                </Grid>
              </LocalizationProvider>

              <Box sx={{ mt: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Button
                  variant="contained"
                  onClick={handleFindRollNumber}
                  disabled={findLoading}
                  startIcon={findLoading ? <CircularProgress size={20} /> : null}
                >
                  {findLoading ? 'Finding...' : 'अपना पंजीकरण संख्या पता करें। / Find My Registration Number'}
                </Button>
                <Button variant="outlined" onClick={resetFindForm}>
                  रीसेट करे / Reset
                </Button>
              </Box>

              {foundCandidate && (
                <Paper sx={{ mt: 3, p: 3, bgcolor: '#e8f5e8', border: '2px solid #4caf50' }}>
                  <Typography variant="h6" sx={{ color: '#2e7d32', fontWeight: 'bold', mb: 2 }}>
                    ✅ Candidate Found!
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body1" gutterBottom>
                        <strong>Name:</strong> {foundCandidate.candidateName}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body1" gutterBottom>
                        <strong>Mobile:</strong> {foundCandidate.mobileNumber}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body1" gutterBottom>
                        <strong>Category:</strong> {foundCandidate.category}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body1" gutterBottom>
                        <strong>Location:</strong> {foundCandidate.location}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body1" gutterBottom>
                        <strong>Post Applied For:</strong> {foundCandidate.postApplied}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body1" gutterBottom>
                        <strong>Date of Birth:</strong> {foundCandidate.dateOfBirth}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body1" gutterBottom>
                        <strong>PwBD:</strong> {foundCandidate.pwbd}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Box sx={{ 
                        p: 2, 
                        bgcolor: '#1976d2', 
                        color: 'white', 
                        borderRadius: 2,
                        textAlign: 'center'
                      }}>
                        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                          Registration Number: {foundCandidate.rollNumber}
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </Paper>
              )}

              {/* Multiple candidates found */}
              {multipleResults && foundCandidates.length > 0 && (
                <Paper sx={{ mt: 3, p: 3, bgcolor: '#fff3e0', border: '2px solid #ff9800' }}>
                  <Typography variant="h6" sx={{ color: '#e65100', fontWeight: 'bold', mb: 2 }}>
                    🔍 Multiple Registrations Found!
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 3, color: '#666' }}>
                    You have registered for both available posts. Please check the details below to identify your registrations.
                  </Typography>
                  
                  {foundCandidates.map((candidate, index) => (
                    <Paper key={index} sx={{ 
                      mt: 2, 
                      p: 3, 
                      bgcolor: '#f5f5f5', 
                      border: '1px solid #ddd',
                      borderRadius: 2
                    }}>
                      <Typography variant="h6" sx={{ color: '#1976d2', fontWeight: 'bold', mb: 2 }}>
                        Registration #{index + 1} - {candidate.postApplied}
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="body1" gutterBottom>
                            <strong>Name:</strong> {candidate.candidateName}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="body1" gutterBottom>
                            <strong>Mobile:</strong> {candidate.mobileNumber}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="body1" gutterBottom>
                            <strong>Category:</strong> {candidate.category}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="body1" gutterBottom>
                            <strong>Location:</strong> {candidate.location}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="body1" gutterBottom>
                            <strong>Post Applied For:</strong> {candidate.postApplied}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="body1" gutterBottom>
                            <strong>Date of Birth:</strong> {candidate.dateOfBirth}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="body1" gutterBottom>
                            <strong>PwBD:</strong> {candidate.pwbd}
                          </Typography>
                        </Grid>
                        <Grid item xs={12}>
                          <Box sx={{ 
                            p: 2, 
                            bgcolor: '#1976d2', 
                            color: 'white', 
                            borderRadius: 2,
                            textAlign: 'center',
                            mt: 1
                          }}>
                            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                              Registration Number: {candidate.rollNumber}
                            </Typography>
                          </Box>
                        </Grid>
                      </Grid>
                    </Paper>
                  ))}
                </Paper>
              )}
              
              {/* Show message when no candidate found */}
              {message && messageType === 'error' && !foundCandidate && !multipleResults && (
                <Paper sx={{ mt: 3, p: 3, bgcolor: '#ffebee', border: '2px solid #f44336' }}>
                  <Typography variant="h6" sx={{ color: '#c62828', fontWeight: 'bold', mb: 1 }}>
                    ❌ Candidate Not Found
                  </Typography>
                  <Typography variant="body1" sx={{ mb: 2 }}>
                    No registration found with the provided mobile number and date of birth.
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#666' }}>
                    Please check your details or register using the form above.
                  </Typography>
                </Paper>
              )}
            </CardContent>
          </Card>

          {/* Snackbar for messages */}
          <Snackbar
            open={snackbarOpen}
            autoHideDuration={4000}
            onClose={() => setSnackbarOpen(false)}
            anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
          >
            <Alert 
              severity={messageType} 
              onClose={() => setSnackbarOpen(false)}
              sx={{ width: '100%' }}
            >
              {message}
            </Alert>
          </Snackbar>

          {/* Success Dialog */}
          <Dialog
            open={successDialogOpen}
            onClose={handleCloseSuccessDialog}
            maxWidth="sm"
            fullWidth
          >
            <DialogTitle sx={{ 
              bgcolor: '#4caf50', 
              color: 'white',
              textAlign: 'center'
            }}>
              🎉 Registration Successful!
            </DialogTitle>
            <DialogContent sx={{ pt: 3 }}>
              <Box sx={{ textAlign: 'center', mb: 3 }}>
                <Typography variant="h6" gutterBottom color="primary">
                  Your registration has been completed successfully!
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  Please note down your registration number for further process:
                </Typography>
                <Box sx={{ 
                  p: 2, 
                  bgcolor: '#f5f5f5', 
                  borderRadius: 2,
                  border: '2px solid #1976d2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  mb: 2
                }}>
                  <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#1976d2' }}>
                    {successRollNumber}
                  </Typography>
                  <IconButton
                    onClick={handleCopyRollNumber}
                    color="primary"
                    sx={{ 
                      bgcolor: 'white',
                      '&:hover': { bgcolor: '#e3f2fd' }
                    }}
                  >
                    <CopyIcon />
                  </IconButton>
                </Box>
                {copySuccess && (
                  <Alert severity="success" sx={{ mb: 2 }}>
                    Registration number copied to clipboard!
                  </Alert>
                )}
                <Typography variant="body2" color="text.secondary">
                  <strong>Important:</strong> Please keep this registration number safe. You will need it for future reference.
                </Typography>
              </Box>
            </DialogContent>
            <DialogActions sx={{ p: 3, justifyContent: 'center' }}>
              <Button
                variant="contained"
                onClick={handleCloseSuccessDialog}
                sx={{ minWidth: 120 }}
              >
                Got it!
              </Button>
            </DialogActions>
          </Dialog>
        </Box>
        </Container>
        
        {/* Footer */}
        <Box sx={{ 
          mt: 'auto', 
          py: 2, 
          bgcolor: '#1976d2', 
          color: 'white',
          textAlign: 'center',
          borderTop: '2px solid #1565c0'
        }}>
          <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
            Bharat Electronics Limited
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.9 }}>
            Version 2.5
          </Typography>
        </Box>
      </Box>
    </ThemeProvider>
  );
};

export default BELScanQRPage; 
