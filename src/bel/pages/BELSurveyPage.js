import React from 'react';
import { I18nextProvider } from 'react-i18next';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box, Typography } from '@mui/material';
import BELSurvey2024 from '../components/BELSurvey2024';
import belI18n from '../i18n-beltest';





// Create a theme for the BEL survey
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
    MuiRadio: {
      styleOverrides: {
        root: {
          '&.Mui-checked': {
            color: '#1976d2',
          },
        },
      },
    },
  },
});

const BELSurveyPage = () => {
  
  // Ensure the BEL i18n instance is properly initialized
  if (!belI18n.isInitialized) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <Typography variant="h6">Initializing translations...</Typography>
      </Box>
    );
  }
  
  return (
    <I18nextProvider i18n={belI18n}>
      <ThemeProvider theme={belTheme}>
        <CssBaseline />
        <BELSurvey2024 />
      </ThemeProvider>
    </I18nextProvider>
  );
};

export default BELSurveyPage; 