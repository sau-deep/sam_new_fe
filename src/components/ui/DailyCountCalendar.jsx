import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  IconButton,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
} from '@mui/material';
import { CalendarToday, DateRange, Today } from '@mui/icons-material';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import dayjs from 'dayjs';
import { getDailyCounts, getDailyCountsWithFallback, fetchDailyCountsByDateRange } from '../../utils/dailySurveyCount';
import apiService from '../../services/api';

// Color schemes for each form type
const FORM_COLORS = {
  'household': {
    primary: '#8e44ad',
    gradient: 'linear-gradient(135deg, #8e44ad 0%, #9b59b6 100%)',
    hover: '#7d3c98'
  },
  'concurrent': {
    primary: '#3498db',
    gradient: 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)',
    hover: '#2980b9'
  },
  'followup': {
    primary: '#e74c3c',
    gradient: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
    hover: '#c0392b'
  },
  'routine': {
    primary: '#16a085',
    gradient: 'linear-gradient(135deg, #16a085 0%, #1abc9c 100%)',
    hover: '#138d75'
  }
};

const DailyCountCalendar = ({ open, onClose, formType = 'routine' }) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dateRange, setDateRange] = useState([null, null]);
  const [viewMode, setViewMode] = useState('single'); // 'single' or 'range'
  const [dailyCounts, setDailyCounts] = useState({});
  const [syncing, setSyncing] = useState(false);

  // Get form display name and colors
  const formDisplayNames = {
    'household': 'Household Questionnaire',
    'concurrent': 'Concurrent Assessment',
    'followup': 'Follow-Up Assessment',
    'routine': 'Routine Monitoring'
  };
  const formDisplayName = formDisplayNames[formType] || 'Survey';
  const colors = FORM_COLORS[formType] || FORM_COLORS['routine'];

  // Fetch and sync data when dialog opens.
  //
  // The backend is the single source of truth here — the same data the "Today"
  // card reads. We pull the whole history in one grouped range query so every
  // cell (today and past days) matches the card. localStorage is only a
  // fallback for the offline case; it used to be the primary source, which is
  // what let the calendar drift below the card (offline uploads, multi-device,
  // and sync races never updated the local cache).
  useEffect(() => {
    if (open) {
      const loadData = async () => {
        setSyncing(true);
        try {
          const today = new Date();
          const start = new Date(today);
          start.setFullYear(start.getFullYear() - 2); // cover all realistic history
          const startStr = formatDateStr(start);
          const endStr = formatDateStr(today);

          const counts = await fetchDailyCountsByDateRange(apiService, startStr, endStr, formType);
          if (counts && Object.keys(counts).length > 0) {
            setDailyCounts(counts);
          } else {
            // Empty backend result (or offline) — fall back to cached counts.
            setDailyCounts(await getDailyCountsWithFallback(apiService, formType));
          }
        } catch (error) {
          console.error('Error loading daily counts:', error);
          // Fallback to localStorage if API fails
          setDailyCounts(getDailyCounts(formType));
        } finally {
          setSyncing(false);
        }
      };

      loadData();
    }
  }, [open, formType]);


  // Helper to format date to YYYY-MM-DD
  const formatDateStr = (date) => {
    if (!date) return null;
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Helper to check if date is in range
  const isDateInRange = (date) => {
    if (viewMode !== 'range' || !dateRange[0] || !dateRange[1]) return false;
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const start = new Date(dateRange[0]);
    start.setHours(0, 0, 0, 0);
    const end = new Date(dateRange[1]);
    end.setHours(0, 0, 0, 0);
    return d >= start && d <= end;
  };

  // Helper to check if date is range start/end
  const isRangeStart = (date) => {
    if (viewMode !== 'range' || !dateRange[0]) return false;
    return formatDateStr(date) === formatDateStr(dateRange[0]);
  };

  const isRangeEnd = (date) => {
    if (viewMode !== 'range' || !dateRange[1]) return false;
    return formatDateStr(date) === formatDateStr(dateRange[1]);
  };

  // Get total count
  const totalCount = Object.values(dailyCounts).reduce((sum, count) => sum + count, 0);
  
  // Get dates with counts
  const datesWithCounts = Object.entries(dailyCounts)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  // Get count for a specific date
  const getCountForDate = (date) => {
    const dateString = formatDateStr(date);
    return dailyCounts[dateString] || 0;
  };

  // Get count for selected date
  const selectedDateCount = getCountForDate(selectedDate);

  // Handle date selection based on view mode
  const handleDateChange = (newDate) => {
    try {
      // Validate the date
      if (!newDate) {
        console.error('Invalid date selected:', newDate);
        return;
      }

      if (viewMode === 'single') {
        setSelectedDate(newDate);
      } else {
        // Range mode - react-calendar handles this automatically
        if (Array.isArray(newDate)) {
          setDateRange(newDate);
        } else {
          // Single date clicked in range mode
          const [start, end] = dateRange;
          if (!start || (start && end)) {
            setDateRange([newDate, null]);
          } else if (newDate < start) {
            setDateRange([newDate, null]);
          } else {
            setDateRange([start, newDate]);
          }
        }
      }
    } catch (error) {
      console.error('Error handling date change:', error);
    }
  };

  // Fetch historical data when date range is selected
  useEffect(() => {
    if (viewMode === 'range' && dateRange[0] && dateRange[1]) {
      const loadRangeData = async () => {
        try {
          const startDate = formatDateStr(dateRange[0]);
          const endDate = formatDateStr(dateRange[1]);
          const rangeCounts = await fetchDailyCountsByDateRange(apiService, startDate, endDate, formType);
          
          // Merge with existing dailyCounts
          setDailyCounts(prevCounts => ({
            ...prevCounts,
            ...rangeCounts
          }));
        } catch (error) {
          console.error('Error loading range data:', error);
        }
      };

      loadRangeData();
    }
  }, [dateRange, viewMode, formType]);

  // Get range summary
  const rangeSummary = useMemo(() => {
    if (viewMode === 'single') {
      return null;
    }

    const [start, end] = dateRange;
    if (!start) {
      return { count: 0, dates: [] };
    }

    if (!end) {
      // Only start date selected
      const count = getCountForDate(start);
      return { count, dates: [formatDateStr(start)] };
    }

    // Calculate range
    const dates = [];
    let currentDate = new Date(start);
    let totalCount = 0;
    const endDate = new Date(end);

    while (currentDate <= endDate) {
      const dateStr = formatDateStr(currentDate);
      dates.push(dateStr);
      totalCount += getCountForDate(currentDate);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return { count: totalCount, dates };
  }, [dateRange, viewMode, dailyCounts]);

  // Reset range when switching modes
  const handleViewModeChange = (event, newMode) => {
    if (newMode !== null) {
      setViewMode(newMode);
      if (newMode === 'single') {
        setDateRange([null, null]);
      }
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="lg" 
      fullWidth
      sx={{
        '& .MuiDialog-container': {
          padding: { xs: '8px', sm: '24px' },
          alignItems: { xs: 'flex-start', sm: 'center' },
        },
        '& .MuiDialog-paper': {
          margin: { xs: '8px', sm: '32px' },
          maxWidth: { xs: 'calc(100% - 16px)', sm: '900px', md: '1100px' },
          width: '100%',
          maxHeight: { xs: 'calc(100vh - 16px)', sm: '90vh' },
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        },
      }}
    >
      <DialogTitle sx={{ px: { xs: 2, sm: 3 }, py: { xs: 1.5, sm: 2 }, overflow: 'hidden' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, width: '100%', flexWrap: { xs: 'wrap', sm: 'nowrap' } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0, flex: 1 }}>
            <CalendarToday sx={{ color: colors.primary, fontSize: { xs: '20px', sm: '24px' }, flexShrink: 0 }} />
            <Typography 
              variant="h6" 
              sx={{ 
                fontSize: { xs: '0.9rem', sm: '1.25rem' },
                wordBreak: 'break-word',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              Daily Survey Count - {formDisplayName}
            </Typography>
          </Box>
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={handleViewModeChange}
            size="small"
            sx={{
              '& .MuiToggleButton-root': {
                borderColor: colors.primary,
                color: colors.primary,
                '&.Mui-selected': {
                  backgroundColor: colors.primary,
                  color: 'white',
                  '&:hover': {
                    backgroundColor: colors.hover,
                  },
                },
              },
            }}
          >
            <Tooltip title="Single Date">
              <ToggleButton value="single" aria-label="single date">
                <Today fontSize="small" />
              </ToggleButton>
            </Tooltip>
            <Tooltip title="Date Range">
              <ToggleButton value="range" aria-label="date range">
                <DateRange fontSize="small" />
              </ToggleButton>
            </Tooltip>
          </ToggleButtonGroup>
        </Box>
      </DialogTitle>
      <DialogContent sx={{ 
        px: { xs: 1.5, sm: 3 }, 
        py: { xs: 2, sm: 3 }, 
        overflowY: 'auto',
        overflowX: 'hidden',
        width: '100%', 
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        flex: 1,
      }}>
        <Box sx={{ mb: 3, width: '100%', overflow: 'hidden', flexShrink: 0 }}>
          <Paper
            elevation={2}
            sx={{
              p: { xs: 1.5, sm: 2 },
              background: colors.gradient,
              color: 'white',
              textAlign: 'center',
              position: 'relative',
              width: '100%',
              boxSizing: 'border-box',
            }}
          >
            {syncing && (
              <Box sx={{ position: 'absolute', top: 8, right: 8 }}>
                <CircularProgress size={20} sx={{ color: 'white' }} />
              </Box>
            )}
            <Typography variant="body2" sx={{ mb: 1 }}>
              Total Surveys Filled
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
              {syncing ? '...' : totalCount}
            </Typography>
          </Paper>
        </Box>

        <Box 
          sx={{ 
            display: 'flex', 
            gap: { xs: 2, sm: 3, md: 4 }, 
            flexDirection: { xs: 'column', md: 'row' },
            width: '100%',
            boxSizing: 'border-box',
            alignItems: { xs: 'stretch', md: 'flex-start' },
            minHeight: 0,
          }}
        >
          <Box sx={{ 
            width: { xs: '100%', md: '45%' },
            flexShrink: 0,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-start',
          }}>
            <style>
              {`
                .react-calendar {
                  width: 100%;
                  max-width: 100%;
                  background: white;
                  border: 2px solid ${colors.primary}30;
                  border-radius: 8px;
                  font-family: Arial, Helvetica, sans-serif;
                  line-height: 1.125em;
                }

                @media (max-width: 600px) {
                  .react-calendar {
                    font-size: 0.9em;
                    padding: 8px;
                  }
                }

                .react-calendar--doubleView {
                  width: 100%;
                }

                .react-calendar__navigation {
                  display: flex;
                  height: 44px;
                  margin-bottom: 8px;
                }

                @media (max-width: 600px) {
                  .react-calendar__navigation {
                    height: 36px;
                    margin-bottom: 4px;
                  }
                }

                .react-calendar__navigation button {
                  min-width: 44px;
                  background: none;
                  font-size: 16px;
                  color: ${colors.primary};
                  font-weight: bold;
                }

                @media (max-width: 600px) {
                  .react-calendar__navigation button {
                    min-width: 36px;
                    font-size: 14px;
                  }
                }

                .react-calendar__navigation button:enabled:hover,
                .react-calendar__navigation button:enabled:focus {
                  background-color: ${colors.primary}20;
                }

                .react-calendar__navigation button[disabled] {
                  background-color: #f0f0f0;
                }

                .react-calendar__month-view__weekdays {
                  text-align: center;
                  text-transform: uppercase;
                  font-weight: bold;
                  font-size: 0.75em;
                  color: ${colors.primary};
                }

                .react-calendar__month-view__weekdays__weekday {
                  padding: 0.5em;
                }

                @media (max-width: 600px) {
                  .react-calendar__month-view__weekdays__weekday {
                    padding: 0.3em 0.1em;
                    font-size: 0.7em;
                  }
                }

                .react-calendar__month-view__weekNumbers .react-calendar__tile {
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  font-size: 0.75em;
                  font-weight: bold;
                }

                .react-calendar__month-view__days__day--weekend {
                  color: #d10000;
                }

                .react-calendar__month-view__days__day--neighboringMonth {
                  color: #757575;
                }

                .react-calendar__year-view .react-calendar__tile,
                .react-calendar__decade-view .react-calendar__tile,
                .react-calendar__century-view .react-calendar__tile {
                  padding: 2em 0.5em;
                }

                .react-calendar__tile {
                  max-width: 100%;
                  padding: 10px 6px;
                  background: none;
                  text-align: center;
                  line-height: 16px;
                  font-size: 0.9em;
                }

                @media (max-width: 600px) {
                  .react-calendar__tile {
                    padding: 8px 2px;
                    font-size: 0.85em;
                    min-height: 40px;
                  }
                }

                .react-calendar__tile:disabled {
                  background-color: #f0f0f0;
                }

                .react-calendar__tile:enabled:hover,
                .react-calendar__tile:enabled:focus {
                  background-color: ${colors.primary}20;
                  border-radius: 6px;
                }

                .react-calendar__tile--now {
                  background: #ffff7640;
                  border-radius: 6px;
                }

                .react-calendar__tile--now:enabled:hover,
                .react-calendar__tile--now:enabled:focus {
                  background: #ffffa940;
                }

                .react-calendar__tile--hasActive {
                  background: ${colors.primary};
                }

                .react-calendar__tile--hasActive:enabled:hover,
                .react-calendar__tile--hasActive:enabled:focus {
                  background: ${colors.hover};
                }

                .react-calendar__tile--active {
                  background: #ff9800 !important;
                  color: white !important;
                  font-weight: bold;
                  border-radius: 6px;
                }

                .react-calendar__tile--active:enabled:hover,
                .react-calendar__tile--active:enabled:focus {
                  background: #f57c00 !important;
                }

                /* Range highlighting */
                .react-calendar__tile--range {
                  background: #fff3e0 !important;
                  color: #e65100 !important;
                  font-weight: 600;
                }

                .react-calendar__tile--rangeStart {
                  background: #ff9800 !important;
                  color: white !important;
                  border-radius: 6px 0 0 6px !important;
                  font-weight: 700 !important;
                }

                .react-calendar__tile--rangeEnd {
                  background: #ff9800 !important;
                  color: white !important;
                  border-radius: 0 6px 6px 0 !important;
                  font-weight: 700 !important;
                }

                .react-calendar__tile--rangeBothEnds {
                  border-radius: 6px !important;
                }

                /* Survey data indicator */
                .calendar-tile-with-data {
                  position: relative;
                  background-color: #e3f2fd !important;
                  border: 2px solid #2196f3 !important;
                  color: #1976d2 !important;
                  font-weight: 500;
                  border-radius: 6px;
                }

                .calendar-tile-with-data:enabled:hover,
                .calendar-tile-with-data:enabled:focus {
                  background-color: #bbdefb !important;
                }

                .react-calendar__tile--active.calendar-tile-with-data {
                  background: #ff9800 !important;
                  color: white !important;
                  border: 2px solid #f57c00 !important;
                }

                .calendar-tile-with-data::after {
                  content: '';
                  position: absolute;
                  bottom: 2px;
                  left: 50%;
                  transform: translateX(-50%);
                  width: 6px;
                  height: 6px;
                  border-radius: 50%;
                  background-color: ${colors.primary};
                }

                .react-calendar__tile--active.calendar-tile-with-data::after {
                  background-color: white;
                }
              `}
            </style>
            <Calendar
              onChange={handleDateChange}
              value={viewMode === 'single' ? selectedDate : dateRange}
              selectRange={viewMode === 'range'}
              tileClassName={({ date, view }) => {
                if (view === 'month') {
                  const dateStr = formatDateStr(date);
                  const hasData = dailyCounts[dateStr] > 0;
                  const classes = [];
                  
                  if (hasData) {
                    classes.push('calendar-tile-with-data');
                  }
                  
                  // Add range classes if in range mode
                  if (viewMode === 'range' && dateRange[0] && dateRange[1]) {
                    if (isDateInRange(date)) {
                      classes.push('react-calendar__tile--range');
                    }
                    if (isRangeStart(date)) {
                      classes.push('react-calendar__tile--rangeStart');
                    }
                    if (isRangeEnd(date)) {
                      classes.push('react-calendar__tile--rangeEnd');
                    }
                    if (isRangeStart(date) && isRangeEnd(date)) {
                      classes.push('react-calendar__tile--rangeBothEnds');
                    }
                  }
                  
                  return classes.join(' ');
                }
                return null;
              }}
              tileContent={({ date, view }) => {
                if (view === 'month') {
                  const dateStr = formatDateStr(date);
                  const count = dailyCounts[dateStr] || 0;
                  if (count > 0) {
                    return (
                      <div style={{
                        fontSize: '0.65em',
                        color: 'inherit',
                        marginTop: '2px'
                      }}>
                        {count > 1 && `(${count})`}
                      </div>
                    );
                  }
                }
                return null;
              }}
            />
          </Box>

          <Box sx={{ 
            width: { xs: '100%', md: '50%' },
            flex: 1,
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            mt: { xs: 3, md: 0 },
            minHeight: 0,
          }}>
            {/* Selected Date Info - Above Table on Right Side */}
            <Box sx={{ 
              textAlign: 'center', 
              width: '100%', 
              px: { xs: 1, sm: 2 },
              py: { xs: 1.5, sm: 2 },
              backgroundColor: '#f5f5f5',
              borderRadius: 2,
              flexShrink: 0,
              mb: 2,
            }}>
              {viewMode === 'single' ? (
                <>
                  <Typography 
                    variant="body1" 
                    sx={{ 
                      mb: 1,
                      fontSize: { xs: '0.875rem', sm: '1rem' },
                      fontWeight: '600',
                      color: 'text.primary',
                      wordBreak: 'break-word',
                    }}
                  >
                    Selected Date: {dayjs(selectedDate).format('MMMM DD, YYYY')}
                  </Typography>
                  <Chip
                    label={`${selectedDateCount} survey${selectedDateCount !== 1 ? 's' : ''} filled`}
                    sx={{
                      fontSize: { xs: '0.875rem', sm: '1rem' },
                      padding: { xs: '8px 16px', sm: '10px 20px' },
                      height: { xs: '32px', sm: '36px' },
                      backgroundColor: selectedDateCount > 0 ? colors.primary : '#9e9e9e',
                      color: 'white',
                      fontWeight: '600',
                      maxWidth: '100%',
                    }}
                  />
                </>
              ) : (
                <>
                  <Typography 
                    variant="body2" 
                    color="text.secondary" 
                    sx={{ 
                      mb: 1,
                      fontSize: { xs: '0.75rem', sm: '0.875rem' },
                      wordBreak: 'break-word',
                      px: { xs: 1, sm: 0 },
                    }}
                  >
                    {dateRange[0] && dateRange[1] ? (
                      <>
                        Date Range: {dayjs(dateRange[0]).format('MMM DD, YYYY')} - {dayjs(dateRange[1]).format('MMM DD, YYYY')}
                        <br />
                        <Typography variant="caption" component="span">
                          ({rangeSummary?.dates.length || 0} days)
                        </Typography>
                      </>
                    ) : dateRange[0] ? (
                      <>Select end date: {dayjs(dateRange[0]).format('MMM DD, YYYY')} → ?</>
                    ) : (
                      'Select start date'
                    )}
                  </Typography>
                  {rangeSummary && (
                    <Chip
                      label={`${rangeSummary.count} survey${rangeSummary.count !== 1 ? 's' : ''} filled in range`}
                      sx={{
                        fontSize: { xs: '0.75rem', sm: '0.9rem' },
                        padding: { xs: '6px 12px', sm: '8px 16px' },
                        backgroundColor: rangeSummary.count > 0 ? colors.primary : 'default',
                        color: rangeSummary.count > 0 ? 'white' : 'inherit',
                        maxWidth: '100%',
                        wordBreak: 'break-word',
                      }}
                    />
                  )}
                </>
              )}
            </Box>

            {datesWithCounts.length > 0 ? (() => {
              // Calculate actual number of rows that will be displayed
              const filteredRows = datesWithCounts.filter(({ date }) => {
                if (viewMode === 'single') return true;
                if (!rangeSummary || !rangeSummary.dates.length) return true;
                return rangeSummary.dates.includes(date);
              });
              const totalRows = filteredRows.length + (viewMode === 'range' && rangeSummary && rangeSummary.dates.length > 0 ? 1 : 0);
              
              return (
              <Box sx={{ 
                width: '100%', 
                mt: { xs: 2, md: 2 }, 
                display: 'flex', 
                flexDirection: 'column', 
                minHeight: 0,
              }}>
                <Typography 
                  variant="h6" 
                  sx={{ 
                    mb: 1.5,
                    fontSize: { xs: '1rem', sm: '1.25rem' },
                    fontWeight: '600',
                    color: 'text.primary',
                    flexShrink: 0,
                  }}
                >
                  Count by Date
                </Typography>
                <TableContainer 
                  component={Paper} 
                  variant="outlined"
                  sx={{
                    width: '100%',
                    overflowX: 'auto',
                    overflowY: 'auto',
                    maxWidth: '100%',
                    maxHeight: { xs: '300px', sm: '300px', md: '350px' },
                    minHeight: { xs: '200px', sm: '200px', md: '250px' },
                    '& .MuiTable-root': {
                      width: '100%',
                      tableLayout: 'fixed',
                    },
                  }}
                >
                <Table size="small" sx={{ width: '100%' }}>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ width: { xs: '60%', sm: '70%' }, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}><strong>Date</strong></TableCell>
                      <TableCell align="right" sx={{ width: { xs: '40%', sm: '30%' }, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}><strong>Count</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredRows.map(({ date, count }) => {
                        const isInRange = viewMode === 'range' && rangeSummary?.dates.includes(date);
                        const isSelected = viewMode === 'single' && date === formatDateStr(selectedDate);
                        
                        return (
                          <TableRow
                            key={date}
                            sx={{
                              cursor: viewMode === 'single' ? 'pointer' : 'default',
                              backgroundColor: isInRange || isSelected ? `${colors.primary}15` : 'inherit',
                              '&:hover': {
                                backgroundColor: `${colors.primary}20`,
                              },
                            }}
                            onClick={() => {
                              if (viewMode === 'single') {
                                setSelectedDate(new Date(date));
                              }
                            }}
                          >
                            <TableCell sx={{ wordBreak: 'break-word', fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, gap: { xs: 0.5, sm: 1 } }}>
                                <Typography variant="body2" sx={{ fontSize: { xs: '0.7rem', sm: '0.875rem' } }}>
                                  {dayjs(date).format('MMMM DD, YYYY')}
                                </Typography>
                                {isInRange && (
                                  <Chip
                                    label="In Range"
                                    size="small"
                                    sx={{
                                      height: '18px',
                                      fontSize: '0.65rem',
                                      backgroundColor: colors.primary,
                                      color: 'white',
                                    }}
                                  />
                                )}
                              </Box>
                            </TableCell>
                            <TableCell align="right" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                              <Chip
                                label={count}
                                size="small"
                                sx={{
                                  minWidth: { xs: '32px', sm: '40px' },
                                  backgroundColor: colors.primary,
                                  color: 'white',
                                  fontSize: { xs: '0.7rem', sm: '0.875rem' },
                                }}
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    {viewMode === 'range' && rangeSummary && rangeSummary.dates.length > 0 && (
                      <TableRow sx={{ backgroundColor: `${colors.primary}10`, fontWeight: 'bold' }}>
                        <TableCell><strong>Range Total</strong></TableCell>
                        <TableCell align="right">
                          <Chip
                            label={rangeSummary.count}
                            size="small"
                            sx={{
                              minWidth: '40px',
                              backgroundColor: colors.primary,
                              color: 'white',
                              fontWeight: 'bold',
                            }}
                          />
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
              </Box>
              );
            })() : (
              <Paper variant="outlined" sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  No surveys filled yet. Start filling forms to see your daily counts here!
                </Typography>
              </Paper>
            )}
          </Box>
        </Box>
      </DialogContent>
      <DialogActions sx={{ 
        px: { xs: 2, sm: 3 }, 
        pb: { xs: 2, sm: 3 }, 
        pt: { xs: 2, sm: 3 },
        gap: 1,
        mt: 2,
        borderTop: '1px solid rgba(0, 0, 0, 0.12)',
      }}>
        <Button
          onClick={onClose}
          variant="contained"
          fullWidth={false}
          sx={{
            backgroundColor: colors.primary,
            '&:hover': {
              backgroundColor: colors.hover,
            },
            minWidth: { xs: '80px', sm: '100px' },
          }}
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DailyCountCalendar;

