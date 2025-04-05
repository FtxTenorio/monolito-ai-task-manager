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
  Button,
} from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import TodayIcon from '@mui/icons-material/Today';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { styled } from '@mui/material/styles';
import axios from 'axios';

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
  frequency: 'daily' | 'weekly' | 'monthly' | 'weekdays' | 'weekends' | 'custom';
  priority: 'low' | 'medium' | 'high';
  tags: string[];
  estimated_duration: number;
  start_date: string | null;
  end_date: string | null;
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
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [frequencyFilter, setFrequencyFilter] = useState<string>('all');

  // Expose fetchRoutines method to parent component
  useImperativeHandle(ref, () => ({
    fetchRoutines,
  }));

  const fetchRoutines = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get('https://api.itenorio.com/lambda/routines');
      // A API de routines retorna o body como uma string JSON que precisa ser parseada
      const bodyData = JSON.parse(response.data.body);
      
      // Verifica se os dados estão no formato esperado
      if (bodyData.data && Array.isArray(bodyData.data)) {
        setRoutines(bodyData.data);
      } else {
        console.error('Formato de resposta inesperado:', bodyData);
        setError('Formato de resposta inesperado da API');
        setRoutines([]);
      }
      
      setError(null);
    } catch (err) {
      console.error('Erro ao buscar rotinas:', err);
      setError('Não foi possível carregar as rotinas. Tente novamente mais tarde.');
      setRoutines([]); // Em caso de erro, garantir que routines seja um array vazio
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

  const getMonthDates = () => {
    const year = currentWeek.getFullYear();
    const month = currentWeek.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();
    
    const dates = [];
    
    // Adiciona dias vazios no início para alinhar com o dia da semana correto
    for (let i = 0; i < startingDay; i++) {
      dates.push(null);
    }
    
    // Adiciona os dias do mês
    for (let i = 1; i <= daysInMonth; i++) {
      dates.push(new Date(year, month, i));
    }
    
    return dates;
  };

  const isRoutineInCurrentPeriod = (routine: Routine) => {
    // Se a rotina não tem start_date ou end_date, considera que está sempre ativa
    if (!routine.start_date || !routine.end_date) {
      return true;
    }

    const startDate = new Date(routine.start_date);
    const endDate = new Date(routine.end_date);
    
    // Verifica se a rotina está dentro do período atual (semana/mês)
    if (viewMode === 'week') {
      const weekStart = getWeekDates()[0];
      const weekEnd = getWeekDates()[6];
      weekEnd.setHours(23, 59, 59, 999);
      
      return (startDate <= weekEnd && endDate >= weekStart);
    } else {
      // Modo mensal
      const monthStart = new Date(currentWeek.getFullYear(), currentWeek.getMonth(), 1);
      const monthEnd = new Date(currentWeek.getFullYear(), currentWeek.getMonth() + 1, 0, 23, 59, 59, 999);
      
      return (startDate <= monthEnd && endDate >= monthStart);
    }
  };

  const getRoutinesForDate = (date: Date) => {
    return routines.filter(routine => {
      // Aplica os filtros de status, prioridade e frequência
      if (statusFilter !== 'all' && routine.status !== statusFilter) return false;
      if (priorityFilter !== 'all' && routine.priority !== priorityFilter) return false;
      if (frequencyFilter !== 'all' && routine.frequency !== frequencyFilter) return false;

      // Verifica se a rotina está dentro do período atual
      if (!isRoutineInCurrentPeriod(routine)) return false;

      // Verifica se a rotina está dentro do período de início e fim
      if (routine.start_date && new Date(routine.start_date) > date) return false;
      if (routine.end_date && new Date(routine.end_date) < date) return false;

      // Extrai a hora e minuto do schedule
      const [hours, minutes] = routine.schedule.split(':').map(Number);
      const routineDate = new Date(date);
      routineDate.setHours(hours, minutes, 0, 0);

      // Verifica a frequência
      switch (routine.frequency) {
        case 'daily':
          return true;
        case 'weekly':
          return routineDate.getDay() === date.getDay();
        case 'monthly':
          return routineDate.getDate() === date.getDate();
        case 'weekdays':
          const day = date.getDay();
          return day >= 1 && day <= 5; // Segunda a Sexta
        case 'weekends':
          const weekendDay = date.getDay();
          return weekendDay === 0 || weekendDay === 6; // Sábado e Domingo
        case 'custom':
          // Para frequência personalizada, verifica se o dia da semana está na lista
          const customDays = routine.custom_days || [];
          return customDays.includes(date.getDay());
        default:
          return false;
      }
    });
  };

  const handlePreviousWeek = () => {
    const newDate = new Date(currentWeek);
    if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() - 7);
    } else {
      newDate.setMonth(newDate.getMonth() - 1);
    }
    setCurrentWeek(newDate);
  };

  const handleNextWeek = () => {
    const newDate = new Date(currentWeek);
    if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + 7);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentWeek(newDate);
  };

  const handleToday = () => {
    setCurrentWeek(new Date());
  };

  const formatDate = (date: Date) => {
    if (viewMode === 'week') {
      return date.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric' });
    } else {
      return date.toLocaleDateString('pt-BR', { day: 'numeric' });
    }
  };

  const formatMonthYear = (date: Date) => {
    return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
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

  const getFrequencyLabel = (frequency: string) => {
    switch (frequency) {
      case 'daily':
        return 'Diária';
      case 'weekly':
        return 'Semanal';
      case 'monthly':
        return 'Mensal';
      case 'weekdays':
        return 'Dias úteis';
      case 'weekends':
        return 'Finais de semana';
      case 'custom':
        return 'Personalizada';
      default:
        return frequency;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pendente';
      case 'completed':
        return 'Concluída';
      case 'cancelled':
        return 'Cancelada';
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'completed':
        return 'success';
      case 'cancelled':
        return 'error';
      default:
        return 'default';
    }
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) {
      return `${hours} h`;
    }
    return `${hours} h ${remainingMinutes} min`;
  };

  const clearFilters = () => {
    setStatusFilter('all');
    setPriorityFilter('all');
    setFrequencyFilter('all');
  };

  const getFilteredRoutinesCount = () => {
    return routines.filter(routine => {
      // Filtra por status
      if (statusFilter !== 'all' && routine.status !== statusFilter) {
        return false;
      }

      // Filtra por prioridade
      if (priorityFilter !== 'all' && routine.priority !== priorityFilter) {
        return false;
      }

      // Filtra por frequência
      if (frequencyFilter !== 'all' && routine.frequency !== frequencyFilter) {
        return false;
      }

      return true;
    }).length;
  };

  const renderMonthView = () => {
    const dates = getMonthDates();
    const hasRoutines = dates.some(date => date && getRoutinesForDate(date).length > 0);
    
    if (!hasRoutines) {
      return (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 3, height: '200px' }}>
          <Typography variant="body1" color="text.secondary" align="center" gutterBottom>
            Nenhuma rotina encontrada para este mês
          </Typography>
          <Typography variant="body2" color="text.secondary" align="center">
            Tente ajustar os filtros ou navegar para outro mês
          </Typography>
        </Box>
      );
    }
    
    return (
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1 }}>
        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day, index) => (
          <Box key={index} sx={{ textAlign: 'center', fontWeight: 'bold', p: 1 }}>
            {day}
          </Box>
        ))}
        {dates.map((date, index) => (
          <Box 
            key={index} 
            sx={{ 
              minHeight: '100px', 
              border: '1px solid', 
              borderColor: 'divider', 
              p: 1,
              backgroundColor: date ? 'background.paper' : 'background.default',
              opacity: date ? 1 : 0.5
            }}
          >
            {date && (
              <>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  {date.getDate()}
                </Typography>
                {getRoutinesForDate(date).map((routine) => (
                  <Tooltip 
                    key={routine.id} 
                    title={
                      <Box>
                        <Typography variant="subtitle2">{routine.name}</Typography>
                        <Typography variant="body2">{routine.description}</Typography>
                      </Box>
                    }
                    arrow
                  >
                    <RoutineItem onClick={() => props.onRoutineSelect?.(routine)}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body2" noWrap sx={{ flex: 1 }}>
                          {routine.name}
                        </Typography>
                        <Chip
                          label={getStatusLabel(routine.status)}
                          size="small"
                          color={getStatusColor(routine.status) as any}
                          sx={{ ml: 1 }}
                        />
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                        <AccessTimeIcon fontSize="small" sx={{ mr: 0.5 }} />
                        <Typography variant="caption" sx={{ mr: 1 }}>
                          {routine.schedule}
                        </Typography>
                        <Typography variant="caption" sx={{ mr: 1 }}>
                          ({formatDuration(routine.estimated_duration)})
                        </Typography>
                        <Chip
                          label={routine.priority}
                          size="small"
                          color={getPriorityColor(routine.priority) as any}
                          sx={{ mr: 1 }}
                        />
                        <Chip
                          label={getFrequencyLabel(routine.frequency)}
                          size="small"
                          variant="outlined"
                        />
                      </Box>
                      {routine.tags && routine.tags.length > 0 && (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                          {routine.tags.map((tag, index) => (
                            <Chip
                              key={index}
                              label={tag}
                              size="small"
                              variant="outlined"
                              sx={{ height: '20px', fontSize: '0.7rem' }}
                            />
                          ))}
                        </Box>
                      )}
                    </RoutineItem>
                  </Tooltip>
                ))}
              </>
            )}
          </Box>
        ))}
      </Box>
    );
  };

  return (
    <FloatingPanel elevation={3}>
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            Rotinas
            {(statusFilter !== 'all' || priorityFilter !== 'all' || frequencyFilter !== 'all') && (
              <Typography component="span" variant="caption" sx={{ ml: 1, color: 'text.secondary' }}>
                ({getFilteredRoutinesCount()} de {routines.length})
              </Typography>
            )}
          </Typography>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <Select
              value={viewMode}
              onChange={(e: SelectChangeEvent) => setViewMode(e.target.value as 'week' | 'month')}
              size="small"
            >
              <MenuItem value="week">Semana</MenuItem>
              <MenuItem value="month">Mês</MenuItem>
            </Select>
          </FormControl>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <IconButton onClick={handlePreviousWeek} size="small">
            <ChevronLeftIcon />
          </IconButton>
          <Typography variant="subtitle1">
            {viewMode === 'week' 
              ? `${formatDate(getWeekDates()[0])} - ${formatDate(getWeekDates()[6])}`
              : formatMonthYear(currentWeek)
            }
          </Typography>
          <IconButton onClick={handleNextWeek} size="small">
            <ChevronRightIcon />
          </IconButton>
          <IconButton onClick={handleToday} size="small">
            <TodayIcon />
          </IconButton>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
          <Button 
            size="small" 
            onClick={clearFilters}
            disabled={statusFilter === 'all' && priorityFilter === 'all' && frequencyFilter === 'all'}
          >
            Limpar filtros
          </Button>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <Select
                value={statusFilter}
                onChange={(e: SelectChangeEvent) => setStatusFilter(e.target.value)}
                size="small"
              >
                <MenuItem value="all">Todos os status</MenuItem>
                <MenuItem value="pending">Pendentes</MenuItem>
                <MenuItem value="completed">Concluídas</MenuItem>
                <MenuItem value="cancelled">Canceladas</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <Select
                value={priorityFilter}
                onChange={(e: SelectChangeEvent) => setPriorityFilter(e.target.value)}
                size="small"
              >
                <MenuItem value="all">Todas as prioridades</MenuItem>
                <MenuItem value="high">Alta</MenuItem>
                <MenuItem value="medium">Média</MenuItem>
                <MenuItem value="low">Baixa</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <Select
                value={frequencyFilter}
                onChange={(e: SelectChangeEvent) => setFrequencyFilter(e.target.value)}
                size="small"
              >
                <MenuItem value="all">Todas as frequências</MenuItem>
                <MenuItem value="daily">Diária</MenuItem>
                <MenuItem value="weekly">Semanal</MenuItem>
                <MenuItem value="monthly">Mensal</MenuItem>
                <MenuItem value="weekdays">Dias úteis</MenuItem>
                <MenuItem value="weekends">Finais de semana</MenuItem>
                <MenuItem value="custom">Personalizada</MenuItem>
              </Select>
            </FormControl>
          </Box>
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
          {viewMode === 'week' ? (
            (() => {
              // Verifica se há rotinas para exibir em algum dia da semana
              const hasRoutines = getWeekDates().some(date => getRoutinesForDate(date).length > 0);
              
              if (!hasRoutines) {
                return (
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 3, height: '200px' }}>
                    <Typography variant="body1" color="text.secondary" align="center" gutterBottom>
                      Nenhuma rotina encontrada para este período
                    </Typography>
                    <Typography variant="body2" color="text.secondary" align="center">
                      Tente ajustar os filtros ou navegar para outra semana
                    </Typography>
                  </Box>
                );
              }
              
              return getWeekDates().map((date, index) => {
                const routinesForDate = getRoutinesForDate(date);
                return (
                  <DayColumn key={index}>
                    <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
                      {formatDate(date)}
                    </Typography>
                    {routinesForDate.length > 0 ? (
                      routinesForDate.map((routine) => (
                        <Tooltip 
                          key={routine.id} 
                          title={
                            <Box>
                              <Typography variant="subtitle2">{routine.name}</Typography>
                              <Typography variant="body2">{routine.description}</Typography>
                            </Box>
                          }
                          arrow
                        >
                          <RoutineItem onClick={() => props.onRoutineSelect?.(routine)}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Typography variant="body2" noWrap sx={{ flex: 1 }}>
                                {routine.name}
                              </Typography>
                              <Chip
                                label={getStatusLabel(routine.status)}
                                size="small"
                                color={getStatusColor(routine.status) as any}
                                sx={{ ml: 1 }}
                              />
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                              <AccessTimeIcon fontSize="small" sx={{ mr: 0.5 }} />
                              <Typography variant="caption" sx={{ mr: 1 }}>
                                {routine.schedule}
                              </Typography>
                              <Typography variant="caption" sx={{ mr: 1 }}>
                                ({formatDuration(routine.estimated_duration)})
                              </Typography>
                              <Chip
                                label={routine.priority}
                                size="small"
                                color={getPriorityColor(routine.priority) as any}
                                sx={{ mr: 1 }}
                              />
                              <Chip
                                label={getFrequencyLabel(routine.frequency)}
                                size="small"
                                variant="outlined"
                              />
                            </Box>
                            {routine.tags && routine.tags.length > 0 && (
                              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                                {routine.tags.map((tag, index) => (
                                  <Chip
                                    key={index}
                                    label={tag}
                                    size="small"
                                    variant="outlined"
                                    sx={{ height: '20px', fontSize: '0.7rem' }}
                                  />
                                ))}
                              </Box>
                            )}
                          </RoutineItem>
                        </Tooltip>
                      ))
                    ) : (
                      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50px' }}>
                        <Typography variant="body2" color="text.secondary">
                          Nenhuma rotina
                        </Typography>
                      </Box>
                    )}
                  </DayColumn>
                );
              });
            })()
          ) : (
            renderMonthView()
          )}
        </Box>
      )}
    </FloatingPanel>
  );
});

RoutineCalendar.displayName = 'RoutineCalendar';

export default RoutineCalendar; 