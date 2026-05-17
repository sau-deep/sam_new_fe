import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Paper,
  Alert
} from '@mui/material';
import { styled } from '@mui/material/styles';
import WorkMotivationQuestion from '../components/WorkMotivationQuestion';
import belLogo from '../assets/bel_logo.png';

const HeaderContainer = styled(Box)(({ theme }) => ({
  background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 50%, #0d47a1 100%)',
  color: 'white',
  padding: theme.spacing(4),
  textAlign: 'center',
  marginBottom: theme.spacing(4),
  boxShadow: '0 8px 32px rgba(25, 118, 210, 0.4)',
  borderRadius: '0 0 30px 30px'
}));

const WorkMotivationDemo = () => {
  const [selectedValue, setSelectedValue] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (selectedValue) {
      setSubmitted(true);
    }
  };

  const handleReset = () => {
    setSelectedValue('');
    setSubmitted(false);
  };

  return (
    <Box>
      <HeaderContainer>
        <Box display="flex" alignItems="center" justifyContent="center" gap={3} mb={2}>
          <img src={belLogo} alt="BEL Logo" style={{ height: '60px' }} />
          <Box textAlign="left">
            <Typography variant="h3" component="h1" sx={{ fontWeight: 700 }}>
              BEL Employee Survey
            </Typography>
            <Typography variant="subtitle1" sx={{ opacity: 0.9, mt: 1 }}>
              Work Motivation Assessment
            </Typography>
          </Box>
        </Box>
      </HeaderContainer>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        <WorkMotivationQuestion
          value={selectedValue}
          onChange={setSelectedValue}
          showTitle={false}
        />

        {submitted && (
          <Alert 
            severity="success" 
            sx={{ 
              mb: 3, 
              borderRadius: '12px',
              fontSize: '1.1rem'
            }}
          >
            🎉 Thank you for your response! Your feedback helps us improve the work environment at BEL.
          </Alert>
        )}

        <Paper 
          elevation={4}
          sx={{
            p: 4,
            textAlign: 'center',
            background: 'linear-gradient(135deg, #f8f9ff 0%, #e3f2fd 100%)',
            borderRadius: '20px'
          }}
        >
          <Box display="flex" justifyContent="center" gap={3} flexWrap="wrap">
            <Button
              variant="contained"
              size="large"
              onClick={handleSubmit}
              disabled={!selectedValue || submitted}
              sx={{ 
                minWidth: 200,
                height: 50,
                borderRadius: '25px',
                fontSize: '1.1rem',
                fontWeight: 600,
                textTransform: 'none',
                background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #1565c0 0%, #1976d2 100%)'
                }
              }}
            >
              {submitted ? '✅ Submitted' : '📤 Submit Response'}
            </Button>
            
            <Button
              variant="outlined"
              size="large"
              onClick={handleReset}
              sx={{ 
                minWidth: 200,
                height: 50,
                borderRadius: '25px',
                fontSize: '1.1rem',
                fontWeight: 600,
                textTransform: 'none',
                borderColor: '#f50057',
                color: '#f50057',
                borderWidth: 2,
                '&:hover': {
                  borderColor: '#c51162',
                  backgroundColor: 'rgba(245, 0, 87, 0.04)',
                  borderWidth: 2
                }
              }}
            >
              🔄 Reset
            </Button>
          </Box>
        </Paper>

        {selectedValue && (
          <Box sx={{ mt: 4, textAlign: 'center' }}>
            <Typography variant="h6" sx={{ color: '#1976d2', mb: 2 }}>
              Preview of Selected Response:
            </Typography>
            <Paper sx={{ p: 3, backgroundColor: '#f5f5f5', borderRadius: '12px' }}>
              <Typography variant="body1">
                <strong>Question:</strong> How often do you feel enthusiastic and motivated about your work at BEL?
              </Typography>
              <Typography variant="body1" sx={{ mt: 1, color: '#2e7d32', fontWeight: 600 }}>
                <strong>Answer:</strong> {selectedValue.replace('_', ' ').toUpperCase()}
              </Typography>
            </Paper>
          </Box>
        )}
      </Container>
    </Box>
  );
};

export default WorkMotivationDemo;