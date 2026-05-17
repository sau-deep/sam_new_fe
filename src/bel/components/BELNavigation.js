import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  Container
} from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import { School, AdminPanelSettings, QrCodeScanner, Assessment } from '@mui/icons-material';

const BELNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    {
      label: 'Survey',
      path: '/bel/survey',
      icon: <Assessment />,
      color: 'primary'
    },
    {
      label: 'Admin',
      path: '/bel/admin',
      icon: <AdminPanelSettings />,
      color: 'secondary'
    },
    {
      label: 'Scan QR',
      path: '/bel/scanqr',
      icon: <QrCodeScanner />,
      color: 'info'
    },
    {
      label: 'Rank Checker',
      path: '/bel/scanrank',
      icon: <School />,
      color: 'success'
    }
  ];

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <AppBar position="static" elevation={2}>
      <Container maxWidth="xl">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 0, mr: 4 }}>
            BEL System
          </Typography>
          
          <Box sx={{ flexGrow: 1, display: 'flex', gap: 1 }}>
            {navItems.map((item) => (
              <Button
                key={item.path}
                color={item.color}
                variant={isActive(item.path) ? 'contained' : 'text'}
                startIcon={item.icon}
                onClick={() => navigate(item.path)}
                sx={{
                  textTransform: 'none',
                  fontWeight: isActive(item.path) ? 600 : 400,
                  borderRadius: 2,
                  px: 2,
                  py: 1
                }}
              >
                {item.label}
              </Button>
            ))}
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
};

export default BELNavigation;
