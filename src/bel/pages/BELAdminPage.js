import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Grid,
  Card,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  InputAdornment,
  IconButton,
  Chip,
  Alert,
  CircularProgress,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  useTheme,
  useMediaQuery,
  BottomNavigation,
  BottomNavigationAction,
  Switch,
  FormControlLabel
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { styled } from '@mui/material/styles';
import {
  Search as SearchIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  Visibility as ViewIcon,
  Assessment as AssessmentIcon,
  PersonAdd as PersonAddIcon,
  Menu as MenuIcon,
  Settings as SettingsIcon,
  LockOpen as LockOpenIcon,
  Lock,
  CalendarToday as CalendarTodayIcon,
  Event as EventIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import * as XLSX from 'xlsx';
import belLogo from '../assets/bel_logo.png';
import apiService from '../../services/api';
import belRobustService from '../../services/belRobustService';
import ExcelMappingService from '../../services/ExcelMappingService';
import BELCodesAdmin from '../components/BELCodesAdmin';

// Styled components
const HeaderContainer = styled(Box)(({ theme }) => ({
  backgroundColor: '#1976d2',
  color: 'white',
  padding: theme.spacing(2),
  textAlign: 'center',
  marginBottom: theme.spacing(3)
}));

const AdminContainer = styled(Container)(({ theme }) => ({
  paddingTop: theme.spacing(2),
  paddingBottom: theme.spacing(2),
  paddingLeft: theme.spacing(1),
  paddingRight: theme.spacing(1),
  maxWidth: '100%',
  width: '100%',
  [theme.breakpoints.up('md')]: {
    paddingTop: theme.spacing(3),
    paddingBottom: theme.spacing(3),
    paddingLeft: theme.spacing(3),
    paddingRight: theme.spacing(3),
    maxWidth: '1400px'
  }
}));

const StatsCard = styled(Card)(({ theme }) => ({
  textAlign: 'center',
  padding: theme.spacing(2),
  height: '100%'
}));

const BELAdminPage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const [activeMenu, setActiveMenu] = useState('walkin'); // 'survey', 'walkin', or 'codes'
  const [responses, setResponses] = useState([]);
  const [filteredResponses, setFilteredResponses] = useState([]);
  const [walkinData, setWalkinData] = useState([]);
  const [filteredWalkinData, setFilteredWalkinData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [languageFilter, setLanguageFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('all');
  const [postFilter, setPostFilter] = useState('all');
  const [stats, setStats] = useState({
    total: 0,
    english: 0,
    hindi: 0,
    today: 0,
    thisWeek: 0
  });
  const [walkinStats, setWalkinStats] = useState({
    total: 0,
    locationStats: {},
    postStats: {}
  });
  const [statsView, setStatsView] = useState('location'); // 'location' or 'post'
  const [formConfig, setFormConfig] = useState(null);
  const [isLocationActive, setIsLocationActive] = useState(false);
  
  // Registration control state - loaded from backend
  const [registrationClosed, setRegistrationClosed] = useState(false);
  const [registrationStartDate, setRegistrationStartDate] = useState(null);
  const [registrationEndDate, setRegistrationEndDate] = useState(null);
  const [savingDateRange, setSavingDateRange] = useState(false);

  // Load form configuration and registration status
  useEffect(() => {
    const loadFormConfiguration = async () => {
      try {
        const response = await belRobustService.getFormConfiguration();
        if (response.success && response.data) {
          const parsedConfig = belRobustService.parseFormConfiguration(response.data);
          setFormConfig(parsedConfig);
          
          // Check if there are any active locations
          const hasActiveLocations = parsedConfig.locations && parsedConfig.locations.length > 0;
          setIsLocationActive(hasActiveLocations);
        }
      } catch (error) {
        console.error('Error loading form configuration:', error);
      }
    };

    const loadRegistrationStatus = async () => {
      try {
        const response = await apiService.get('/bel/config/registration-status');
        if (response.success && response.data !== undefined) {
          setRegistrationClosed(response.data);
        }
      } catch (error) {
        console.error('Error loading registration status:', error);
        // If API fails, default to false (open) - admin can retry
        setRegistrationClosed(false);
      }
    };

    const loadRegistrationDateRange = async () => {
      try {
        const response = await apiService.get('/bel/config/registration-date-range');
        if (response.success && response.data) {
          const { startDate, endDate } = response.data;
          // Parse dates assuming they are in IST (Asia/Kolkata) timezone
          if (startDate) {
            const [year, month, day] = startDate.split('-').map(Number);
            // Create date in IST timezone
            const istDate = new Date(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T00:00:00+05:30`);
            setRegistrationStartDate(istDate);
          }
          if (endDate) {
            const [year, month, day] = endDate.split('-').map(Number);
            // Create date in IST timezone
            const istDate = new Date(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T00:00:00+05:30`);
            setRegistrationEndDate(istDate);
          }
        }
      } catch (error) {
        console.error('Error loading registration date range:', error);
      }
    };
    
    loadFormConfiguration();
    loadRegistrationStatus();
    loadRegistrationDateRange();
  }, []);

  // Load data from API
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        if (activeMenu === 'survey') {
          // Get survey statistics
          const statsData = await apiService.get('/bel/survey/statistics');
          if (statsData.success) {
            setStats({
              total: statsData.data.totalResponses || 0,
              english: statsData.data.englishResponses || 0,
              hindi: statsData.data.hindiResponses || 0,
              today: statsData.data.todayResponses || 0,
              thisWeek: statsData.data.thisWeekResponses || 0
            });
          }

          // Get survey responses
          const responsesData = await apiService.post('/bel/survey/responses', {
            page: 0,
            size: 100,
            sortBy: 'submissionTimestamp',
            sortDirection: 'DESC'
          });

          if (responsesData.success) {
            const responseList = responsesData.data.content || [];
            setResponses(responseList);
            setFilteredResponses(responseList);
          }
        } else if (activeMenu === 'walkin') {
          // Get walkin statistics
          const walkinStatsData = await apiService.get('/bel/scanqr/statistics');
          if (walkinStatsData.success || walkinStatsData.data) {
            setWalkinStats(walkinStatsData.data || {
              total: 0,
              locationStats: {},
              postStats: {}
            });
          }

          // Get walkin data
          const walkinDataResponse = await apiService.get('/bel/scanqr/list');
          if (walkinDataResponse.success || walkinDataResponse.data) {
            const dataArray = walkinDataResponse.data || [];
            setWalkinData(dataArray);
            setFilteredWalkinData(dataArray);
          }
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error loading data:', error);
        setLoading(false);
      }
    };

    loadData();
  }, [activeMenu]);

  // Filter data based on active menu
  useEffect(() => {
    if (activeMenu === 'survey') {
      let filtered = responses;

      if (searchTerm) {
        filtered = filtered.filter(response =>
          response.employeeId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          response.department?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }

      if (languageFilter !== 'all') {
        filtered = filtered.filter(response => response.language === languageFilter);
      }

      if (dateFilter) {
        filtered = filtered.filter(response => {
          const responseDate = new Date(response.timestamp).toDateString();
          const filterDate = new Date(dateFilter).toDateString();
          return responseDate === filterDate;
        });
      }

      setFilteredResponses(filtered);
    } else if (activeMenu === 'walkin') {
      let filtered = walkinData;

      if (searchTerm) {
        filtered = filtered.filter(student =>
          student.candidateName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          student.mobileNumber?.includes(searchTerm) ||
          student.rollNumber?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }

      if (dateFilter) {
        filtered = filtered.filter(student => {
          const studentDate = new Date(student.createdDate).toDateString();
          const filterDate = new Date(dateFilter).toDateString();
          return studentDate === filterDate;
        });
      }

      if (isLocationActive && locationFilter !== 'all') {
        filtered = filtered.filter(student => student.location === locationFilter);
      }

      if (postFilter !== 'all') {
        filtered = filtered.filter(student => student.postAppliedFor === postFilter);
      }

      setFilteredWalkinData(filtered);
    }
  }, [activeMenu, responses, walkinData, searchTerm, languageFilter, dateFilter, locationFilter, postFilter, isLocationActive]);

  const handleExport = async () => {
    if (exporting) return;
    
    try {
      setExporting(true);
      if (activeMenu === 'survey') {
        // Build the Excel on the client so every option becomes its own Yes/No
        // column (same format as the bi-annual export). Fetch all matching
        // responses first, paging through the results.
        const baseFilter = {
          searchTerm: searchTerm || null,
          language: languageFilter === 'all' ? null : languageFilter,
          startDate: dateFilter ? new Date(dateFilter).toISOString().split('T')[0] : null,
          endDate: dateFilter ? new Date(dateFilter).toISOString().split('T')[0] : null,
          status: 'all',
          sortBy: 'submissionTimestamp',
          sortDirection: 'DESC'
        };

        const pageSize = 500;
        const allResponses = [];
        let page = 0;
        let totalPages = 1;

        do {
          const resp = await apiService.post('/bel/survey/responses', {
            ...baseFilter,
            page,
            size: pageSize
          });
          const pageData = (resp && resp.data) ? resp.data : {};
          allResponses.push(...(pageData.content || []));
          totalPages = pageData.totalPages || 1;
          page += 1;
        } while (page < totalPages);

        if (!allResponses.length) {
          console.warn('No survey responses to export');
          return;
        }

        const rows = ExcelMappingService.generateBELSurveyExcelData(allResponses);
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'BEL Survey');
        XLSX.writeFile(wb, `bel_employee_survey_${new Date().toISOString().split('T')[0]}.xlsx`);
      } else if (activeMenu === 'walkin') {
        const filterData = {
          searchTerm,
          locationFilter: isLocationActive && locationFilter !== 'all' ? locationFilter : null,
          postFilter: postFilter === 'all' ? null : postFilter,
          dateFilter: dateFilter || null
        };

        const response = await apiService.post('/bel/scanqr/export', filterData, {
          responseType: 'blob'
        });

        if (response && response.data) {
          const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `bel_jammu_walkin_${new Date().toISOString().split('T')[0]}.xlsx`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        }
      }
    } catch (error) {
      console.error('Error exporting data:', error);
    } finally {
      setExporting(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setLoading(true);
      
      // Reload form configuration to get latest active status
      const configResponse = await belRobustService.getFormConfiguration();
      if (configResponse.success && configResponse.data) {
        const parsedConfig = belRobustService.parseFormConfiguration(configResponse.data);
        setFormConfig(parsedConfig);
        const hasActiveLocations = parsedConfig.locations && parsedConfig.locations.length > 0;
        setIsLocationActive(hasActiveLocations);
      }
      
      // Reset filters
      setSearchTerm('');
      setLanguageFilter('all');
      setDateFilter('');
      setLocationFilter('all');
      setPostFilter('all');
      
      if (activeMenu === 'survey') {
        // Get survey statistics
        const statsData = await apiService.get('/bel/survey/statistics');
        if (statsData.success) {
          setStats({
            total: statsData.data.totalResponses || 0,
            english: statsData.data.englishResponses || 0,
            hindi: statsData.data.hindiResponses || 0,
            today: statsData.data.todayResponses || 0,
            thisWeek: statsData.data.thisWeekResponses || 0
          });
        }

        // Get survey responses
        const responsesData = await apiService.post('/bel/survey/responses', {
          page: 0,
          size: 100,
          sortBy: 'submissionTimestamp',
          sortDirection: 'DESC'
        });

        if (responsesData.success) {
          const responseList = responsesData.data.content || [];
          setResponses(responseList);
          setFilteredResponses(responseList);
        }
      } else if (activeMenu === 'walkin') {
        // Get walkin statistics
        const walkinStatsData = await apiService.get('/bel/scanqr/statistics');
        if (walkinStatsData.success || walkinStatsData.data) {
          setWalkinStats(walkinStatsData.data || {
            total: 0,
            locationStats: {},
            postStats: {}
          });
        }

        // Get walkin data
        const walkinDataResponse = await apiService.get('/bel/scanqr/list');
        if (walkinDataResponse.success || walkinDataResponse.data) {
          const dataArray = walkinDataResponse.data || [];
          setWalkinData(dataArray);
          setFilteredWalkinData(dataArray);
        }
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error refreshing data:', error);
      setLoading(false);
    }
  };

  const handleViewResponse = (response) => {
    // TODO: Implement view response functionality
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  const getLanguageLabel = (lang) => {
    return lang === 'en' ? 'English' : 'हिंदी';
  };

  const getStatusColor = (status) => {
    return status === 'completed' ? 'success' : 'warning';
  };

  const getCategoryColor = (category) => {
    const colors = {
      'GEN': 'primary',
      'OBC': 'secondary',
      'EWS': 'success',
      'SC': 'warning',
      'ST': 'error'
    };
    return colors[category] || 'default';
  };

  const handleRegistrationToggle = async (event) => {
    const newValue = event.target.checked;
    
    try {
      // Update on backend
      const response = await apiService.post('/bel/config/registration-status', {
        isClosed: newValue,
        modifiedBy: 'admin'
      });
      
      if (response.success) {
        // Update local state
        setRegistrationClosed(newValue);
        console.log('Registration status updated successfully:', newValue);
      } else {
        console.error('Failed to update registration status:', response.message);
        // Revert the toggle if backend update failed
        event.target.checked = !newValue;
      }
    } catch (error) {
      console.error('Error updating registration status:', error);
      // Revert the toggle if error occurred
      event.target.checked = !newValue;
    }
  };

  const handleSaveDateRange = async () => {
    try {
      setSavingDateRange(true);
      
      // Format dates in Indian timezone (IST) to match backend
      const formatDateIST = (date) => {
        if (!date) return null;
        // Convert to IST (Asia/Kolkata) timezone
        const istDate = new Date(date.toLocaleString("en-US", {timeZone: "Asia/Kolkata"}));
        const year = istDate.getFullYear();
        const month = String(istDate.getMonth() + 1).padStart(2, '0');
        const day = String(istDate.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };
      
      const startDateStr = formatDateIST(registrationStartDate);
      const endDateStr = formatDateIST(registrationEndDate);

      const response = await apiService.post('/bel/config/registration-date-range', {
        startDate: startDateStr,
        endDate: endDateStr,
        modifiedBy: 'admin'
      });
      
      if (response.success) {
        console.log('Registration date range saved successfully');
        // Reload registration status to reflect any auto-changes
        const statusResponse = await apiService.get('/bel/config/registration-status');
        if (statusResponse.success && statusResponse.data !== undefined) {
          setRegistrationClosed(statusResponse.data);
        }
      } else {
        console.error('Failed to save date range:', response.message);
        alert('Failed to save date range: ' + response.message);
      }
    } catch (error) {
      console.error('Error saving date range:', error);
      alert('Error saving date range: ' + error.message);
    } finally {
      setSavingDateRange(false);
    }
  };

  const handleClearDateRange = async () => {
    try {
      setSavingDateRange(true);
      
      const response = await apiService.post('/bel/config/registration-date-range', {
        startDate: null,
        endDate: null,
        modifiedBy: 'admin'
      });
      
      if (response.success) {
        setRegistrationStartDate(null);
        setRegistrationEndDate(null);
        console.log('Registration date range cleared successfully');
      } else {
        console.error('Failed to clear date range:', response.message);
      }
    } catch (error) {
      console.error('Error clearing date range:', error);
    } finally {
      setSavingDateRange(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  const handleMenuClick = (menu) => {
    setActiveMenu(menu);
    if (isMobile) {
      setMobileMenuOpen(false);
    }
  };

  const MenuItems = () => (
    <List sx={{ pt: isMobile ? 0 : 2 }}>
      <ListItem 
        button 
        selected={activeMenu === 'survey'}
        onClick={() => handleMenuClick('survey')}
        sx={{
          mx: 1,
          borderRadius: 1,
          mb: 1,
          '&.Mui-selected': {
            bgcolor: '#1976d2',
            color: 'white',
            '&:hover': {
              bgcolor: '#1565c0'
            }
          }
        }}
      >
        <ListItemIcon sx={{ color: activeMenu === 'survey' ? 'white' : 'inherit' }}>
          <AssessmentIcon />
        </ListItemIcon>
        <ListItemText 
          primary="Employee Survey Data" 
          primaryTypographyProps={{ fontWeight: activeMenu === 'survey' ? 'bold' : 'normal' }}
        />
        <DownloadIcon sx={{ color: activeMenu === 'survey' ? 'white' : 'inherit' }} />
      </ListItem>
      
      <ListItem 
        button 
        selected={activeMenu === 'walkin'}
        onClick={() => handleMenuClick('walkin')}
        sx={{
          mx: 1,
          borderRadius: 1,
          mb: 1,
          '&.Mui-selected': {
            bgcolor: '#1976d2',
            color: 'white',
            '&:hover': {
              bgcolor: '#1565c0'
            }
          }
        }}
      >
        <ListItemIcon sx={{ color: activeMenu === 'walkin' ? 'white' : 'inherit' }}>
          <PersonAddIcon />
        </ListItemIcon>
        <ListItemText 
          primary="Walk In registration" 
          primaryTypographyProps={{ fontWeight: activeMenu === 'walkin' ? 'bold' : 'normal' }}
        />
        <DownloadIcon sx={{ color: activeMenu === 'walkin' ? 'white' : 'inherit' }} />
      </ListItem>
      
      <ListItem 
        button 
        selected={activeMenu === 'codes'}
        onClick={() => handleMenuClick('codes')}
        sx={{
          mx: 1,
          borderRadius: 1,
          mb: 1,
          '&.Mui-selected': {
            bgcolor: '#1976d2',
            color: 'white',
            '&:hover': {
              bgcolor: '#1565c0'
            }
          }
        }}
      >
        <ListItemIcon sx={{ color: activeMenu === 'codes' ? 'white' : 'inherit' }}>
          <SettingsIcon />
        </ListItemIcon>
        <ListItemText 
          primary="Dropdown Management" 
          primaryTypographyProps={{ fontWeight: activeMenu === 'codes' ? 'bold' : 'normal' }}
        />
      </ListItem>
    </List>
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', overflow: 'hidden' }}>
      {/* Single Header */}
      <HeaderContainer>
        <Box display="flex" alignItems="center" justifyContent="center" gap={2}>
          <img src={belLogo} alt="BEL Logo" style={{ height: isMobile ? '40px' : '50px' }} />
          <Box textAlign="center">
            <Typography variant={isMobile ? 'h6' : 'h4'} component="h1">
              BEL Admin
            </Typography>

          </Box>
        </Box>
      </HeaderContainer>

      {/* Main Content Area */}
      <Box sx={{ display: 'flex', flexGrow: 1, overflow: 'hidden' }}>
        {/* Desktop Left Navigation */}
        {!isMobile && (
          <Box sx={{ 
            width: 280, 
            bgcolor: '#f5f5f5', 
            borderRight: '1px solid #e0e0e0'
          }}>
            <MenuItems />
          </Box>
        )}

        {/* Right Content Area */}
        <Box sx={{ 
          flexGrow: 1, 
          display: 'flex', 
          flexDirection: 'column',
          overflow: 'auto',
          pb: isMobile ? 7 : 0
        }}>

          {/* Dynamic Content Based on Menu Selection */}
          <AdminContainer>

          {activeMenu === 'survey' ? (
            // Survey Data Content
            <>
              {/* Statistics Cards */}
              <Grid container spacing={isMobile ? 1 : 3} mb={isMobile ? 2 : 4} justifyContent="center">
                <Grid item xs={12} sm={6} md={4}>
                  <StatsCard>
                    <Typography variant={isMobile ? 'h4' : 'h3'} color="primary">
                      {stats.total}
                    </Typography>
                    <Typography variant={isMobile ? 'body1' : 'h6'} color="text.secondary">
                      Total Responses
                    </Typography>
                  </StatsCard>
                </Grid>
              </Grid>

              {/* Download Action */}
              <Paper sx={{ p: isMobile ? 2 : 3, pt: isMobile ? 4 : 3, mb: isMobile ? 2 : 3, textAlign: 'center' }}>
                <Typography variant="h6" mb={2}>
                  Download Complete Survey Data
                </Typography>
                <Button
                  variant="contained"
                  size="large"
                  startIcon={exporting ? <CircularProgress size={20} color="inherit" /> : <DownloadIcon />}
                  onClick={handleExport}
                  disabled={exporting}
                  sx={{ minWidth: 200 }}
                >
                  {exporting ? 'Downloading...' : 'Download Excel'}
                </Button>
              </Paper>


            </>
          ) : activeMenu === 'walkin' ? (
            // Walk-In Data Content
            <>
              {/* Registration Control Section - Only visible in Walk In registration tab */}
              <Grid container spacing={isMobile ? 2 : 3} sx={{ mb: isMobile ? 2 : 3 }}>
                {/* Manual Control Card */}
                <Grid item xs={12} md={6}>
                  <Paper 
                    elevation={3}
                    sx={{ 
                      p: isMobile ? 2 : 3,
                      height: '100%',
                      background: registrationClosed 
                        ? 'linear-gradient(135deg, #f44336 0%, #d32f2f 100%)'
                        : 'linear-gradient(135deg, #4caf50 0%, #388e3c 100%)',
                      color: 'white',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    <Box display="flex" alignItems="center" gap={2} mb={2}>
                      {registrationClosed ? (
                        <Lock sx={{ fontSize: 40 }} />
                      ) : (
                        <LockOpenIcon sx={{ fontSize: 40 }} />
                      )}
                      <Box>
                        <Typography variant="h5" fontWeight="bold">
                          Manual Control
                        </Typography>
                        <Typography variant="body2" sx={{ opacity: 0.9 }}>
                          {registrationClosed 
                            ? 'Registrations are currently closed' 
                            : 'Registrations are currently open'}
                        </Typography>
                      </Box>
                    </Box>
                    
                    <Box sx={{ 
                      bgcolor: 'rgba(255,255,255,0.15)', 
                      borderRadius: 2, 
                      p: 2,
                      mb: 2
                    }}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={registrationClosed}
                            onChange={handleRegistrationToggle}
                            size="large"
                            sx={{
                              '& .MuiSwitch-switchBase.Mui-checked': {
                                color: '#fff'
                              },
                              '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                                backgroundColor: 'rgba(255,255,255,0.8)'
                              },
                              '& .MuiSwitch-track': {
                                backgroundColor: 'rgba(255,255,255,0.3)'
                              }
                            }}
                          />
                        }
                        label={
                          <Typography variant="h6" fontWeight="bold">
                            {registrationClosed ? 'Closed' : 'Open'}
                          </Typography>
                        }
                        sx={{ m: 0 }}
                      />
                    </Box>

                    <Alert 
                      severity={registrationClosed ? 'warning' : 'success'} 
                      sx={{ 
                        bgcolor: 'rgba(255,255,255,0.2)',
                        color: 'white',
                        '& .MuiAlert-icon': { color: 'white' }
                      }}
                    >
                      {registrationClosed 
                        ? 'New registrations are blocked. Toggle to reopen.' 
                        : 'Users can register. Toggle to close registrations.'}
                    </Alert>
                  </Paper>
                </Grid>

                {/* Automatic Date Control Card */}
                <Grid item xs={12} md={6}>
                  <Paper 
                    elevation={3}
                    sx={{ 
                      p: isMobile ? 2 : 3,
                      height: '100%',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: 'white'
                    }}
                  >
                    <Box display="flex" alignItems="center" gap={2} mb={2}>
                      <CalendarTodayIcon sx={{ fontSize: 40 }} />
                      <Box>
                        <Typography variant="h5" fontWeight="bold">
                          Automatic Control
                        </Typography>
                        <Typography variant="body2" sx={{ opacity: 0.9 }}>
                          Set date range for auto open/close
                        </Typography>
                      </Box>
                    </Box>

                    <LocalizationProvider dateAdapter={AdapterDateFns}>
                      <Grid container spacing={2} sx={{ mb: 2 }}>
                        <Grid item xs={12}>
                          <Box sx={{ 
                            bgcolor: '#e8f5e9', 
                            borderRadius: 2, 
                            p: 1.5,
                            border: '2px solid #4caf50',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1
                          }}>
                            <EventIcon sx={{ color: '#2e7d32', fontSize: 24 }} />
                            <DatePicker
                              label="Start Date"
                              value={registrationStartDate}
                              onChange={(newValue) => setRegistrationStartDate(newValue)}
                              renderInput={(params) => (
                                <TextField 
                                  {...params} 
                                  fullWidth 
                                  size="small"
                                  sx={{ 
                                    '& .MuiInputBase-root': { 
                                      backgroundColor: '#ffffff',
                                      color: '#000',
                                      border: '1px solid #4caf50'
                                    },
                                    '& .MuiInputLabel-root': {
                                      color: '#2e7d32',
                                      fontWeight: 500
                                    },
                                    '& .MuiOutlinedInput-notchedOutline': {
                                      borderColor: '#4caf50'
                                    },
                                    '&:hover .MuiOutlinedInput-notchedOutline': {
                                      borderColor: '#388e3c'
                                    },
                                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                      borderColor: '#2e7d32',
                                      borderWidth: 2
                                    }
                                  }}
                                />
                              )}
                            />
                          </Box>
                        </Grid>
                        <Grid item xs={12}>
                          <Box sx={{ 
                            bgcolor: '#fff3e0', 
                            borderRadius: 2, 
                            p: 1.5,
                            border: '2px solid #ff9800',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1
                          }}>
                            <ScheduleIcon sx={{ color: '#e65100', fontSize: 24 }} />
                            <DatePicker
                              label="End Date"
                              value={registrationEndDate}
                              onChange={(newValue) => setRegistrationEndDate(newValue)}
                              minDate={registrationStartDate}
                              renderInput={(params) => (
                                <TextField 
                                  {...params} 
                                  fullWidth 
                                  size="small"
                                  sx={{ 
                                    '& .MuiInputBase-root': { 
                                      backgroundColor: '#ffffff',
                                      color: '#000',
                                      border: '1px solid #ff9800'
                                    },
                                    '& .MuiInputLabel-root': {
                                      color: '#e65100',
                                      fontWeight: 500
                                    },
                                    '& .MuiOutlinedInput-notchedOutline': {
                                      borderColor: '#ff9800'
                                    },
                                    '&:hover .MuiOutlinedInput-notchedOutline': {
                                      borderColor: '#f57c00'
                                    },
                                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                      borderColor: '#e65100',
                                      borderWidth: 2
                                    }
                                  }}
                                />
                              )}
                            />
                          </Box>
                        </Grid>
                      </Grid>
                    </LocalizationProvider>

                    <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                      <Button
                        variant="contained"
                        onClick={handleSaveDateRange}
                        disabled={savingDateRange}
                        startIcon={savingDateRange ? <CircularProgress size={16} color="inherit" /> : <CheckCircleIcon />}
                        sx={{ 
                          bgcolor: 'rgba(255,255,255,0.25)',
                          color: 'white',
                          flex: 1,
                          minWidth: 120,
                          '&:hover': { bgcolor: 'rgba(255,255,255,0.35)' },
                          '&:disabled': { bgcolor: 'rgba(255,255,255,0.1)' }
                        }}
                      >
                        {savingDateRange ? 'Saving...' : 'Save'}
                      </Button>
                      {(registrationStartDate || registrationEndDate) && (
                        <Button
                          variant="outlined"
                          onClick={handleClearDateRange}
                          disabled={savingDateRange}
                          sx={{ 
                            borderColor: 'rgba(255,255,255,0.5)',
                            color: 'white',
                            flex: 1,
                            minWidth: 120,
                            '&:hover': { 
                              borderColor: 'rgba(255,255,255,0.8)',
                              bgcolor: 'rgba(255,255,255,0.15)'
                            }
                          }}
                        >
                          Clear
                        </Button>
                      )}
                    </Box>
                  </Paper>
                </Grid>

                {/* Current Configuration Info Card */}
                {(registrationStartDate || registrationEndDate) && (
                  <Grid item xs={12}>
                    <Paper 
                      elevation={2}
                      sx={{ 
                        p: isMobile ? 2 : 2.5,
                        background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
                        border: '2px solid #2196f3'
                      }}
                    >
                      <Box display="flex" alignItems="flex-start" gap={2}>
                        <InfoIcon sx={{ color: '#1976d2', fontSize: 28, mt: 0.5 }} />
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="h6" fontWeight="bold" color="primary" gutterBottom>
                            Current Configuration
                          </Typography>
                          <Typography variant="body1" sx={{ mb: 1, color: '#424242' }}>
                            {registrationStartDate && registrationEndDate ? (
                              <>
                                Registration will be <strong style={{ color: '#1976d2' }}>open</strong> from{' '}
                                <strong>{registrationStartDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</strong> to{' '}
                                <strong>{registrationEndDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</strong>
                                {' '}(inclusive), and <strong style={{ color: '#d32f2f' }}>closed</strong> outside this period.
                              </>
                            ) : registrationStartDate ? (
                              <>
                                Registration will be <strong style={{ color: '#1976d2' }}>open</strong> from{' '}
                                <strong>{registrationStartDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</strong> onwards.
                              </>
                            ) : (
                              <>
                                Registration will be <strong style={{ color: '#d32f2f' }}>closed</strong> after{' '}
                                <strong>{registrationEndDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</strong>.
                              </>
                            )}
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#616161', fontStyle: 'italic' }}>
                            <strong>Note:</strong> Status is checked in Indian Standard Time (IST) when the registration form is opened. 
                            Date range takes priority over manual toggle.
                          </Typography>
                        </Box>
                      </Box>
                    </Paper>
                  </Grid>
                )}
              </Grid>

              {/* Statistics Toggle */}
              <Paper sx={{ p: 2, mb: 2, textAlign: 'center' }}>
                <Typography variant="h6" mb={2}>Statistics View</Typography>
                <Button
                  variant={statsView === 'location' ? 'contained' : 'outlined'}
                  onClick={() => setStatsView('location')}
                  sx={{ mr: 1 }}
                >
                  Location Wise
                </Button>
                <Button
                  variant={statsView === 'post' ? 'contained' : 'outlined'}
                  onClick={() => setStatsView('post')}
                >
                  Post Wise
                </Button>
              </Paper>

              {/* Statistics Cards */}
              <Grid container spacing={isMobile ? 1 : 3} mb={isMobile ? 2 : 4}>
                <Grid item xs={12} sm={6} md={3}>
                  <StatsCard>
                    <Typography variant={isMobile ? 'h5' : 'h4'} color="primary">
                      {walkinStats.total}
                    </Typography>
                    <Typography variant={isMobile ? 'caption' : 'body2'} color="text.secondary">
                      Total Registrations
                    </Typography>
                  </StatsCard>
                </Grid>
                {statsView === 'location' ? (
                  // Location-wise statistics
                  Object.entries(walkinStats.locationStats || {}).map(([location, count]) => (
                    <Grid item xs={12} sm={6} md={3} key={location}>
                      <StatsCard>
                        <Typography variant={isMobile ? 'h5' : 'h4'} color="primary">
                          {count}
                        </Typography>
                        <Typography variant={isMobile ? 'caption' : 'body2'} color="text.secondary">
                          {location}
                        </Typography>
                      </StatsCard>
                    </Grid>
                  ))
                ) : (
                  // Post-wise statistics
                  Object.entries(walkinStats.postStats || {}).map(([post, count]) => (
                    <Grid item xs={12} sm={6} md={3} key={post}>
                      <StatsCard>
                        <Typography variant={isMobile ? 'h5' : 'h4'} color="primary">
                          {count}
                        </Typography>
                        <Typography variant={isMobile ? 'caption' : 'body2'} color="text.secondary">
                          {post}
                        </Typography>
                      </StatsCard>
                    </Grid>
                  ))
                )}
              </Grid>

              {/* Filters and Actions */}
              <Paper sx={{ p: isMobile ? 2 : 3, pt: isMobile ? 4 : 3, mb: isMobile ? 2 : 3 }}>
                <Grid container spacing={isMobile ? 1 : 2} alignItems="center">
                  <Grid item xs={12} md={isLocationActive ? 4 : 5}>
                    <TextField
                      fullWidth
                      size="small"
                      placeholder="Search by Name, Mobile, or Roll Number"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <SearchIcon />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>
                  {isLocationActive && (
                    <Grid item xs={12} md={2}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Location</InputLabel>
                        <Select
                          value={locationFilter}
                          label="Location"
                          onChange={(e) => setLocationFilter(e.target.value)}
                        >
                          <MenuItem value="all">All Locations</MenuItem>
                          {Array.from(new Set(walkinData.map(student => student.location))).filter(Boolean).map((location) => (
                            <MenuItem key={location} value={location}>
                              {location}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                  )}
                  <Grid item xs={12} md={2}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Post</InputLabel>
                      <Select
                        value={postFilter}
                        label="Post"
                        onChange={(e) => setPostFilter(e.target.value)}
                      >
                        <MenuItem value="all">All Posts</MenuItem>
                        {Array.from(new Set(walkinData.map(student => student.postAppliedFor))).filter(Boolean).map((post) => (
                          <MenuItem key={post} value={post}>
                            {post}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={2}>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<RefreshIcon />}
                      onClick={handleRefresh}
                      fullWidth
                    >
                      Refresh
                    </Button>
                  </Grid>
                  <Grid item xs={12} md={isLocationActive ? 2 : 3}>
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={exporting ? <CircularProgress size={16} color="inherit" /> : <DownloadIcon />}
                      onClick={handleExport}
                      disabled={exporting}
                      fullWidth
                    >
                      {exporting ? 'Exporting...' : 'Export'}
                    </Button>
                  </Grid>
                </Grid>
              </Paper>

              {/* Walk-In Data Table */}
              <Paper>
                <TableContainer sx={{ overflowX: 'auto' }}>
                  <Table size={isMobile ? 'small' : 'medium'}>
                    <TableHead>
                      <TableRow>
                        <TableCell>Roll Number</TableCell>
                        <TableCell>Name</TableCell>
                        <TableCell>Mobile</TableCell>
                        <TableCell>Category</TableCell>
                        {isLocationActive && !isMobile && <TableCell>Location</TableCell>}
                        <TableCell>Post Applied For</TableCell>
                        {!isMobile && <TableCell>Date of Birth</TableCell>}
                        {!isMobile && <TableCell>Challan Number</TableCell>}
                        {!isMobile && <TableCell>PwBD</TableCell>}
                        <TableCell>Reg. Date</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredWalkinData.map((student) => (
                        <TableRow key={student.id}>
                          <TableCell>
                            <Typography variant={isMobile ? 'caption' : 'body2'} fontWeight="bold">
                              {student.rollNumber}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant={isMobile ? 'caption' : 'body2'}>
                              {student.candidateName}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant={isMobile ? 'caption' : 'body2'}>
                              {student.mobileNumber}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={student.category}
                              size="small"
                              color={getCategoryColor(student.category)}
                            />
                          </TableCell>
                          {isLocationActive && !isMobile && (
                            <TableCell>{student.location || 'N/A'}</TableCell>
                          )}
                          <TableCell>
                            <Typography variant={isMobile ? 'caption' : 'body2'}>
                              {student.postAppliedFor}
                            </Typography>
                          </TableCell>
                          {!isMobile && <TableCell>{student.dateOfBirth}</TableCell>}
                          {!isMobile && (
                            <TableCell>
                              {student.category === 'SC' || student.category === 'ST'
                                ? 'Exempted'
                                : student.challanNumber || 'N/A'
                              }
                            </TableCell>
                          )}
                          {!isMobile && (
                            <TableCell>
                              <Chip
                                label={student.pwbd || 'N/A'}
                                size="small"
                                color={student.pwbd === 'Yes' ? 'error' : 'default'}
                              />
                            </TableCell>
                          )}
                          <TableCell>
                            <Typography variant={isMobile ? 'caption' : 'body2'}>
                              {formatDate(student.createdDate)}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                      {filteredWalkinData.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={isMobile ? 6 : (isLocationActive ? 10 : 9)} align="center">
                            <Typography variant="body2" color="text.secondary">
                              No data found
                            </Typography>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>

              {/* Info Alert */}
              <Alert severity="info" sx={{ mt: 3 }}>
                Walk-in registration data. Use filters to search and export data as needed.
              </Alert>
            </>
          ) : activeMenu === 'codes' ? (
            // Codes Management Content
            <BELCodesAdmin />
          ) : null}
          </AdminContainer>
        </Box>
      </Box>

      {/* Mobile Bottom Navigation */}
      {isMobile && (
        <BottomNavigation
          value={activeMenu}
          onChange={(event, newValue) => setActiveMenu(newValue)}
          sx={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 1000,
            borderTop: '1px solid #e0e0e0'
          }}
        >
          <BottomNavigationAction
            label="Survey Data"
            value="survey"
            icon={<AssessmentIcon />}
          />
          <BottomNavigationAction
            label="Walk In registration"
            value="walkin"
            icon={<PersonAddIcon />}
          />
          <BottomNavigationAction
            label="Dropdowns"
            value="codes"
            icon={<SettingsIcon />}
          />
        </BottomNavigation>
      )}
    </Box>
  );
};

export default BELAdminPage; 
