import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Grid,
  Chip,
  CircularProgress,
  Alert,
  Tooltip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  SelectChangeEvent,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import TodayIcon from '@mui/icons-material/Today';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { styled } from '@mui/material/styles';

// Styled components
const FloatingPanel = styled(Paper)(({ theme }) => ({
  position: 'fixed',
  right: '20px',
  top: '50%',
  transform: 'translateY(-50%)',
  width: '350px',
  maxHeight: '80vh',
  overflow: 'auto',
  zIndex: 1000,
  backgroundColor: theme.palette.background.paper,
  boxShadow: theme.shadows[4],
  borderRadius: theme.shape.borderRadius,
  transition: 'all 0.3s ease',
  '&:hover': {
    boxShadow: theme.shadows[8],
  },
}));

const DayColumn = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(1),
  minHeight: '120px',
  backgroundColor: theme.palette.background.default,
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: theme.shape.borderRadius,
  marginBottom: theme.spacing(1),
}));

const RoutineItem = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(1),
  marginBottom: theme.spacing(1),
  backgroundColor: theme.palette.background.paper,
  borderLeft: `4px solid ${theme.palette.primary.main}`,
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
  },
}));

// Types
export interface Routine {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'completed' | 'cancelled';
  schedule: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  priority: 'low' | 'medium' | 'high';
  tags: string[];
  estimated_duration: number;
  created_at: string;
  updated_at: string;
}

interface RoutineCalendarProps {
  onRoutineSelect?: (routine: Routine) => void;
}

export interface RoutineCalendarRef {
  fetchRoutines: () => void;
}

const RoutineCalendar = forwardRef<RoutineCalendarRef, RoutineCalendarProps>((props, ref) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentWeek, setCurrentWeek] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');

  // Expose fetchRoutines method to parent component
  useImperativeHandle(ref, () => ({
    fetchRoutines,
  }));

  const fetchRoutines = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('https://api.itenorio.com/lambda/routines');
      if (!response.ok) {
        throw new Error(`Error fetching routines: ${response.statusText}`);
      }
      const data = await response.json();
      setRoutines(data.data || []);
    } catch (err) {
      console.error('Error fetching routines:', err);
      setError('Failed to load routines. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoutines();
  }, []);

  const getWeekDates = () => {
    const start = new Date(currentWeek);
    start.setDate(start.getDate() - start.getDay());
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const getRoutinesForDate = (date: Date) => {
    return routines.filter(routine => {
      const routineDate = new Date(routine.schedule);
      return routineDate.toDateString() === date.toDateString();
    });
  };

  const handlePreviousWeek = () => {
    const newDate = new Date(currentWeek);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentWeek(newDate);
  };

  const handleNextWeek = () => {
    const newDate = new Date(currentWeek);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentWeek(newDate);
  };

  const handleToday = () => {
    setCurrentWeek(new Date());
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      case 'low':
        return 'success';
      default:
        return 'default';
    }
  };

  return (
    <FloatingPanel elevation={3}>
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Weekly Routines</Typography>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <Select
              value={viewMode}
              onChange={(e: SelectChangeEvent) => setViewMode(e.target.value as 'week' | 'month')}
              size="small"
            >
              <MenuItem value="week">Week</MenuItem>
              <MenuItem value="month">Month</MenuItem>
            </Select>
          </FormControl>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <IconButton onClick={handlePreviousWeek} size="small">
            <ChevronLeftIcon />
          </IconButton>
          <Typography variant="subtitle1">
            {formatDate(getWeekDates()[0])} - {formatDate(getWeekDates()[6])}
          </Typography>
          <IconButton onClick={handleNextWeek} size="small">
            <ChevronRightIcon />
          </IconButton>
          <IconButton onClick={handleToday} size="small">
            <TodayIcon />
          </IconButton>
        </Box>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ m: 2 }}>
          {error}
        </Alert>
      ) : (
        <Box sx={{ p: 2 }}>
          <Grid container spacing={1}>
            {getWeekDates().map((date, index) => (
              <Grid item xs={12} key={index}>
                <DayColumn>
                  <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
                    {formatDate(date)}
                  </Typography>
                  {getRoutinesForDate(date).map((routine) => (
                    <RoutineItem key={routine.id} onClick={() => props.onRoutineSelect?.(routine)}>
                      <Typography variant="body2" noWrap>
                        {routine.name}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                        <AccessTimeIcon fontSize="small" sx={{ mr: 0.5 }} />
                        <Typography variant="caption" sx={{ mr: 1 }}>
                          {routine.schedule.split('T')[1].substring(0, 5)}
                        </Typography>
                        <Chip
                          label={routine.priority}
                          size="small"
                          color={getPriorityColor(routine.priority) as any}
                        />
                      </Box>
                    </RoutineItem>
                  ))}
                </DayColumn>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}
    </FloatingPanel>
  );
});

RoutineCalendar.displayName = 'RoutineCalendar';

export default RoutineCalendar; 