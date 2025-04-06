import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Tooltip,
  Stack,
  SelectChangeEvent,
  Chip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import FilterListIcon from '@mui/icons-material/FilterList';
import RefreshIcon from '@mui/icons-material/Refresh';
import axios from 'axios';
import { Routine } from '@/types';

// Valores para os filtros
const prioridades = ['low', 'medium', 'high'];
const frequencias = ['daily', 'weekly', 'monthly', 'weekdays', 'weekends', 'custom'];
const status = ['pending', 'completed', 'cancelled'];

export interface RoutineListRef {
  refresh: () => void;
}

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

const RoutineList = forwardRef<RoutineListRef>((props, ref) => {
  // Estados
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Estados para filtros
  const [filtroNome, setFiltroNome] = useState('');
  const [filtroPrioridade, setFiltroPrioridade] = useState('');
  const [filtroFrequencia, setFiltroFrequencia] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  
  // Estados para diálogos
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

  // Função para buscar rotinas
  const fetchRoutines = async () => {
    try {
      setLoading(true);
      const response = await axios.get('https://api.itenorio.com/lambda/routines');
      const routinesData = response.data?.body?.data || response.data || [];
      setRoutines(Array.isArray(routinesData) ? routinesData : []);
      setError(null);
    } catch (error) {
      console.error('Erro ao buscar rotinas:', error);
      setError('Não foi possível carregar as rotinas. Tente novamente mais tarde.');
      setRoutines([]);
    } finally {
      setLoading(false);
    }
  };

  // Buscar rotinas ao montar o componente
  useEffect(() => {
    fetchRoutines();
  }, []);

  // Filtrar rotinas
  const filteredRoutines = routines.filter(routine => {
    const matchNome = routine.name.toLowerCase().includes(filtroNome.toLowerCase());
    const matchPrioridade = !filtroPrioridade || routine.priority === filtroPrioridade;
    const matchFrequencia = !filtroFrequencia || routine.frequency === filtroFrequencia;
    const matchStatus = !filtroStatus || routine.status === filtroStatus;
    
    return matchNome && matchPrioridade && matchFrequencia && matchStatus;
  });

  // Manipuladores de eventos
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

  // Funções de gerenciamento de rotinas
  const handleAddRoutine = async () => {
    try {
      await axios.post('https://api.itenorio.com/lambda/routines', formData);
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
      await axios.put(`https://api.itenorio.com/lambda/routines/${selectedRoutine.id}`, formData);
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

  // Formatar data
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Expor a função fetchRoutines através da ref
  useImperativeHandle(ref, () => ({
    refresh: () => {
      fetchRoutines();
    }
  }));

  return (
    <Paper elevation={3} sx={{ p: 2, height: '100%', overflow: 'auto' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" component="h2">
          Minhas Rotinas
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Atualizar rotinas">
            <IconButton onClick={fetchRoutines} color="primary">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenAddDialog}
          >
            Nova Rotina
          </Button>
        </Box>
      </Box>

      {/* Filtros */}
      <Box sx={{ mb: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            fullWidth
            label="Filtrar por nome"
            variant="outlined"
            size="small"
            value={filtroNome}
            onChange={(e) => setFiltroNome(e.target.value)}
          />
          <FormControl fullWidth size="small">
            <InputLabel>Prioridade</InputLabel>
            <Select
              value={filtroPrioridade}
              label="Prioridade"
              onChange={(e) => setFiltroPrioridade(e.target.value)}
            >
              <MenuItem value="">Todas</MenuItem>
              {prioridades.map((p) => (
                <MenuItem key={p} value={p}>{p}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth size="small">
            <InputLabel>Frequência</InputLabel>
            <Select
              value={filtroFrequencia}
              label="Frequência"
              onChange={(e) => setFiltroFrequencia(e.target.value)}
            >
              <MenuItem value="">Todas</MenuItem>
              {frequencias.map((f) => (
                <MenuItem key={f} value={f}>{f}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth size="small">
            <InputLabel>Status</InputLabel>
            <Select
              value={filtroStatus}
              label="Status"
              onChange={(e) => setFiltroStatus(e.target.value)}
            >
              <MenuItem value="">Todos</MenuItem>
              {status.map((s) => (
                <MenuItem key={s} value={s}>{s}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
      </Box>

      {/* Mensagem de erro */}
      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}

      {/* Lista de rotinas */}
      {loading ? (
        <Typography>Carregando rotinas...</Typography>
      ) : filteredRoutines.length === 0 ? (
        <Typography>Nenhuma rotina encontrada.</Typography>
      ) : (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Nome</TableCell>
                <TableCell>Descrição</TableCell>
                <TableCell>Horário</TableCell>
                <TableCell>Frequência</TableCell>
                <TableCell>Prioridade</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Duração</TableCell>
                <TableCell align="right">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredRoutines.map((routine) => (
                <TableRow key={routine.id}>
                  <TableCell>{routine.name}</TableCell>
                  <TableCell>{routine.description}</TableCell>
                  <TableCell>{routine.schedule}</TableCell>
                  <TableCell>
                    <Chip
                      label={routine.frequency}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={routine.priority}
                      size="small"
                      color={
                        routine.priority === 'high' ? 'error' :
                        routine.priority === 'medium' ? 'warning' :
                        'success'
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={routine.status}
                      size="small"
                      color={
                        routine.status === 'completed' ? 'success' :
                        routine.status === 'cancelled' ? 'error' :
                        'default'
                      }
                    />
                  </TableCell>
                  <TableCell>{routine.estimated_duration} min</TableCell>
                  <TableCell align="right">
                    <Tooltip title="Editar">
                      <IconButton size="small" onClick={() => handleOpenEditDialog(routine)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Excluir">
                      <IconButton size="small" onClick={() => handleOpenDeleteDialog(routine)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

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
    </Paper>
  );
});

export default RoutineList; 