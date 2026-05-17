import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Alert,
  Checkbox,
  FormControlLabel,
  Link
} from '@mui/material';
import { WhatsApp, Info, PrivacyTip } from '@mui/icons-material';
import { setWhatsAppConsent, getConsentStatus } from '../../utils/consentManager';

const ConsentDialog = ({ open, onClose, onConsentGiven }) => {
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleConsent = (consent) => {
    setLoading(true);
    
    // Set user consent
    setWhatsAppConsent(consent);
    
    // Call the callback if consent was given
    if (consent && onConsentGiven) {
      onConsentGiven();
    }
    
    setLoading(false);
    onClose();
  };

  const handleDecline = () => {
    handleConsent(false);
  };

  const handleAccept = () => {
    if (agreed) {
      handleConsent(true);
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { 
          bgcolor: 'background.paper',
          borderRadius: 2
        }
      }}
    >
      <DialogTitle sx={{ 
        bgcolor: 'primary.main', 
        color: 'primary.contrastText',
        display: 'flex',
        alignItems: 'center',
        gap: 1
      }}>
        <WhatsApp />
        Error Reporting Consent
      </DialogTitle>
      
      <DialogContent sx={{ pt: 3 }}>
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            We've detected an error with your form submission. To help us improve the system and provide better support, 
            we'd like to send a detailed error report to our support team via WhatsApp.
          </Typography>
        </Alert>

        <Typography variant="h6" gutterBottom>
          What information will be shared?
        </Typography>
        
        <Box sx={{ mb: 3 }}>
          <Typography variant="body2" paragraph>
            The error report will include:
          </Typography>
          <Box component="ul" sx={{ pl: 2 }}>
            <Typography component="li" variant="body2">
              <strong>Error details:</strong> What went wrong and when
            </Typography>
            <Typography component="li" variant="body2">
              <strong>Form data:</strong> The information you entered (excluding sensitive personal data)
            </Typography>
            <Typography component="li" variant="body2">
              <strong>Your user information:</strong> Name, email, and role for support purposes
            </Typography>
            <Typography component="li" variant="body2">
              <strong>Technical details:</strong> Browser information and system status
            </Typography>
          </Box>
        </Box>

        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="body2">
            <strong>Important:</strong> This consent is valid for 1 year and can be revoked at any time in your settings. 
            Your data will be used only for error resolution and system improvement.
          </Typography>
        </Alert>

        <FormControlLabel
          control={
            <Checkbox
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              color="primary"
            />
          }
          label={
            <Typography variant="body2">
              I understand and agree to share error information for support purposes
            </Typography>
          }
        />
      </DialogContent>
      
      <DialogActions sx={{ p: 3, pt: 1 }}>
        <Button 
          onClick={handleDecline}
          disabled={loading}
          variant="outlined"
          color="secondary"
        >
          Decline
        </Button>
        <Button 
          onClick={handleAccept}
          disabled={!agreed || loading}
          variant="contained"
          color="primary"
          startIcon={<WhatsApp />}
        >
          Accept & Send Report
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConsentDialog; 