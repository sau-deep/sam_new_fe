import React, { useState, useEffect } from 'react';
import apiService from '../../services/api';
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
  Select,
  MenuItem,
  TextField,
  InputAdornment,
  Alert,
  CircularProgress,
  Chip
} from '@mui/material';
import { styled } from '@mui/material/styles';
import {
  Search as SearchIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import belLogo from '../assets/bel_logo.png';

// Styled components
const HeaderContainer = styled(Box)(({ theme }) => ({
  backgroundColor: '#1976d2',
  color: 'white',
  padding: theme.spacing(2),
  textAlign: 'center',
  marginBottom: theme.spacing(3)
}));

const AdminContainer = styled(Container)(({ theme }) => ({
  paddingTop: theme.spacing(3),
  paddingBottom: theme.spacing(3),
  maxWidth: '1400px'
}));

const StatsCard = styled(Card)(({ theme }) => ({
  textAlign: 'center',
  padding: theme.spacing(2),
  height: '100%'
}));

const BELWalkInAdminPage = () => {
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);
  
  // Filter states
  const [nameFilter, setNameFilter] = useState('');
  const [phoneFilter, setPhoneFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');

  const [stats, setStats] = useState({
    total: 0,
    gen: 0,
    obc: 0,
    ews: 0,
    sc: 0,
    st: 0,
    today: 0
  });

  // Load data from API
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Get statistics
      const statsData = await apiService.get('/bel/scanqr/statistics');
      if (statsData.success) {
        setStats(statsData.data);
      }

      // Get all students
      const studentsData = await apiService.get('/bel/scanqr/list');
      if (studentsData.success) {
        setStudents(studentsData.data || []);
        setFilteredStudents(studentsData.data || []);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error loading data:', error);
      setLoading(false);
    }
  };

  // Filter students
  useEffect(() => {
    let filtered = students;

    if (nameFilter) {
      filtered = filtered.filter(student =>
        student.candidateName.toLowerCase().includes(nameFilter.toLowerCase())
      );
    }

    if (phoneFilter) {
      filtered = filtered.filter(student =>
        student.mobileNumber.includes(phoneFilter)
      );
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(student => student.category === categoryFilter);
    }

    if (dateFilter) {
      filtered = filtered.filter(student => {
        const studentDate = new Date(student.createdDate).toDateString();
        const filterDate = new Date(dateFilter).toDateString();
        return studentDate === filterDate;
      });
    }

    setFilteredStudents(filtered);
  }, [students, nameFilter, phoneFilter, categoryFilter, dateFilter]);

  const handleExport = async () => {
    try {
      setExportLoading(true);
      
      const filterData = {
        nameFilter: nameFilter || null,
        phoneFilter: phoneFilter || null,
        categoryFilter: categoryFilter === 'all' ? null : categoryFilter,
        dateFilter: dateFilter || null
      };

      const response = await apiService.post('/bel/scanqr/export', filterData, {
        responseType: 'blob'
      });

      if (response) {
        const blob = new Blob([response], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `bel_walkin_students_${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        console.error('Export failed');
      }
    } catch (error) {
      console.error('Error exporting data:', error);
    } finally {
      setExportLoading(false);
    }
  };

  const handleRefresh = () => {
    loadData();
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
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

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <HeaderContainer>
        <Box display="flex" alignItems="center" justifyContent="center" gap={2}>
          <img src={belLogo} alt="BEL Logo" style={{ height: '50px' }} />
          <Box>
            <Typography variant="h4" component="h1">
              BEL Walk-In Registration Admin
            </Typography>
            <Typography variant="subtitle1">
              Student Registration Management
            </Typography>
          </Box>
        </Box>
      </HeaderContainer>

      {/* Admin Dashboard */}
      <AdminContainer>
        {/* Statistics Cards */}
        <Grid container spacing={3} mb={4}>
          <Grid item xs={12} sm={6} md={2}>
            <StatsCard>
              <Typography variant="h4" color="primary">
                {stats.total}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Registrations
              </Typography>
            </StatsCard>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <StatsCard>
              <Typography variant="h4" color="primary">
                {stats.gen}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                GEN
              </Typography>
            </StatsCard>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <StatsCard>
              <Typography variant="h4" color="primary">
                {stats.obc}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                OBC
              </Typography>
            </StatsCard>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <StatsCard>
              <Typography variant="h4" color="primary">
                {stats.ews}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                EWS
              </Typography>
            </StatsCard>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <StatsCard>
              <Typography variant="h4" color="primary">
                {stats.sc}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                SC
              </Typography>
            </StatsCard>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <StatsCard>
              <Typography variant="h4" color="primary">
                {stats.st}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                ST
              </Typography>
            </StatsCard>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <StatsCard>
              <Typography variant="h4" color="primary">
                {stats.pwbd || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                PwBD
              </Typography>
            </StatsCard>
          </Grid>
        </Grid>

        {/* Filters and Actions */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                placeholder="Search by Name"
                value={nameFilter}
                onChange={(e) => setNameFilter(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                placeholder="Search by Phone Number"
                value={phoneFilter}
                onChange={(e) => setPhoneFilter(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <Select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                >
                  <MenuItem value="all">All Categories</MenuItem>
                  <MenuItem value="GEN">GEN</MenuItem>
                  <MenuItem value="OBC">OBC</MenuItem>
                  <MenuItem value="EWS">EWS</MenuItem>
                  <MenuItem value="SC">SC</MenuItem>
                  <MenuItem value="ST">ST</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <TextField
                fullWidth
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <Box display="flex" gap={1}>
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={handleRefresh}
                  fullWidth
                >
                  Refresh
                </Button>
                <Button
                  variant="contained"
                  startIcon={<DownloadIcon />}
                  onClick={handleExport}
                  disabled={exportLoading}
                  fullWidth
                >
                  {exportLoading ? <CircularProgress size={20} /> : 'Export Excel'}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Paper>

        {/* Students Table */}
        <Paper>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Roll Number</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Mobile Number</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell>Location</TableCell>
                  <TableCell>Post Applied For</TableCell>
                  <TableCell>Date of Birth</TableCell>
                  <TableCell>Challan Number</TableCell>
                  <TableCell>PwBD</TableCell>
                  <TableCell>Registration Date</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredStudents.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold">
                        {student.rollNumber}
                      </Typography>
                    </TableCell>
                    <TableCell>{student.candidateName}</TableCell>
                    <TableCell>{student.mobileNumber}</TableCell>
                    <TableCell>
                      <Chip
                        label={student.category}
                        size="small"
                        color={getCategoryColor(student.category)}
                      />
                    </TableCell>
                    <TableCell>{student.location}</TableCell>
                    <TableCell>{student.postAppliedFor}</TableCell>
                    <TableCell>{student.dateOfBirth}</TableCell>
                    <TableCell>
                      {student.category === 'SC' || student.category === 'ST'
                        ? 'Exempted'
                        : student.challanNumber || 'N/A'
                      }
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={student.pwbd || 'N/A'}
                        size="small"
                        color={student.pwbd === 'Yes' ? 'error' : 'default'}
                      />
                    </TableCell>
                    <TableCell>{formatDate(student.createdDate)}</TableCell>
                  </TableRow>
                ))}
                {filteredStudents.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10} align="center">
                      <Typography variant="body2" color="text.secondary">
                        No students found
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
          This page shows all walk-in registrations. Use filters to search and export data as needed.
        </Alert>
      </AdminContainer>
    </Box>
  );
};

export default BELWalkInAdminPage; 