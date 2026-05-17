import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  InputAdornment,
  IconButton
} from '@mui/material';
import { Visibility, VisibilityOff, Lock } from '@mui/icons-material';
import { BEL_ADMIN_PASSWORD } from '../../config';
import belLogo from '../assets/bel_logo.png';

const BEL_PASSWORD_KEY = 'bel_admin_authenticated';

const BELPasswordProtection = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Check if already authenticated on mount
  useEffect(() => {
    const storedAuth = localStorage.getItem(BEL_PASSWORD_KEY);
    if (storedAuth === 'true') {
      setIsAuthenticated(true);
    }
    setIsLoading(false);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (password === BEL_ADMIN_PASSWORD) {
      localStorage.setItem(BEL_PASSWORD_KEY, 'true');
      setIsAuthenticated(true);
      setError('');
    } else {
      setError('Incorrect password. Please try again.');
      setPassword('');
    }
  };

  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
    if (error) {
      setError('');
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // Show loading state while checking authentication
  if (isLoading) {
    return null;
  }

  // If authenticated, show the protected content
  if (isAuthenticated) {
    return <>{children}</>;
  }

  // Show password protection screen
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: 2
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={10}
          sx={{
            padding: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            borderRadius: 2
          }}
        >
          {/* Logo and Header */}
          <Box sx={{ mb: 3, textAlign: 'center' }}>
            <img
              src={belLogo}
              alt="BEL Logo"
              style={{ height: '60px', marginBottom: '16px' }}
            />
            <Typography variant="h5" component="h1" gutterBottom fontWeight="bold">
              BEL Admin Access
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Please enter the password to continue
            </Typography>
          </Box>

          {/* Password Form */}
          <Box
            component="form"
            onSubmit={handleSubmit}
            sx={{ width: '100%', mt: 2 }}
          >
            <TextField
              fullWidth
              type={showPassword ? 'text' : 'password'}
              label="Password"
              value={password}
              onChange={handlePasswordChange}
              variant="outlined"
              autoFocus
              required
              sx={{ mb: 2 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Lock color="action" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={togglePasswordVisibility}
                      edge="end"
                      aria-label="toggle password visibility"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              sx={{
                mt: 1,
                py: 1.5,
                textTransform: 'none',
                fontSize: '1rem',
                fontWeight: 'bold'
              }}
            >
              Access Admin Panel
            </Button>
          </Box>

          {/* Info */}
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ mt: 3, textAlign: 'center' }}
          >
            This area is password protected. Contact your administrator if you need access.
          </Typography>
        </Paper>
      </Container>
    </Box>
  );
};

export default BELPasswordProtection;

