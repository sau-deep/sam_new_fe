import React from 'react';
import { 
  Box, 
  Chip, 
  Button, 
  Alert, 
  AlertTitle, 
  CircularProgress,
  Typography,
  Fade
} from '@mui/material';
import { 
  Save as SaveIcon, 
  SaveAlt as SaveAltIcon,
  Restore as RestoreIcon,
  Schedule as ScheduleIcon 
} from '@mui/icons-material';

const AutoSaveIndicator = ({ 
  lastSaved, 
  isSaving, 
  isDraftRestored,
  onLoadDraft,
  onClearDraft,
  showDraftAlert = true 
}) => {
  
  const formatLastSaved = (date) => {
    if (!date) return '';
    const now = new Date();
    const diff = Math.floor((now - date) / 1000); // seconds
    
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <Box sx={{ mb: 2 }}>
      {/* Auto-save status indicator */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        {isSaving ? (
          <Chip
            icon={<CircularProgress size={16} />}
            label="Saving..."
            color="primary"
            variant="outlined"
            size="small"
          />
        ) : lastSaved ? (
          <Chip
            icon={<SaveIcon />}
            label={`Auto-saved ${formatLastSaved(lastSaved)}`}
            color="success"
            variant="outlined"
            size="small"
          />
        ) : null}
      </Box>

      {/* Draft restoration alert */}
      {showDraftAlert && isDraftRestored && (
        <Fade in={true}>
          <Alert 
            severity="info" 
            sx={{ mb: 2 }}
            action={
              <Button
                color="inherit"
                size="small"
                onClick={onClearDraft}
                startIcon={<SaveAltIcon />}
              >
                Clear Draft
              </Button>
            }
          >
            <AlertTitle>Draft Restored</AlertTitle>
            Your previously saved progress has been restored. You can continue where you left off or clear the draft to start fresh.
          </Alert>
        </Fade>
      )}
    </Box>
  );
};

export default AutoSaveIndicator; 