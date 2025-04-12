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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Switch,
  FormControlLabel,
  GlobalStyles,
} from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import TodayIcon from '@mui/icons-material/Today';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import CloseIcon from '@mui/icons-material/Close';
import { styled } from '@mui/material/styles';
import axios from 'axios';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';
import { Calendar } from 'react-big-calendar';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import ListAltIcon from '@mui/icons-material/ListAlt';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';

// Adicionar os estilos globais para a barra de rolagem
const GlobalScrollbarStyles = () => (
  <GlobalStyles
    styles={(theme) => ({
      '*::-webkit-scrollbar': {
        width: '8px',
        height: '8px',
      },
      '*::-webkit-scrollbar-track': {
        background: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
        borderRadius: '4px',
      },
      '*::-webkit-scrollbar-thumb': {
        backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)',
        borderRadius: '4px',
        '&:hover': {
          backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)',
        },
      },
      '*': {
        scrollbarWidth: 'thin',
        scrollbarColor: `${theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)'} transparent`,
      },
    })}
  />
);

// Styled components
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

// Componente para rotina ativa
const ActiveRoutineItem = styled(RoutineItem)(({ theme }) => ({
  backgroundColor: theme.palette.action.selected,
  borderLeft: `4px solid ${theme.palette.success.main}`,
  boxShadow: `0 0 8px ${theme.palette.success.light}`,
  '&:hover': {
    backgroundColor: theme.palette.action.selected,
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
  custom_days?: number[];
  created_at: string;
  updated_at: string;
}

interface RoutineCalendarProps {
  onRoutineSelect?: (routine: Routine) => void;
  onClose?: () => void;
}

export interface RoutineCalendarRef {
  fetchRoutines: () => void;
  setVisible: (visible: boolean) => void;
}

// Valores para os filtros
const prioridades = ['low', 'medium', 'high'];
const frequencias = ['daily', 'weekly', 'monthly', 'weekdays', 'weekends', 'custom'];
const status = ['pending', 'completed', 'cancelled'];

interface RoutineFormData {
  name: string;
  description: string;
  status: string;
  schedule: string;
  frequency: string;
  priority: string;
  tags: string[];
  estimated_duration: number;
  start_date: string;
  end_date: string;
}

const NavigationContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(2),
  padding: theme.spacing(2),
  backgroundColor: theme.palette.background.paper,
  borderRadius: 0,
  borderBottom: `1px solid ${theme.palette.divider}`,
  '& .MuiIconButton-root': {
    color: theme.palette.text.secondary,
    padding: theme.spacing(1),
    '&:hover': {
      backgroundColor: theme.palette.action.hover,
    },
  },
  '& .MuiTypography-root': {
    fontWeight: 500,
    flex: 1,
    textAlign: 'center',
  },
}));

