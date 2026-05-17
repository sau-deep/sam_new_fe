import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  IconButton,
  Chip,
  Alert,
  Snackbar,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tabs,
  Tab
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import apiService from '../../services/api';

const BELCodesAdmin = () => {
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState(''); // 'code' or 'value'
  const [editingItem, setEditingItem] = useState(null);
  const [selectedCode, setSelectedCode] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const [codeForm, setCodeForm] = useState({
    codeType: '',
    codeName: '',
    description: '',
    isActive: true,
    isHierarchical: false,
    parentCodeType: '',
    displayOrder: 0
  });

  const [valueForm, setValueForm] = useState({
    codeId: '',
    valueCode: '',
    valueName: '',
    valueDescription: '',
    parentValueCode: '',
    additionalData: '',
    isActive: true,
    displayOrder: 0
  });

  useEffect(() => {
    loadCodes();
  }, []);

  // Debug selectedCode changes
  useEffect(() => {
  }, [selectedCode]);

  const loadCodes = async () => {
    try {
      setLoading(true);
      const response = await apiService.get('/bel/codes/admin/codes');
      if (response.success) {
        setCodes(response.data || []);
      } else {
        showSnackbar('Failed to load codes', 'error');
      }
    } catch (error) {
      console.error('Error loading codes:', error);
      showSnackbar('Error loading codes', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const openCodeDialog = (code = null) => {
    setDialogType('code');
    setEditingItem(code);
    if (code) {
      setCodeForm({
        codeType: code.codeType,
        codeName: code.codeName,
        description: code.description,
        isActive: code.isActive,
        isHierarchical: code.isHierarchical,
        parentCodeType: code.parentCodeType || '',
        displayOrder: code.displayOrder
      });
    } else {
      setCodeForm({
        codeType: '',
        codeName: '',
        description: '',
        isActive: true,
        isHierarchical: false,
        parentCodeType: '',
        displayOrder: 0
      });
    }
    setDialogOpen(true);
  };

  const openValueDialog = (codeId, value = null) => {
    setDialogType('value');
    setEditingItem(value);
    
    // Find and set the selected code to enable hierarchical parent selection
    const code = codes.find(c => c.id === codeId);
    setSelectedCode(code);
    
    if (value) {
      setValueForm({
        codeId: value.codeId,
        valueCode: value.valueCode,
        valueName: value.valueName,
        valueDescription: value.valueDescription,
        parentValueCode: value.parentValueCode || '',
        additionalData: value.additionalData || '',
        isActive: value.isActive,
        displayOrder: value.displayOrder
      });
    } else {
      setValueForm({
        codeId: codeId,
        valueCode: '',
        valueName: '',
        valueDescription: '',
        parentValueCode: '',
        additionalData: '',
        isActive: true,
        displayOrder: 0
      });
    }
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    try {
      let response;
      if (dialogType === 'code') {
        if (editingItem) {
          response = await apiService.put(`/bel/codes/admin/codes/${editingItem.id}`, codeForm);
        } else {
          response = await apiService.post('/bel/codes/admin/codes', codeForm);
        }
      } else {
        if (editingItem) {
          response = await apiService.put(`/bel/codes/admin/values/${editingItem.id}`, valueForm);
        } else {
          response = await apiService.post('/bel/codes/admin/values', valueForm);
        }
      }

      if (response.success) {
        showSnackbar(
          `${dialogType === 'code' ? 'Code' : 'Value'} ${editingItem ? 'updated' : 'created'} successfully`
        );
        setDialogOpen(false);
        loadCodes();
      } else {
        showSnackbar(response.message || 'Operation failed', 'error');
      }
    } catch (error) {
      console.error('Error saving:', error);
      showSnackbar('Error saving changes', 'error');
    }
  };

  const handleDelete = async (type, id) => {
    if (!window.confirm(`Are you sure you want to delete this ${type}?`)) {
      return;
    }

    try {
      const endpoint = type === 'code' 
        ? `/bel/codes/admin/codes/${id}` 
        : `/bel/codes/admin/values/${id}`;
      
      const response = await apiService.delete(endpoint);
      if (response.success) {
        showSnackbar(`${type === 'code' ? 'Code' : 'Value'} deleted successfully`);
        loadCodes();
      } else {
        showSnackbar(response.message || 'Delete failed', 'error');
      }
    } catch (error) {
      console.error('Error deleting:', error);
      showSnackbar('Error deleting item', 'error');
    }
  };

  const getAvailableParentCodes = () => {
    // Return all active codes that can be used as parent code types
    // A code can be a parent if it's active and not the same as the current code being edited
    return codes.filter(code => code.isActive);
  };

  const getParentValues = (codeId) => {
    const code = codes.find(c => c.id === codeId);
    if (!code || !code.isHierarchical || !code.parentCodeType) {
      return [];
    }
    
    const parentCode = codes.find(c => c.codeType === code.parentCodeType);
    const parentValues = parentCode ? parentCode.codeValues || [] : [];
    return parentValues;
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          BEL Dropdown Management
        </Typography>
        <Box>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadCodes}
            sx={{ mr: 2 }}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => openCodeDialog()}
          >
            Add Code Type
          </Button>
        </Box>
      </Box>

      <Alert severity="info" sx={{ mb: 3 }}>
        <strong>Dynamic System:</strong> Manage all dropdown values dynamically. 
        Code Types define dropdown categories (POST, QUALIFICATION, etc.), 
        and Code Values are the actual dropdown options.
      </Alert>

      {codes.length === 0 ? (
        <Alert severity="info">No code types found. Create your first code type to get started.</Alert>
      ) : (
        codes.map((code) => (
          <Accordion key={code.id} sx={{ mb: 2 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                <Typography variant="h6" sx={{ flexGrow: 1 }}>
                  {code.codeName} ({code.codeType})
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {code.isHierarchical && (
                    <Chip label="Hierarchical" color="primary" size="small" />
                  )}
                  <Chip 
                    label={code.isActive ? 'Active' : 'Inactive'} 
                    color={code.isActive ? 'success' : 'default'}
                    size="small"
                  />
                </Box>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={3}>
                {/* Code Details */}
                <Grid item xs={12} md={4}>
                  <Card>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="h6">Code Type Details</Typography>
                        <Box>
                          <IconButton onClick={() => openCodeDialog(code)} size="small">
                            <EditIcon />
                          </IconButton>
                          <IconButton onClick={() => handleDelete('code', code.id)} size="small" color="error">
                            <DeleteIcon />
                          </IconButton>
                        </Box>
                      </Box>
                      <Typography sx={{ mb: 1 }}><strong>Type:</strong> {code.codeType}</Typography>
                      <Typography sx={{ mb: 1 }}><strong>Description:</strong> {code.description}</Typography>
                      <Typography sx={{ mb: 1 }}><strong>Is Hierarchical:</strong> {code.isHierarchical ? 'Yes' : 'No'}</Typography>
                      {code.parentCodeType && (
                        <Typography sx={{ mb: 1 }}><strong>Parent Code Type:</strong> {code.parentCodeType}</Typography>
                      )}
                      <Typography><strong>Display Order:</strong> {code.displayOrder}</Typography>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Code Values */}
                <Grid item xs={12} md={8}>
                  <Card>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="h6">Values ({code.codeValues?.length || 0})</Typography>
                        <Button
                          variant="contained"
                          size="small"
                          startIcon={<AddIcon />}
                          onClick={() => openValueDialog(code.id)}
                        >
                          Add Value
                        </Button>
                      </Box>
                      {code.codeValues && code.codeValues.length > 0 ? (
                        <TableContainer component={Paper} sx={{ maxHeight: 400, border: '1px solid #e0e0e0', width: '100%' }}>
                          <Table size="small" stickyHeader sx={{ tableLayout: 'fixed', width: '100%' }}>
                            <TableHead>
                              <TableRow>
                                <TableCell sx={{ 
                                  fontWeight: 'bold', 
                                  backgroundColor: '#f5f5f5',
                                  width: code.isHierarchical ? '20%' : '25%'
                                }}>Code</TableCell>
                                <TableCell sx={{ 
                                  fontWeight: 'bold', 
                                  backgroundColor: '#f5f5f5',
                                  width: code.isHierarchical ? '35%' : '45%'
                                }}>Name</TableCell>
                                {code.isHierarchical && (
                                  <TableCell sx={{ 
                                    fontWeight: 'bold', 
                                    backgroundColor: '#f5f5f5',
                                    width: '20%'
                                  }}>Parent</TableCell>
                                )}
                                <TableCell sx={{ 
                                  fontWeight: 'bold', 
                                  backgroundColor: '#f5f5f5',
                                  width: '15%'
                                }}>Status</TableCell>
                                <TableCell sx={{ 
                                  fontWeight: 'bold', 
                                  backgroundColor: '#f5f5f5',
                                  width: code.isHierarchical ? '10%' : '15%'
                                }}>Actions</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {code.codeValues.map((value, index) => (
                                <TableRow key={value.id} sx={{ '&:nth-of-type(odd)': { backgroundColor: '#fafafa' } }}>
                                  <TableCell sx={{ 
                                    fontFamily: 'monospace', 
                                    fontSize: '0.85rem',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    maxWidth: 0
                                  }}>
                                    {value.valueCode}
                                  </TableCell>
                                  <TableCell sx={{ 
                                    fontWeight: 500,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    maxWidth: 0
                                  }}>
                                    {value.valueName}
                                  </TableCell>
                                  {code.isHierarchical && (
                                    <TableCell sx={{ 
                                      fontFamily: 'monospace', 
                                      fontSize: '0.85rem',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap',
                                      maxWidth: 0
                                    }}>
                                      {value.parentValueCode || '-'}
                                    </TableCell>
                                  )}
                                  <TableCell>
                                    <Chip 
                                      label={value.isActive ? 'Active' : 'Inactive'} 
                                      color={value.isActive ? 'success' : 'default'}
                                      size="small"
                                      sx={{ minWidth: 70 }}
                                    />
                                  </TableCell>
                                  <TableCell sx={{ padding: '4px 8px' }}>
                                    <Box sx={{ display: 'flex', gap: 0.25, justifyContent: 'center' }}>
                                      <IconButton 
                                        onClick={() => openValueDialog(code.id, value)} 
                                        size="small"
                                        color="primary"
                                        sx={{ padding: '4px' }}
                                      >
                                        <EditIcon fontSize="small" />
                                      </IconButton>
                                      <IconButton 
                                        onClick={() => handleDelete('value', value.id)} 
                                        size="small" 
                                        color="error"
                                        sx={{ padding: '4px' }}
                                      >
                                        <DeleteIcon fontSize="small" />
                                      </IconButton>
                                    </Box>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      ) : (
                        <Box sx={{ 
                          textAlign: 'center', 
                          py: 4, 
                          border: '2px dashed #e0e0e0', 
                          borderRadius: 1,
                          backgroundColor: '#fafafa'
                        }}>
                          <Typography color="text.secondary" sx={{ mb: 2 }}>
                            No values added yet.
                          </Typography>
                          <Button
                            variant="outlined"
                            startIcon={<AddIcon />}
                            onClick={() => openValueDialog(code.id)}
                          >
                            Add First Value
                          </Button>
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>
        ))
      )}

      {/* Dialog for Add/Edit */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth={false} sx={{ '& .MuiDialog-paper': { minWidth: '600px', maxWidth: '700px' } }}>
        <DialogTitle sx={{ backgroundColor: '#f5f5f5', borderBottom: '1px solid #e0e0e0' }}>
          <Typography variant="h6" component="div">
            {editingItem ? 'Edit' : 'Add'} {dialogType === 'code' ? 'Code Type' : 'Code Value'}
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ pt: 2, pb: 1 }}>
          {dialogType === 'code' ? (
            <Grid container spacing={2} sx={{ mt: 0 }}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Code Type"
                  value={codeForm.codeType}
                  onChange={(e) => setCodeForm({ ...codeForm, codeType: e.target.value.toUpperCase() })}
                  helperText="e.g., POST, CATEGORY, LOCATION"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Code Name"
                  value={codeForm.codeName}
                  onChange={(e) => setCodeForm({ ...codeForm, codeName: e.target.value })}
                  helperText="e.g., Posts, Categories, Locations"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Description"
                  value={codeForm.description}
                  onChange={(e) => setCodeForm({ ...codeForm, description: e.target.value })}
                  multiline
                  rows={2}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={codeForm.isHierarchical}
                      onChange={(e) => setCodeForm({ ...codeForm, isHierarchical: e.target.checked })}
                    />
                  }
                  label="Is Hierarchical (depends on parent)"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={codeForm.isActive}
                      onChange={(e) => setCodeForm({ ...codeForm, isActive: e.target.checked })}
                    />
                  }
                  label="Active"
                />
              </Grid>
              {codeForm.isHierarchical && (
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Parent Code Type</InputLabel>
                    <Select
                      value={codeForm.parentCodeType}
                      label="Parent Code Type"
                      onChange={(e) => setCodeForm({ ...codeForm, parentCodeType: e.target.value })}
                    >
                      {getAvailableParentCodes().map((code) => (
                        <MenuItem key={code.id} value={code.codeType}>
                          {code.codeName} ({code.codeType})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              )}
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Display Order"
                  type="number"
                  value={codeForm.displayOrder}
                  onChange={(e) => setCodeForm({ ...codeForm, displayOrder: parseInt(e.target.value) || 0 })}
                />
              </Grid>
            </Grid>
          ) : (
            <Grid container spacing={2} sx={{ mt: 0 }}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Value Code"
                  value={valueForm.valueCode}
                  onChange={(e) => setValueForm({ ...valueForm, valueCode: e.target.value.toUpperCase() })}
                  helperText="e.g., ITI_APP, UR, BHOPAL"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Value Name"
                  value={valueForm.valueName}
                  onChange={(e) => setValueForm({ ...valueForm, valueName: e.target.value })}
                  helperText="e.g., ITI Apprentice, Unreserved, Bhopal"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Description"
                  value={valueForm.valueDescription}
                  onChange={(e) => setValueForm({ ...valueForm, valueDescription: e.target.value })}
                />
              </Grid>
              {(() => {
                // Check if we should show parent selection
                const shouldShow = selectedCode?.isHierarchical || 
                  (valueForm.codeId && codes.find(c => c.id === valueForm.codeId)?.isHierarchical);
                return shouldShow;
              })() && (
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Parent Value</InputLabel>
                    <Select
                      value={valueForm.parentValueCode}
                      label="Parent Value"
                      onChange={(e) => {
                        setValueForm({ ...valueForm, parentValueCode: e.target.value });
                      }}
                    >
                      <MenuItem value="">
                        <em>Select Parent Value</em>
                      </MenuItem>
                      {getParentValues(selectedCode?.id || valueForm.codeId).map((value) => (
                        <MenuItem key={value.id} value={value.valueCode}>
                          {value.valueName} ({value.valueCode})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              )}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Additional Data (JSON)"
                  value={valueForm.additionalData}
                  onChange={(e) => setValueForm({ ...valueForm, additionalData: e.target.value })}
                  multiline
                  rows={2}
                  helperText='e.g., {"qualificationRequired": "ITI", "completionYearLabel": "ITI Completion year"}'
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Display Order"
                  type="number"
                  value={valueForm.displayOrder}
                  onChange={(e) => setValueForm({ ...valueForm, displayOrder: parseInt(e.target.value) || 0 })}
                />
              </Grid>
              <Grid item xs={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={valueForm.isActive}
                      onChange={(e) => setValueForm({ ...valueForm, isActive: e.target.checked })}
                    />
                  }
                  label="Active"
                />
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, backgroundColor: '#f9f9f9', borderTop: '1px solid #e0e0e0' }}>
          <Button 
            onClick={() => setDialogOpen(false)}
            variant="outlined"
            sx={{ mr: 2 }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained"
            color="primary"
          >
            {editingItem ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default BELCodesAdmin;
