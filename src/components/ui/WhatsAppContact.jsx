import React from 'react';
import {
  Alert,
  Button,
  Box,
  Typography,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useTheme,
  useMediaQuery
} from '@mui/material';
import { WhatsApp, ContentCopy, Close } from '@mui/icons-material';

const WhatsAppContact = ({ 
  open, 
  onClose, 
  errorMessage = "Form submission failed", 
  fullWidth = false,
  payload = null,
  formType = "Unknown Form"
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const whatsappNumber = "7701816408";
  
  // Create formatted message with error details and payload
  const createWhatsAppMessage = () => {
    const timestamp = new Date().toLocaleString();
    
    let message = `🚨 *Form Submission Error Report*\n\n`;
    message += `📅 *Date & Time:* ${timestamp}\n`;
    message += `📋 *Form Type:* ${formType}\n`;
    message += `❌ *Error:* ${errorMessage}\n\n`;
    
    if (payload) {
      message += `📄 *Form Data:*\n`;
      message += `\`\`\`\n${JSON.stringify(payload, null, 2)}\`\`\`\n\n`;
    }
    
    message += `🔧 *Browser Info:*\n`;
    message += `- User Agent: ${navigator.userAgent}\n`;
    message += `- URL: ${window.location.href}\n\n`;
    
    message += `Please help resolve this issue. Thank you!`;
    
    return encodeURIComponent(message);
  };

  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${createWhatsAppMessage()}`;

  const handleWhatsAppClick = () => {
    window.open(whatsappUrl, '_blank');
  };

  const handleCopyNumber = () => {
    navigator.clipboard.writeText(whatsappNumber);
  };

  const formattedNumber = `+91 ${whatsappNumber.slice(0, 5)} ${whatsappNumber.slice(5)}`;

  // Inline component for smaller errors
  if (!open && fullWidth) {
    return (
      <Alert 
        severity="error" 
        sx={{ 
          mt: 2,
          '& .MuiAlert-message': {
            width: '100%'
          }
        }}
        action={
          <Button
            color="inherit"
            size="small"
            onClick={handleWhatsAppClick}
            startIcon={<WhatsApp />}
            sx={{ 
              bgcolor: 'rgba(255,255,255,0.2)',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' }
            }}
          >
            Contact Support
          </Button>
        }
      >
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
            {errorMessage}
          </Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            Need help? Contact us on WhatsApp: {formattedNumber}
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.5, fontSize: '0.875rem', opacity: 0.8 }}>
            (Click Contact Support to send pre-formatted error report)
          </Typography>
        </Box>
      </Alert>
    );
  }

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { 
          bgcolor: 'error.light',
          color: 'error.contrastText'
        }
      }}
    >
      <DialogTitle sx={{ 
        bgcolor: 'error.main', 
        color: 'error.contrastText',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <Typography variant="h6" component="div">
          ❌ Submission Failed
        </Typography>
        <IconButton 
          onClick={onClose}
          size="small"
          sx={{ color: 'error.contrastText' }}
        >
          <Close />
        </IconButton>
      </DialogTitle>
      
      <DialogContent sx={{ pt: 3, bgcolor: 'background.paper', color: 'text.primary' }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
            {errorMessage}
          </Typography>
        </Alert>

        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 2, color: 'primary.main' }}>
            Need Help? Contact Support
          </Typography>
          
          <Box sx={{ 
            display: 'flex', 
            flexDirection: isMobile ? 'column' : 'row', 
            gap: 2, 
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            <Button
              variant="contained"
              color="success"
              size="large"
              onClick={handleWhatsAppClick}
              startIcon={<WhatsApp />}
              sx={{ 
                bgcolor: '#25D366',
                '&:hover': { bgcolor: '#128C7E' },
                px: 3,
                py: 1.5
              }}
            >
              Open WhatsApp
            </Button>
            
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1,
              p: 1,
              border: 1,
              borderColor: 'divider',
              borderRadius: 1,
              bgcolor: 'grey.50'
            }}>
              <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                {formattedNumber}
              </Typography>
              <IconButton 
                size="small" 
                onClick={handleCopyNumber}
                title="Copy number"
                sx={{ color: 'primary.main' }}
              >
                <ContentCopy fontSize="small" />
              </IconButton>
            </Box>
          </Box>
        </Box>

        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2">
            📱 <strong>To report this issue:</strong>
          </Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            1. Click "Open WhatsApp" above to send a pre-formatted error report
          </Typography>
          <Typography variant="body2">
            2. The message will include error details and form data automatically
          </Typography>
          <Typography variant="body2">
            3. You can add any additional context before sending
          </Typography>
        </Alert>
      </DialogContent>
      
      <DialogActions sx={{ bgcolor: 'background.paper', pt: 2 }}>
        <Button onClick={onClose} color="primary" variant="outlined">
          Close
        </Button>
        <Button 
          onClick={handleWhatsAppClick} 
          color="success" 
          variant="contained"
          startIcon={<WhatsApp />}
          sx={{ 
            bgcolor: '#25D366',
            '&:hover': { bgcolor: '#128C7E' }
          }}
        >
          Contact Support
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default WhatsAppContact; 
