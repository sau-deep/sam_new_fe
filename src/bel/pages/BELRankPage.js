import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Grid
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { CheckCircle, Cancel, Search } from '@mui/icons-material';
import { API_BASE_URL } from '../../config';
import belLogo from '../assets/bel_logo.png';

const StyledButton = styled(Button)(({ theme }) => ({
  marginTop: theme.spacing(2),
  padding: theme.spacing(1.5, 4),
  borderRadius: theme.spacing(1),
  textTransform: 'none',
  fontSize: '1rem',
  fontWeight: 600,
}));

const BELRankPage = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Form data
  const [formData, setFormData] = useState({
    rollNumber: '',
    mobileNumber: '',
    postApplied: ''
  });

  // OTP related state
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [reqId, setReqId] = useState(null);

  // Results data
  const [rankData, setRankData] = useState(null);

  const postOptions = [
    'Field Operation Engineer',
    'Project Engineer-I'
  ];

  // Timer effect for resend OTP
  useEffect(() => {
    let interval;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const resetForm = () => {
    setFormData({
      rollNumber: '',
      mobileNumber: '',
      postApplied: ''
    });
    setRankData(null);
    setError('');
    setSuccess('');
    setOtpSent(false);
    setOtp('');
    setOtpLoading(false);
    setResendTimer(0);
    setReqId(null);
  };

  const validateForm = () => {
    if (!formData.rollNumber?.trim()) {
      setError('Please enter roll number');
      return false;
    }
    if (!formData.mobileNumber?.trim()) {
      setError('Please enter mobile number');
      return false;
    }
    if (formData.mobileNumber.length !== 10) {
      setError('Mobile number must be 10 digits');
      return false;
    }
    if (!formData.postApplied?.trim()) {
      setError('Please select post applied for');
      return false;
    }
    return true;
  };

  const sendOtp = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {

      const response = await fetch(`${API_BASE_URL}/bel/rank/send-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rollNumber: formData.rollNumber.trim(),
          mobileNumber: formData.mobileNumber.trim(),
          postApplied: formData.postApplied.trim()
        })
      });

      const data = await response.json();

      if (data.success && data.data) {
        setOtpSent(true);
        setReqId(data.data.reqId);
        setSuccess('OTP sent successfully to your mobile number!');
        setResendTimer(60); // Start 1 minute timer for resend
      } else {
        setError(data.message || 'Failed to send OTP. Please check your details.');
        setOtpSent(false);
      }

    } catch (err) {
      console.error('❌ Send OTP Error:', err);
      setError('Unable to connect to server. Please try again later.');
      setOtpSent(false);
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (!otp.trim()) {
      setError('Please enter OTP');
      return;
    }
    if (otp.length !== 6) {
      setError('OTP must be 6 digits');
      return;
    }

    setOtpLoading(true);
    setError('');
    setSuccess('');

    try {

      const response = await fetch(`${API_BASE_URL}/bel/rank/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rollNumber: formData.rollNumber.trim(),
          mobileNumber: formData.mobileNumber.trim(),
          postApplied: formData.postApplied.trim(),
          otp: otp.trim(),
          reqId: reqId
        })
      });

      const data = await response.json();

      if (data.success && data.data) {
        setRankData(data.data);
        setSuccess(''); // Clear success message
        setOtpSent(false); // Hide OTP form
      } else {
        setError(data.message || 'Invalid or expired OTP. Please try again.');
        setRankData(null);
      }

    } catch (err) {
      console.error('❌ Verify OTP Error:', err);
      setError('Unable to connect to server. Please try again later.');
      setRankData(null);
    } finally {
      setOtpLoading(false);
    }
  };

  const resendOtp = async () => {
    if (resendTimer > 0) return;
    
    setLoading(true);
    setError('');
    setSuccess('');

    try {

      const response = await fetch(`${API_BASE_URL}/bel/rank/resend-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rollNumber: formData.rollNumber.trim(),
          mobileNumber: formData.mobileNumber.trim(),
          postApplied: formData.postApplied.trim()
        })
      });

      const data = await response.json();

      if (data.success && data.data) {
        setReqId(data.data.reqId);
        setSuccess('OTP resent successfully to your mobile number!');
        setResendTimer(60); // Start 1 minute timer for resend
      } else {
        setError(data.message || 'Failed to resend OTP. Please try again.');
      }

    } catch (err) {
      console.error('❌ Resend OTP Error:', err);
      setError('Unable to connect to server. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
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
          <Box textAlign="center" mb={4}>
            <img 
              src={belLogo} 
              alt="BEL Logo" 
              style={{ height: '60px', marginBottom: '16px' }}
            />
            <Typography variant="h4" component="h1" gutterBottom color="primary">
              Walk- In Result
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              Enter your details to see your marks
            </Typography>
          </Box>

        {/* Form */}
        <Box component="form" noValidate>
          <Grid container spacing={3}>
            {/* Roll Number */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Roll Number"
                name="rollNumber"
                value={formData.rollNumber}
                onChange={handleInputChange}
                placeholder="Enter your roll number"
                variant="outlined"
                disabled={loading || otpSent}
              />
            </Grid>

            {/* Mobile Number */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Mobile Number"
                name="mobileNumber"
                value={formData.mobileNumber}
                onChange={handleInputChange}
                placeholder="Enter 10-digit mobile number"
                variant="outlined"
                type="tel"
                inputProps={{ maxLength: 10 }}
                disabled={loading || otpSent}
              />
            </Grid>

            {/* Post Applied For */}
            <Grid item xs={12}>
              <FormControl fullWidth variant="outlined" disabled={loading || otpSent}>
                <InputLabel>Post Applied For</InputLabel>
                <Select
                  name="postApplied"
                  value={formData.postApplied}
                  onChange={handleInputChange}
                  label="Post Applied For"
                >
                  {postOptions.map((post) => (
                    <MenuItem key={post} value={post}>
                      {post}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* OTP Input - Show only when OTP is sent */}
            {otpSent && (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Enter OTP"
                  name="otp"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="Enter 6-digit OTP"
                  variant="outlined"
                  type="tel"
                  inputProps={{ maxLength: 6 }}
                  disabled={otpLoading}
                  helperText="Please enter the OTP sent to your mobile number from 'CP-DSHOTP-S'"
                />
              </Grid>
            )}
          </Grid>

          {/* Action Buttons - Hide when rank data is shown */}
          {!rankData && (
            <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
              {!otpSent ? (
                // Send OTP Button
                <StyledButton
                  variant="contained"
                  color="primary"
                  onClick={sendOtp}
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={20} /> : <Search />}
                  sx={{ minWidth: 200 }}
                >
                  {loading ? 'Sending OTP...' : 'Send OTP'}
                </StyledButton>
              ) : (
                // Verify OTP and Resend Buttons
                <>
                  <StyledButton
                    variant="contained"
                    color="success"
                    onClick={verifyOtp}
                    disabled={otpLoading}
                    startIcon={otpLoading ? <CircularProgress size={20} /> : <CheckCircle />}
                    sx={{ minWidth: 200 }}
                  >
                    {otpLoading ? 'Verifying...' : 'Verify OTP'}
                  </StyledButton>

                  <StyledButton
                    variant="outlined"
                    color="primary"
                    onClick={resendOtp}
                    disabled={resendTimer > 0}
                    sx={{ minWidth: 150 }}
                  >
                    {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend OTP'}
                  </StyledButton>
                </>
              )}

              <StyledButton
                variant="outlined"
                color="secondary"
                onClick={resetForm}
                disabled={loading || otpLoading}
                sx={{ minWidth: 120 }}
              >
                Reset
              </StyledButton>
            </Box>
          )}
        </Box>

        {/* Error Message */}
        {error && (
          <Alert 
            severity="error" 
            sx={{ mt: 2 }}
            icon={<Cancel />}
          >
            {error}
          </Alert>
        )}

        {/* Success Message - Hide when rank data is shown */}
        {success && !rankData && (
          <Alert 
            severity="success" 
            sx={{ mt: 2 }}
            icon={<CheckCircle />}
          >
            {success}
          </Alert>
        )}

        {/* Rank Results */}
        {rankData && (
          <>
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
              <StyledButton
                variant="outlined"
                color="secondary"
                onClick={resetForm}
                sx={{ minWidth: 120 }}
              >
                Check Another Result
              </StyledButton>
            </Box>
            <Card sx={{ 
              mt: 3, 
              bgcolor: '#f9f9f9', 
              border: '1px solid #ddd',
              borderRadius: 2
            }}>
              <CardContent>
              <Typography variant="h6" gutterBottom sx={{ 
                color: '#333',
                fontWeight: 'bold',
                textAlign: 'center'
              }}>
                Written Test Score Card
              </Typography>
              
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" sx={{ color: '#333' }}>
                    <strong>Roll Number:</strong> {rankData.rollNumber}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" sx={{ color: '#333' }}>
                    <strong>Mobile Number:</strong> {rankData.mobileNumber}
                  </Typography>
                </Grid>
                {rankData.name && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" sx={{ color: '#333' }}>
                      <strong>Name:</strong> {rankData.name}
                    </Typography>
                  </Grid>
                )}
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" sx={{ color: '#333' }}>
                    <strong>Post Applied:</strong> {rankData.postApplied}
                  </Typography>
                </Grid>
                {rankData.category && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" sx={{ color: '#333' }}>
                      <strong>Category:</strong> {rankData.category}
                    </Typography>
                  </Grid>
                )}
                
                {/* Marks and Cutoff Section */}
                <Grid item xs={12}>
                  <Box sx={{ 
                    mt: 2, 
                    p: 2, 
                    bgcolor: '#ffffff',
                    border: '1px solid #ccc',
                    borderRadius: 1
                  }}>
                    <Typography variant="body1" sx={{ color: '#333', mb: 1 }}>
                      <strong>Marks: {rankData.marks} out of 60</strong>
                    </Typography>
                    <Typography variant="body1" sx={{ color: '#333' }}>
                      <strong>
                        {rankData.postApplied === 'Project Engineer-I' 
                          ? 'Cut off for written test - 24'
                          : rankData.postApplied === 'Field Operation Engineer'
                          ? 'Cutoff - UR-49,OBC-43,SC-42'
                          : 'Cutoff - Please contact admin'
                        }
                      </strong>
                    </Typography>
                  </Box>
                </Grid>

              </Grid>
              </CardContent>
            </Card>
          </>
        )}
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
  );
};

export default BELRankPage;
