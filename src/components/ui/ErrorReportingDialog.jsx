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
  Chip,
  IconButton,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Error as ErrorIcon,
  Save as SaveIcon,
  Refresh as RefreshIcon,
  WhatsApp as WhatsAppIcon,
  Close as CloseIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { sendSilentWhatsAppReport, createErrorMessage } from '../../utils/whatsappUtils';
import { getConsentStatus } from '../../utils/consentManager';
import ConsentDialog from './ConsentDialog';

const ErrorReportingDialog = ({
  open,
  onClose,
  error,
  formType,
  payload,
  onRetry,
  onSaveOffline,
  isRetrying = false
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  // Consent management states
  const [showConsentDialog, setShowConsentDialog] = useState(false);
  const [pendingErrorReport, setPendingErrorReport] = useState(null);

  const handleClose = () => {
    onClose();
  };

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    }
  };

  const handleSaveOffline = () => {
    if (onSaveOffline) {
      onSaveOffline();
    }
    handleClose();
  };

  // Consent handling functions
  const handleConsentGiven = () => {
    if (pendingErrorReport) {
      const { formType, errorMessage, payload } = pendingErrorReport;
      sendSilentWhatsAppReport(formType, errorMessage, payload);
      setPendingErrorReport(null);
    }
  };

  const checkAndRequestConsent = (formType, errorMessage, payload) => {
    const consentStatus = getConsentStatus();
    
    if (consentStatus.canSendReports) {
      // User has already consented, send report immediately
      sendSilentWhatsAppReport(formType, errorMessage, payload);
    } else {
      // User hasn't consented, show consent dialog
      setPendingErrorReport({ formType, errorMessage, payload });
      setShowConsentDialog(true);
    }
  };

  const handleWhatsAppReport = () => {
    const errorMessage = createErrorMessage('Form Submission Error', error?.status || 'Unknown', error?.message || 'Unknown error');
    checkAndRequestConsent(formType, errorMessage, payload);
  };

  const getErrorType = () => {
    const statusCode = error?.status || error?.response?.status;
    if (statusCode >= 500) return 'Server Error';
    if (statusCode >= 400) return 'Client Error';
    if (!error?.response) return 'Network Error';
    return 'Unknown Error';
  };

  const getErrorColor = () => {
    const errorType = getErrorType();
    switch (errorType) {
      case 'Server Error': return 'error';
      case 'Client Error': return 'warning';
      case 'Network Error': return 'info';
      default: return 'error';
    }
  };

  const getErrorIcon = () => {
    const errorType = getErrorType();
    switch (errorType) {
      case 'Server Error': return '🔴';
      case 'Client Error': return '🟡';
      case 'Network Error': return '🔵';
      default: return '❌';
    }
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            boxShadow: theme.shadows[8]
          }
        }}
      >
        <DialogTitle sx={{
          bgcolor: `${getErrorColor()}.main`,
          color: `${getErrorColor()}.contrastText`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          py: 2
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ErrorIcon />
            <Typography variant="h6" component="div">
              Form Submission Failed
            </Typography>
          </Box>
          <IconButton
            onClick={handleClose}
            size="small"
            sx={{ color: `${getErrorColor()}.contrastText` }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ pt: 3 }}>
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Chip
                icon={<InfoIcon />}
                label={getErrorType()}
                color={getErrorColor()}
                variant="outlined"
                size="small"
              />
              <Typography variant="body2" color="text.secondary">
                {getErrorIcon()} {error?.status || 'Unknown'} status code
              </Typography>
            </Box>

            <Alert severity={getErrorColor()} sx={{ mb: 2 }}>
              <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                {error?.message || error?.response?.data?.message || 'An error occurred while submitting the form.'}
              </Typography>
            </Alert>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Don't worry! Your form data is safe and you have options to resolve this issue.
            </Typography>
          </Box>

          <Box sx={{ 
            bgcolor: 'grey.50', 
            p: 2, 
            borderRadius: 1,
            border: `1px solid ${theme.palette.divider}`
          }}>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
              Available Options:
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <RefreshIcon color="primary" fontSize="small" />
                <Typography variant="body2">
                  <strong>Retry:</strong> Try submitting the form again
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <SaveIcon color="secondary" fontSize="small" />
                <Typography variant="body2">
                  <strong>Save Offline:</strong> Save the form locally and submit later
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <WhatsAppIcon color="success" fontSize="small" />
                <Typography variant="body2">
                  <strong>Report Issue:</strong> Send error details to support team
                </Typography>
              </Box>
            </Box>
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button
            onClick={handleWhatsAppReport}
            variant="outlined"
            color="success"
            startIcon={<WhatsAppIcon />}
            size={isMobile ? "small" : "medium"}
          >
            Report Issue
          </Button>
          
          <Button
            onClick={handleSaveOffline}
            variant="outlined"
            color="secondary"
            startIcon={<SaveIcon />}
            size={isMobile ? "small" : "medium"}
          >
            Save Offline
          </Button>
          
          <Button
            onClick={handleRetry}
            variant="contained"
            color="primary"
            startIcon={<RefreshIcon />}
            disabled={isRetrying}
            size={isMobile ? "small" : "medium"}
          >
            {isRetrying ? 'Retrying...' : 'Retry'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Consent Dialog */}
      <ConsentDialog
        open={showConsentDialog}
        onClose={() => setShowConsentDialog(false)}
        onConsentGiven={handleConsentGiven}
      />
    </>
  );
};

export default ErrorReportingDialog; 