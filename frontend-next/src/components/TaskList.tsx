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

// Tipos
interface Task {
  ID: string;
  Descrição: string;
  Prioridade: string;
  Categoria: string;
  Status: string;
  'Data de Criação': string;
}

interface TaskFormData {
  descrição: string;
  prioridade: string;
  categoria: string;
  status: string;
}

// Valores para os filtros
const prioridades = ['Alta', 'Média', 'Baixa'];
const categorias = ['Compasso', 'Geral', 'Continuar', 'Desenvolvimento', 'Backup'];
const status = ['Pendente', 'Concluído'];

const TaskList = forwardRef<{ fetchTasks: () => void }>((props, ref) => {
  // Estados
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Estados para filtros
  const [filtroDescricao, setFiltroDescricao] = useState('');
  const [filtroPrioridade, setFiltroPrioridade] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  
  // Estados para diálogos
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [formData, setFormData] = useState<TaskFormData>({
    descrição: '',
    prioridade: 'Alta',
    categoria: 'Geral',
    status: 'Pendente'
  });

  // Função para buscar tarefas
  const fetchTasks = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:8000/tasks');
      setTasks(response.data);
      setError(null);
    } catch (error) {
      console.error('Erro ao buscar tarefas:', error);
      setError('Não foi possível carregar as tarefas. Tente novamente mais tarde.');
    } finally {
      setLoading(false);
    }
  };

  // Buscar tarefas ao montar o componente
  useEffect(() => {
    fetchTasks();
  }, []);

  // Filtrar tarefas
  const filteredTasks = tasks.filter(task => {
    const matchDescricao = task.Descrição.toLowerCase().includes(filtroDescricao.toLowerCase());
    const matchPrioridade = !filtroPrioridade || task.Prioridade === filtroPrioridade;
    const matchCategoria = !filtroCategoria || task.Categoria === filtroCategoria;
    const matchStatus = !filtroStatus || task.Status === filtroStatus;
    
    return matchDescricao && matchPrioridade && matchCategoria && matchStatus;
  });

  // Manipuladores de eventos
  const handleOpenAddDialog = () => {
    setFormData({
      descrição: '',
      prioridade: 'Alta',
      categoria: 'Geral',
      status: 'Pendente'
    });
    setOpenAddDialog(true);
  };

  const handleOpenEditDialog = (task: Task) => {
    setSelectedTask(task);
    setFormData({
      descrição: task.Descrição,
      prioridade: task.Prioridade,
      categoria: task.Categoria,
      status: task.Status
    });
    setOpenEditDialog(true);
  };

  const handleOpenDeleteDialog = (task: Task) => {
    setSelectedTask(task);
    setOpenDeleteDialog(true);
  };

  const handleCloseDialogs = () => {
    setOpenAddDialog(false);
    setOpenEditDialog(false);
    setOpenDeleteDialog(false);
    setSelectedTask(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name as string]: value
    }));
  };

  // Funções de gerenciamento de tarefas
  const handleAddTask = async () => {
    try {
      const formattedTask = {
        descricao: formData.descrição,
        prioridade: formData.prioridade,
        categoria: formData.categoria,
        status: formData.status
      };
      
      await axios.post('https://api.itenorio.com/lambda/tasks', formattedTask);
      fetchTasks();
      handleCloseDialogs();
    } catch (err) {
      console.error('Erro ao adicionar tarefa:', err);
      setError('Não foi possível adicionar a tarefa. Tente novamente mais tarde.');
    }
  };

  const handleUpdateTask = async () => {
    if (!selectedTask) return;
    
    try {
      const formattedTask: Record<string, string> = {};
      
      if (formData.descrição !== selectedTask.Descrição) formattedTask.descricao = formData.descrição;
      if (formData.prioridade !== selectedTask.Prioridade) formattedTask.prioridade = formData.prioridade;
      if (formData.categoria !== selectedTask.Categoria) formattedTask.categoria = formData.categoria;
      if (formData.status !== selectedTask.Status) formattedTask.status = formData.status;
      
      await axios.patch(`https://api.itenorio.com/lambda/tasks/${selectedTask.ID}`, formattedTask);
      fetchTasks();
      handleCloseDialogs();
    } catch (err) {
      console.error('Erro ao atualizar tarefa:', err);
      setError('Não foi possível atualizar a tarefa. Tente novamente mais tarde.');
    }
  };

  const handleDeleteTask = async () => {
    if (!selectedTask) return;
    
    try {
      await axios.delete(`https://api.itenorio.com/lambda/tasks/${selectedTask.ID}`);
      fetchTasks();
      handleCloseDialogs();
    } catch (err) {
      console.error('Erro ao excluir tarefa:', err);
      setError('Não foi possível excluir a tarefa. Tente novamente mais tarde.');
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

  // Expor a função fetchTasks através da ref
  useImperativeHandle(ref, () => ({
    fetchTasks
  }));

  return (
    <Paper elevation={3} sx={{ p: 2, height: '100%', overflow: 'auto' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" component="h2">
          Minhas Tarefas
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Atualizar tarefas">
            <IconButton onClick={fetchTasks} color="primary">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenAddDialog}
          >
            Nova Tarefa
          </Button>
        </Box>
      </Box>

      {/* Filtros */}
      <Box sx={{ mb: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            fullWidth
            label="Filtrar por descrição"
            variant="outlined"
            size="small"
            value={filtroDescricao}
            onChange={(e) => setFiltroDescricao(e.target.value)}
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
            <InputLabel>Categoria</InputLabel>
            <Select
              value={filtroCategoria}
              label="Categoria"
              onChange={(e) => setFiltroCategoria(e.target.value)}
            >
              <MenuItem value="">Todas</MenuItem>
              {categorias.map((c) => (
                <MenuItem key={c} value={c}>{c}</MenuItem>
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

      {/* Lista de tarefas */}
      {loading ? (
        <Typography>Carregando tarefas...</Typography>
      ) : filteredTasks.length === 0 ? (
        <Typography>Nenhuma tarefa encontrada.</Typography>
      ) : (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Descrição</TableCell>
                <TableCell>Prioridade</TableCell>
                <TableCell>Categoria</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Data</TableCell>
                <TableCell align="right">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredTasks.map((task) => (
                <TableRow key={task.ID}>
                  <TableCell>{task.Descrição}</TableCell>
                  <TableCell>
                    <Typography
                      sx={{
                        color: 
                          task.Prioridade === 'Alta' ? 'error.main' : 
                          task.Prioridade === 'Média' ? 'warning.main' : 
                          'success.main',
                        fontWeight: 'bold'
                      }}
                    >
                      {task.Prioridade}
                    </Typography>
                  </TableCell>
                  <TableCell>{task.Categoria}</TableCell>
                  <TableCell>
                    <Typography
                      sx={{
                        color: task.Status === 'Concluído' ? 'success.main' : 'text.primary',
                        fontWeight: task.Status === 'Concluído' ? 'bold' : 'normal'
                      }}
                    >
                      {task.Status}
                    </Typography>
                  </TableCell>
                  <TableCell>{formatDate(task['Data de Criação'])}</TableCell>
                  <TableCell align="right">
                    <Tooltip title="Editar">
                      <IconButton size="small" onClick={() => handleOpenEditDialog(task)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Excluir">
                      <IconButton size="small" onClick={() => handleOpenDeleteDialog(task)}>
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

      {/* Diálogo de Adicionar Tarefa */}
      <Dialog open={openAddDialog} onClose={handleCloseDialogs} maxWidth="sm" fullWidth>
        <DialogTitle>Nova Tarefa</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Descrição"
              name="descrição"
              value={formData.descrição}
              onChange={handleInputChange}
              margin="normal"
            />
            <FormControl fullWidth margin="normal">
              <InputLabel>Prioridade</InputLabel>
              <Select
                name="prioridade"
                value={formData.prioridade}
                label="Prioridade"
                onChange={handleInputChange}
              >
                {prioridades.map((p) => (
                  <MenuItem key={p} value={p}>{p}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth margin="normal">
              <InputLabel>Categoria</InputLabel>
              <Select
                name="categoria"
                value={formData.categoria}
                label="Categoria"
                onChange={handleInputChange}
              >
                {categorias.map((c) => (
                  <MenuItem key={c} value={c}>{c}</MenuItem>
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
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialogs}>Cancelar</Button>
          <Button onClick={handleAddTask} variant="contained" color="primary">
            Adicionar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo de Editar Tarefa */}
      <Dialog open={openEditDialog} onClose={handleCloseDialogs} maxWidth="sm" fullWidth>
        <DialogTitle>Editar Tarefa</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Descrição"
              name="descrição"
              value={formData.descrição}
              onChange={handleInputChange}
              margin="normal"
            />
            <FormControl fullWidth margin="normal">
              <InputLabel>Prioridade</InputLabel>
              <Select
                name="prioridade"
                value={formData.prioridade}
                label="Prioridade"
                onChange={handleInputChange}
              >
                {prioridades.map((p) => (
                  <MenuItem key={p} value={p}>{p}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth margin="normal">
              <InputLabel>Categoria</InputLabel>
              <Select
                name="categoria"
                value={formData.categoria}
                label="Categoria"
                onChange={handleInputChange}
              >
                {categorias.map((c) => (
                  <MenuItem key={c} value={c}>{c}</MenuItem>
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
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialogs}>Cancelar</Button>
          <Button onClick={handleUpdateTask} variant="contained" color="primary">
            Salvar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo de Confirmar Exclusão */}
      <Dialog open={openDeleteDialog} onClose={handleCloseDialogs}>
        <DialogTitle>Confirmar Exclusão</DialogTitle>
        <DialogContent>
          <Typography>
            Tem certeza que deseja excluir a tarefa "{selectedTask?.Descrição}"?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialogs}>Cancelar</Button>
          <Button onClick={handleDeleteTask} variant="contained" color="error">
            Excluir
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
});

export default TaskList; 