const RoutineCalendar = forwardRef<RoutineCalendarRef, RoutineCalendarProps>((props, ref) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentWeek, setCurrentWeek] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'week' | 'month' | 'today'>('today');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [frequencyFilter, setFrequencyFilter] = useState<string>('all');
  const [isVisible, setIsVisible] = useState(true);
  const [showAllRoutines, setShowAllRoutines] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [selectedRoutine, setSelectedRoutine] = useState<Routine | null>(null);
  const [formData, setFormData] = useState<RoutineFormData>({
    name: '',
    description: '',
    status: 'pending',
    schedule: '',
    frequency: 'daily',
    priority: 'medium',
    tags: [],
    estimated_duration: 30,
    start_date: '',
    end_date: ''
  });
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  // Expose fetchRoutines method to parent component
  useImperativeHandle(ref, () => ({
    fetchRoutines,
    setVisible: (visible: boolean) => {
      setIsVisible(visible);
    }
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

  // Atualiza o horário atual a cada minuto
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Atualiza a cada minuto
    
    return () => clearInterval(timer);
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

  // Função para ordenar rotinas por horário
  const sortRoutinesByTime = (routines: Routine[]) => {
    return [...routines].sort((a, b) => {
      const [hoursA, minutesA] = a.schedule.split(':').map(Number);
      const [hoursB, minutesB] = b.schedule.split(':').map(Number);
      
      if (hoursA !== hoursB) {
        return hoursA - hoursB;
      }
      return minutesA - minutesB;
    });
  };
  
  // Função para verificar se uma rotina está ativa no momento atual
  const isRoutineActive = (routine: Routine) => {
    if (!routine.schedule) return false;

    const now = new Date();
    const [hours, minutes] = routine.schedule.split(':').map(Number);
    
    // Criar data de início da rotina para hoje
    const routineStartTime = new Date(now);
    routineStartTime.setHours(hours, minutes, 0, 0);
    
    // Calcular data de término baseada na duração estimada
    const routineEndTime = new Date(routineStartTime);
    routineEndTime.setMinutes(routineEndTime.getMinutes() + routine.estimated_duration);

    // Verificar se a rotina está dentro do período atual
    return now >= routineStartTime && now <= routineEndTime;
  };

  const getRoutinesForDate = (date: Date) => {
    const filteredRoutines = routines.filter(routine => {
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
    
    // Ordena as rotinas por horário
    return sortRoutinesByTime(filteredRoutines);
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

  const getFilteredRoutines = () => {
    return routines.filter(routine => {
      // Filtra por status
      if (statusFilter !== 'all' && routine.status !== statusFilter) return false;
      // Filtra por prioridade
      if (priorityFilter !== 'all' && routine.priority !== priorityFilter) return false;
      // Filtra por frequência
      if (frequencyFilter !== 'all' && routine.frequency !== frequencyFilter) return false;

      return true;
    });
  };

  const renderRoutineItem = (routine: Routine, date: Date) => {
    const isActive = isRoutineActive(routine);
    const RoutineComponent = isActive ? ActiveRoutineItem : RoutineItem;
    
    return (
      <Tooltip 
        key={routine.id} 
        title={
          <Box>
            <Typography variant="subtitle2">{routine.name}</Typography>
            <Typography variant="body2">{routine.description}</Typography>
            {isActive && (
              <Typography variant="body2" color="success.main" sx={{ mt: 1 }}>
                Em execução
              </Typography>
            )}
          </Box>
        }
        arrow
      >
        <RoutineComponent onClick={() => props.onRoutineSelect?.(routine)}>
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
          <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
            <Tooltip title="Editar">
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenEditDialog(routine);
                }}
              >
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Excluir">
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenDeleteDialog(routine);
                }}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </RoutineComponent>
      </Tooltip>
    );
  };

  // Função para verificar se uma data é hoje
  const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
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
              borderColor: date && isToday(date) ? 'primary.main' : 'divider', 
              p: 1,
              backgroundColor: date ? 'background.paper' : 'background.default',
              opacity: date ? 1 : 0.5,
              boxShadow: date && isToday(date) ? '0 0 8px rgba(25, 118, 210, 0.3)' : 'none'
            }}
          >
            {date && (
              <>
                <Typography 
                  variant="subtitle2" 
                  sx={{ 
                    mb: 1,
                    color: isToday(date) ? 'primary.main' : 'inherit',
                    fontWeight: isToday(date) ? 'bold' : 'normal'
                  }}
                >
                  {date.getDate()}
                  {isToday(date) && ' (Hoje)'}
                </Typography>
                {getRoutinesForDate(date).map((routine) => renderRoutineItem(routine, date))}
              </>
            )}
          </Box>
        ))}
      </Box>
    );
  };

  const handleOpenAddDialog = () => {
    setFormData({
      name: '',
      description: '',
      status: 'pending',
      schedule: '',
      frequency: 'daily',
      priority: 'medium',
      tags: [],
      estimated_duration: 30,
      start_date: '',
      end_date: ''
    });
    setOpenAddDialog(true);
  };

  const handleOpenEditDialog = (routine: Routine) => {
    setSelectedRoutine(routine);
    setFormData({
      name: routine.name,
      description: routine.description,
      status: routine.status,
      schedule: routine.schedule,
      frequency: routine.frequency,
      priority: routine.priority,
      tags: routine.tags,
      estimated_duration: routine.estimated_duration,
      start_date: routine.start_date || '',
      end_date: routine.end_date || ''
    });
    setOpenEditDialog(true);
  };

  const handleOpenDeleteDialog = (routine: Routine) => {
    setSelectedRoutine(routine);
    setOpenDeleteDialog(true);
  };

  const handleCloseDialogs = () => {
    setOpenAddDialog(false);
    setOpenEditDialog(false);
    setOpenDeleteDialog(false);
    setSelectedRoutine(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddRoutine = async () => {
    try {
      const jsonData = JSON.stringify(formData);
      await axios.post('https://api.itenorio.com/lambda/routines', jsonData, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      fetchRoutines();
      handleCloseDialogs();
    } catch (err) {
      console.error('Erro ao adicionar rotina:', err);
      setError('Não foi possível adicionar a rotina. Tente novamente mais tarde.');
    }
  };

  const handleUpdateRoutine = async () => {
    if (!selectedRoutine) return;
    
    try {
      const jsonData = JSON.stringify(formData);
      await axios.put(`https://api.itenorio.com/lambda/routines/${selectedRoutine.id}`, jsonData, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      fetchRoutines();
      handleCloseDialogs();
    } catch (err) {
      console.error('Erro ao atualizar rotina:', err);
      setError('Não foi possível atualizar a rotina. Tente novamente mais tarde.');
    }
  };

  const handleDeleteRoutine = async () => {
    if (!selectedRoutine) return;
    
    try {
      await axios.delete(`https://api.itenorio.com/lambda/routines/${selectedRoutine.id}`);
      fetchRoutines();
      handleCloseDialogs();
    } catch (err) {
      console.error('Erro ao excluir rotina:', err);
      setError('Não foi possível excluir a rotina. Tente novamente mais tarde.');
    }
  };

  // Função para lidar com a mudança de página
  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  // Função para lidar com a mudança de linhas por página
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Função para alternar entre a visualização do calendário e a lista de rotinas
  const toggleView = () => {
    setShowAllRoutines(!showAllRoutines);
  };

  const renderHeader = () => (
    <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">
          Rotinas
          {(statusFilter !== 'all' || priorityFilter !== 'all' || frequencyFilter !== 'all') && (
            <Typography component="span" variant="caption" sx={{ ml: 1, color: 'text.secondary' }}>
              ({getFilteredRoutines().length} de {routines.length})
            </Typography>
          )}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Atualizar rotinas">
            <IconButton onClick={fetchRoutines} color="primary">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="outlined"
            onClick={toggleView}
            size="small"
            startIcon={showAllRoutines ? <CalendarMonthIcon /> : <ListAltIcon />}
          >
            {showAllRoutines ? 'Ver Calendário' : 'Ver Todas as Rotinas'}
          </Button>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <Select
              value={viewMode}
              onChange={(e: SelectChangeEvent) => {
                const newViewMode = e.target.value as 'week' | 'month' | 'today';
                setViewMode(newViewMode);
                if (newViewMode === 'today') {
                  setCurrentWeek(new Date());
                }
              }}
              size="small"
            >
              <MenuItem value="today">Hoje</MenuItem>
              <MenuItem value="week">Semana</MenuItem>
              <MenuItem value="month">Mês</MenuItem>
            </Select>
          </FormControl>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenAddDialog}
            size="small"
          >
            Nova Rotina
          </Button>
        </Box>
      </Box>
      {!showAllRoutines && (
        <>
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
        </>
      )}
    </Box>
  );

  // Renderiza a lista de todas as rotinas
  const renderAllRoutines = () => {
    const filteredRoutines = getFilteredRoutines();
    const paginatedRoutines = filteredRoutines.slice(
      page * rowsPerPage,
      page * rowsPerPage + rowsPerPage
    );

    return (
      <Box sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="subtitle1">
            {filteredRoutines.length} rotinas encontradas
          </Typography>
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
            <Button 
              size="small" 
              onClick={clearFilters}
              disabled={statusFilter === 'all' && priorityFilter === 'all' && frequencyFilter === 'all'}
            >
              Limpar filtros
            </Button>
          </Box>
        </Box>

        <TableContainer component={Paper} sx={{ mb: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Nome</TableCell>
                <TableCell>Descrição</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Prioridade</TableCell>
                <TableCell>Frequência</TableCell>
                <TableCell>Horário</TableCell>
                <TableCell>Duração</TableCell>
                <TableCell>Período</TableCell>
                <TableCell>Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedRoutines.map((routine) => (
                <TableRow key={routine.id} hover>
                  <TableCell>{routine.name}</TableCell>
                  <TableCell>
                    <Tooltip title={routine.description}>
                      <Typography noWrap sx={{ maxWidth: 200 }}>
                        {routine.description}
                      </Typography>
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={getStatusLabel(routine.status)}
                      size="small"
                      color={getStatusColor(routine.status) as any}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={routine.priority}
                      size="small"
                      color={getPriorityColor(routine.priority) as any}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={getFrequencyLabel(routine.frequency)}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>{routine.schedule}</TableCell>
                  <TableCell>{formatDuration(routine.estimated_duration)}</TableCell>
                  <TableCell>
                    {routine.start_date && routine.end_date ? (
                      <Tooltip title={`${formatDate(new Date(routine.start_date))} - ${formatDate(new Date(routine.end_date))}`}>
                        <Typography noWrap sx={{ maxWidth: 150 }}>
                          {formatDate(new Date(routine.start_date))} - {formatDate(new Date(routine.end_date))}
                        </Typography>
                      </Tooltip>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        Sem data definida
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Tooltip title="Editar">
                        <IconButton
                          size="small"
                          onClick={() => handleOpenEditDialog(routine)}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Excluir">
                        <IconButton
                          size="small"
                          onClick={() => handleOpenDeleteDialog(routine)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
              {paginatedRoutines.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} align="center">
                    <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                      Nenhuma rotina encontrada com os filtros selecionados
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={filteredRoutines.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage="Linhas por página:"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
        />
      </Box>
    );
  };

  const renderContent = () => (
    <>
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
          {showAllRoutines ? (
            renderAllRoutines()
          ) : (
            viewMode === 'today' ? (
              (() => {
                const today = new Date();
                const routinesForToday = getRoutinesForDate(today);
                
                if (routinesForToday.length === 0) {
                  return (
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 3, height: '200px' }}>
                      <Typography variant="body1" color="text.secondary" align="center" gutterBottom>
                        Nenhuma rotina encontrada para hoje
                      </Typography>
                      <Typography variant="body2" color="text.secondary" align="center">
                        Tente ajustar os filtros ou adicionar uma nova rotina
                      </Typography>
                    </Box>
                  );
                }
                
                return (
                  <DayColumn sx={{ 
                    border: '2px solid', 
                    borderColor: 'primary.main',
                    boxShadow: '0 0 8px rgba(25, 118, 210, 0.3)'
                  }}>
                    <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold', color: 'primary.main' }}>
                      {formatDate(today)} (Hoje)
                    </Typography>
                    {routinesForToday.map((routine) => renderRoutineItem(routine, today))}
                  </DayColumn>
                );
              })()
            ) : viewMode === 'week' ? (
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
                  const isCurrentDay = isToday(date);
                  
                  return (
                    <DayColumn 
                      key={index}
                      sx={isCurrentDay ? { 
                        border: '2px solid', 
                        borderColor: 'primary.main',
                        boxShadow: '0 0 8px rgba(25, 118, 210, 0.3)'
                      } : {}}
                    >
                      <Typography 
                        variant="subtitle2" 
                        sx={{ 
                          mb: 1, 
                          fontWeight: 'bold',
                          color: isCurrentDay ? 'primary.main' : 'inherit'
                        }}
                      >
                        {formatDate(date)}
                        {isCurrentDay && ' (Hoje)'}
                      </Typography>
                      {routinesForDate.length > 0 ? (
                        routinesForDate.map((routine) => renderRoutineItem(routine, date))
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
            )
          )}
        </Box>
      )}
    </>
  );

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <GlobalScrollbarStyles />
      {renderHeader()}
      {renderContent()}

      {/* Diálogo de Adicionar Rotina */}
      <Dialog open={openAddDialog} onClose={handleCloseDialogs} maxWidth="sm" fullWidth>
        <DialogTitle>Nova Rotina</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Nome"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              margin="normal"
            />
            <TextField
              fullWidth
              label="Descrição"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              margin="normal"
              multiline
              rows={2}
            />
            <TextField
              fullWidth
              label="Horário"
              name="schedule"
              value={formData.schedule}
              onChange={handleInputChange}
              margin="normal"
              placeholder="HH:MM"
            />
            <FormControl fullWidth margin="normal">
              <InputLabel>Frequência</InputLabel>
              <Select
                name="frequency"
                value={formData.frequency}
                label="Frequência"
                onChange={handleInputChange}
              >
                {frequencias.map((f) => (
                  <MenuItem key={f} value={f}>{f}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth margin="normal">
              <InputLabel>Prioridade</InputLabel>
              <Select
                name="priority"
                value={formData.priority}
                label="Prioridade"
                onChange={handleInputChange}
              >
                {prioridades.map((p) => (
                  <MenuItem key={p} value={p}>{p}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth margin="normal">
              <InputLabel>Status</InputLabel>
              <Select
                name="status"
                value={formData.status}
                label="Status"
                onChange={handleInputChange}
              >
                {status.map((s) => (
                  <MenuItem key={s} value={s}>{s}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="Duração (minutos)"
              name="estimated_duration"
              type="number"
              value={formData.estimated_duration}
              onChange={handleInputChange}
              margin="normal"
            />
            <TextField
              fullWidth
              label="Data de Início"
              name="start_date"
              type="datetime-local"
              value={formData.start_date}
              onChange={handleInputChange}
              margin="normal"
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              fullWidth
              label="Data de Término"
              name="end_date"
              type="datetime-local"
              value={formData.end_date}
              onChange={handleInputChange}
              margin="normal"
              InputLabelProps={{ shrink: true }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialogs}>Cancelar</Button>
          <Button onClick={handleAddRoutine} variant="contained" color="primary">
            Adicionar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo de Editar Rotina */}
      <Dialog open={openEditDialog} onClose={handleCloseDialogs} maxWidth="sm" fullWidth>
        <DialogTitle>Editar Rotina</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Nome"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              margin="normal"
            />
            <TextField
              fullWidth
              label="Descrição"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              margin="normal"
              multiline
              rows={2}
            />
            <TextField
              fullWidth
              label="Horário"
              name="schedule"
              value={formData.schedule}
              onChange={handleInputChange}
              margin="normal"
              placeholder="HH:MM"
            />
            <FormControl fullWidth margin="normal">
              <InputLabel>Frequência</InputLabel>
              <Select
                name="frequency"
                value={formData.frequency}
                label="Frequência"
                onChange={handleInputChange}
              >
                {frequencias.map((f) => (
                  <MenuItem key={f} value={f}>{f}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth margin="normal">
              <InputLabel>Prioridade</InputLabel>
              <Select
                name="priority"
                value={formData.priority}
                label="Prioridade"
                onChange={handleInputChange}
              >
                {prioridades.map((p) => (
                  <MenuItem key={p} value={p}>{p}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth margin="normal">
              <InputLabel>Status</InputLabel>
              <Select
                name="status"
                value={formData.status}
                label="Status"
                onChange={handleInputChange}
              >
                {status.map((s) => (
                  <MenuItem key={s} value={s}>{s}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="Duração (minutos)"
              name="estimated_duration"
              type="number"
              value={formData.estimated_duration}
              onChange={handleInputChange}
              margin="normal"
            />
            <TextField
              fullWidth
              label="Data de Início"
              name="start_date"
              type="datetime-local"
              value={formData.start_date}
              onChange={handleInputChange}
              margin="normal"
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              fullWidth
              label="Data de Término"
              name="end_date"
              type="datetime-local"
              value={formData.end_date}
              onChange={handleInputChange}
              margin="normal"
              InputLabelProps={{ shrink: true }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialogs}>Cancelar</Button>
          <Button onClick={handleUpdateRoutine} variant="contained" color="primary">
            Salvar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo de Confirmar Exclusão */}
      <Dialog open={openDeleteDialog} onClose={handleCloseDialogs}>
        <DialogTitle>Confirmar Exclusão</DialogTitle>
        <DialogContent>
          <Typography>
            Tem certeza que deseja excluir a rotina "{selectedRoutine?.name}"?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialogs}>Cancelar</Button>
          <Button onClick={handleDeleteRoutine} variant="contained" color="error">
            Excluir
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
});

RoutineCalendar.displayName = 'RoutineCalendar';

export default RoutineCalendar; 