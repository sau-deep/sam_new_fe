import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  IconButton,
  Alert,
  useTheme,
  useMediaQuery,
  Card,
  CardContent,
  CardActionArea
} from '@mui/material';
import {
  Close as CloseIcon,
  Description as DescriptionIcon,
  Download as DownloadIcon,
  OpenInNew as OpenInNewIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { isNativeApp } from '../../utils/nativeAppInfo';

const PPTX_TYPE = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';

// Public web origin that serves the same public/ files, for the Android app
// (its own origin is local to the WebView). Optional build setting.
const publicWebOrigin = () => {
  const configured = (process.env.REACT_APP_PUBLIC_WEB_ORIGIN || '').trim().replace(/\/+$/, '');
  return /^https:\/\//i.test(configured) ? configured : '';
};

const SOPViewer = ({ open, onClose, sopFilePath, title = "Standard Operating Procedures" }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const native = isNativeApp();
  const [notice, setNotice] = useState('');

  // Ensure the path starts with / for public folder files
  const filePath = sopFilePath.startsWith('/') ? sopFilePath : `/${sopFilePath}`;
  const fileName = filePath.split('/').pop() || 'SOP.pptx';
  // Office Online must fetch the file itself: only a public https URL works.
  // On the web that is this site's origin; in the Android app the WebView origin
  // is local to the device, so it is used only when a public origin is configured.
  const remoteBase = native ? publicWebOrigin() : window.location.origin;
  const canPreviewOnline = !!remoteBase && /^https?:\/\//i.test(remoteBase);

  const downloadWithLink = (href) => {
    const link = document.createElement('a');
    link.href = href;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Android: hand the bundled asset to the device (share sheet → PowerPoint,
  // Drive, Files…). A WebView-local URL is never sent to a remote viewer.
  const openBundledOnDevice = async () => {
    setNotice('');
    try {
      const response = await fetch(filePath);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      const file = typeof File === 'function' ? new File([blob], fileName, { type: PPTX_TYPE }) : null;
      if (file && navigator.canShare && navigator.canShare({ files: [file] }) && navigator.share) {
        await navigator.share({ files: [file], title });
        return;
      }
    } catch (err) {
      if (err && err.name === 'AbortError') return; // user closed the share sheet
    }
    const base = publicWebOrigin();
    if (base) {
      // Leaving the app's origin makes Capacitor open the system browser, which downloads the file.
      window.location.assign(`${base}${filePath}`);
      return;
    }
    downloadWithLink(filePath);
    setNotice('If the document did not open, find it under Resources on the SAM website, or ask your supervisor for the SOP file.');
  };

  const handleDownload = () => {
    if (native) {
      openBundledOnDevice();
      return;
    }
    downloadWithLink(filePath);
  };

  const handleOpenInNewTab = () => {
    if (!canPreviewOnline) {
      openBundledOnDevice();
      return;
    }
    const fullUrl = remoteBase + filePath;
    // Office Online Viewer URL - works for PPT, PPTX, DOC, DOCX, XLS, XLSX files
    const viewerUrl = `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(fullUrl)}`;
    if (native) {
      window.location.assign(viewerUrl); // external host: opened by the system browser
      return;
    }
    window.open(viewerUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{
        sx: {
          borderRadius: isMobile ? 0 : 2,
          maxHeight: isMobile ? '100vh' : '90vh',
          m: isMobile ? 0 : 2
        }
      }}
    >
      <DialogTitle
        sx={{
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          py: 2,
          px: 3
        }}
      >
        <Box display="flex" alignItems="center" gap={1}>
          <DescriptionIcon />
          <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
            {title}
          </Typography>
        </Box>
        <IconButton
          onClick={onClose}
          size="small"
          sx={{ color: 'primary.contrastText' }}
          aria-label="close"
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: isMobile ? 2 : 3, bgcolor: 'background.paper' }}>
        {notice && (
          <Alert severity="warning" sx={{ mb: 2 }} onClose={() => setNotice('')}>
            <Typography variant="body2">{notice}</Typography>
          </Alert>
        )}
        <Alert severity="info" icon={<InfoIcon />} sx={{ mb: 3 }}>
          <Typography variant="body2">
            This document contains the Standard Operating Procedures (SOP) for Routine Monitoring activities. 
            You can view it online or download it to your device for offline access.
          </Typography>
        </Alert>

        {/* Action Cards */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
          {/* Download Card */}
          <Card
            sx={{
              border: '2px solid',
              borderColor: 'primary.main',
              borderRadius: 2,
              transition: 'all 0.3s ease',
              '&:hover': {
                boxShadow: 4,
                transform: 'translateY(-2px)'
              }
            }}
          >
            <CardActionArea onClick={handleDownload}>
              <CardContent sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box
                  sx={{
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText',
                    borderRadius: '50%',
                    width: 48,
                    height: 48,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <DownloadIcon />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                    {native ? 'Open SOP Document' : 'Download SOP Document'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {native
                      ? 'Open the PowerPoint file in an app on this device'
                      : 'Download the PowerPoint file to view on your device'}
                  </Typography>
                </Box>
              </CardContent>
            </CardActionArea>
          </Card>

          {/* View Online Card (needs a public URL the online viewer can fetch) */}
          {canPreviewOnline && (
          <Card
            sx={{
              border: '2px solid',
              borderColor: 'secondary.main',
              borderRadius: 2,
              transition: 'all 0.3s ease',
              '&:hover': {
                boxShadow: 4,
                transform: 'translateY(-2px)'
              }
            }}
          >
            <CardActionArea onClick={handleOpenInNewTab}>
              <CardContent sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box
                  sx={{
                    bgcolor: 'secondary.main',
                    color: 'secondary.contrastText',
                    borderRadius: '50%',
                    width: 48,
                    height: 48,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <OpenInNewIcon />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                    View Online
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Open the document in Office Online Viewer (view in browser)
                  </Typography>
                </Box>
              </CardContent>
            </CardActionArea>
          </Card>
          )}
        </Box>

        {/* Instructions for Mobile */}
        {isMobile && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
              Mobile Viewing Instructions:
            </Typography>
            <Typography variant="body2" component="div">
              <Box component="ul" sx={{ m: 0, pl: 2 }}>
                {canPreviewOnline && (
                  <li>Use "View Online" to open the document in Office Online Viewer directly in your browser</li>
                )}
                <li>Download the file to view it offline with Microsoft PowerPoint, Google Slides, or any compatible app</li>
                <li>For best offline experience, download the file and view it in a presentation app</li>
              </Box>
            </Typography>
          </Alert>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2, bgcolor: 'background.paper', borderTop: '1px solid', borderColor: 'divider' }}>
        <Button
          onClick={onClose}
          variant="contained"
          color="primary"
          sx={{ minWidth: 120 }}
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SOPViewer;

