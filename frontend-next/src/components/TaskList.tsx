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
  Chip,
  Checkbox,
  FormControlLabel
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
const status = ['Pendente', 'Concluído'];

export interface TaskListRef {
  refresh: () => void;
}

const TaskList = forwardRef<TaskListRef>((props, ref) => {
  // Estados
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  
  // Estados para filtros
  const [filtroDescricao, setFiltroDescricao] = useState('');
  const [filtroPrioridade, setFiltroPrioridade] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  
  // Estados para diálogos
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [openBulkDeleteDialog, setOpenBulkDeleteDialog] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [formData, setFormData] = useState<TaskFormData>({
    descrição: '',
    prioridade: 'Média',
    categoria: 'Trabalho',
    status: 'Pendente'
  });

  // Função para buscar tarefas
  const fetchTasks = async () => {
    try {
      setLoading(true);
      const response = await axios.get('https://api.itenorio.com/lambda/tasks');
      // Garantir que tasks seja sempre um array
      const tasksData = response.data?.body?.Items || response.data || [];
      const tasksArray = Array.isArray(tasksData) ? tasksData : [];
      setTasks(tasksArray);
      
      // Extrair categorias únicas das tarefas
      const uniqueCategories = Array.from(new Set(tasksArray.map(task => task.Categoria)));
      setCategories(uniqueCategories);
      
      setError(null);
    } catch (error) {
      console.error('Erro ao buscar tarefas:', error);
      setError('Não foi possível carregar as tarefas. Tente novamente mais tarde.');
      setTasks([]); // Em caso de erro, garantir que tasks seja um array vazio
      setCategories([]); // Em caso de erro, garantir que categories seja um array vazio
    } finally {
      setLoading(false);
    }
  };

  // Buscar tarefas ao montar o componente
  useEffect(() => {
    fetchTasks();
  }, []);

  // Filtrar tarefas
  const filteredTasks = Array.isArray(tasks) ? tasks.filter(task => {
    const matchDescricao = task.Descrição.toLowerCase().includes(filtroDescricao.toLowerCase());
    const matchPrioridade = !filtroPrioridade || task.Prioridade === filtroPrioridade;
    const matchCategoria = !filtroCategoria || task.Categoria === filtroCategoria;
    const matchStatus = !filtroStatus || task.Status === filtroStatus;
    
    return matchDescricao && matchPrioridade && matchCategoria && matchStatus;
  }) : [];

  // Manipuladores de eventos
  const handleOpenAddDialog = () => {
    setFormData({
      descrição: '',
      prioridade: 'Média',
      categoria: categories.length > 0 ? categories[0] : '',
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

  // Função para lidar com a seleção de uma tarefa
  const handleSelectTask = (taskId: string) => {
    setSelectedTasks(prev => {
      if (prev.includes(taskId)) {
        return prev.filter(id => id !== taskId);
      } else {
        return [...prev, taskId];
      }
    });
  };

  // Função para selecionar/deselecionar todas as tarefas
  const handleSelectAllTasks = () => {
    if (selectedTasks.length === filteredTasks.length) {
      setSelectedTasks([]);
    } else {
      setSelectedTasks(filteredTasks.map(task => task.ID));
    }
  };

  // Função para abrir o diálogo de exclusão em massa
  const handleOpenBulkDeleteDialog = () => {
    if (selectedTasks.length > 0) {
      setOpenBulkDeleteDialog(true);
    }
  };

  // Função para fechar o diálogo de exclusão em massa
  const handleCloseBulkDeleteDialog = () => {
    setOpenBulkDeleteDialog(false);
  };

  // Função para excluir as tarefas selecionadas
  const handleBulkDeleteTasks = async () => {
    if (selectedTasks.length === 0) return;
    
    try {
      // Excluir cada tarefa selecionada
      for (const taskId of selectedTasks) {
        await axios.delete(`https://api.itenorio.com/lambda/tasks/${taskId}`);
      }
      
      // Atualizar a lista de tarefas
      fetchTasks();
      
      // Limpar a seleção e fechar o diálogo
      setSelectedTasks([]);
      handleCloseBulkDeleteDialog();
    } catch (err) {
      console.error('Erro ao excluir tarefas:', err);
      setError('Não foi possível excluir as tarefas. Tente novamente mais tarde.');
    }
  };

  // Expor a função fetchTasks através da ref
  useImperativeHandle(ref, () => ({
    refresh: () => {
      fetchTasks();
    }
  }));

  return (
    <Paper 
      elevation={3} 
      sx={{ 
        p: 2, 
        height: '100%', 
        overflow: 'auto',
        bgcolor: 'background.default',
        color: 'text.primary',
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" component="h2" sx={{ color: 'text.primary' }}>
          Lista de Tarefas
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleOpenAddDialog}
            sx={{
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              '&:hover': {
                bgcolor: 'primary.dark',
              },
            }}
          >
            Nova Tarefa
          </Button>
          {selectedTasks.length > 0 && (
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={handleOpenBulkDeleteDialog}
              sx={{
                borderColor: 'error.main',
                color: 'error.main',
                '&:hover': {
                  borderColor: 'error.dark',
                  bgcolor: 'error.dark',
                  color: 'error.contrastText',
                },
              }}
            >
              Excluir Selecionados
            </Button>
          )}
        </Box>
      </Box>

      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <TextField
          size="small"
          placeholder="Buscar tarefas..."
          value={filtroDescricao}
          onChange={(e) => setFiltroDescricao(e.target.value)}
          sx={{ 
            flexGrow: 1,
            '& .MuiOutlinedInput-root': {
              '& fieldset': {
                borderColor: 'divider',
              },
              '&:hover fieldset': {
                borderColor: 'primary.main',
              },
            },
          }}
        />
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Prioridade</InputLabel>
          <Select
            value={filtroPrioridade}
            label="Prioridade"
            onChange={(e) => setFiltroPrioridade(e.target.value)}
            sx={{ 
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: 'divider',
              },
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: 'primary.main',
              },
            }}
          >
            <MenuItem value="all">Todas</MenuItem>
            {prioridades.map((p) => (
              <MenuItem key={p} value={p}>{p}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Categoria</InputLabel>
          <Select
            value={filtroCategoria}
            label="Categoria"
            onChange={(e) => setFiltroCategoria(e.target.value)}
            sx={{ 
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: 'divider',
              },
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: 'primary.main',
              },
            }}
          >
            <MenuItem value="all">Todas</MenuItem>
            {categories.map((c) => (
              <MenuItem key={c} value={c}>{c}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={filtroStatus}
            label="Status"
            onChange={(e) => setFiltroStatus(e.target.value)}
            sx={{ 
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: 'divider',
              },
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: 'primary.main',
              },
            }}
          >
            <MenuItem value="all">Todos</MenuItem>
            {status.map((s) => (
              <MenuItem key={s} value={s}>{s}</MenuItem>
            ))}
          </Select>
        </FormControl>
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
          <Table size="small" sx={{ 
            '& .MuiTableCell-root': {
              borderColor: 'divider',
              color: 'text.primary',
            },
            '& .MuiTableHead-root': {
              '& .MuiTableCell-root': {
                bgcolor: 'background.default',
                color: 'text.primary',
                fontWeight: 'bold',
                borderBottom: 2,
                borderColor: 'divider',
              },
            },
            '& .MuiTableRow-root': {
              '&:hover': {
                bgcolor: 'action.hover',
              },
            },
          }}>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    indeterminate={selectedTasks.length > 0 && selectedTasks.length < filteredTasks.length}
                    checked={selectedTasks.length === filteredTasks.length && filteredTasks.length > 0}
                    onChange={handleSelectAllTasks}
                    sx={{
                      color: 'primary.main',
                      '&.Mui-checked': {
                        color: 'primary.main',
                      },
                    }}
                  />
                </TableCell>
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
                <TableRow 
                  key={task.ID}
                  hover
                  sx={{ 
                    '&:last-child td, &:last-child th': { border: 0 },
                    '&:hover': {
                      bgcolor: 'action.hover',
                    },
                  }}
                >
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selectedTasks.includes(task.ID)}
                      onChange={() => handleSelectTask(task.ID)}
                      sx={{
                        color: 'primary.main',
                        '&.Mui-checked': {
                          color: 'primary.main',
                        },
                      }}
                    />
                  </TableCell>
                  <TableCell>{task.Descrição}</TableCell>
                  <TableCell>
                    <Chip
                      label={task.Prioridade}
                      size="small"
                      sx={{
                        bgcolor: task.Prioridade === 'Alta' ? 'error.main' : 
                                task.Prioridade === 'Média' ? 'warning.main' : 
                                'success.main',
                        color: 'white',
                        '&:hover': {
                          bgcolor: task.Prioridade === 'Alta' ? 'error.dark' : 
                                  task.Prioridade === 'Média' ? 'warning.dark' : 
                                  'success.dark',
                        },
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={task.Categoria}
                      size="small"
                      sx={{
                        bgcolor: 'primary.main',
                        color: 'primary.contrastText',
                        '&:hover': {
                          bgcolor: 'primary.dark',
                        },
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={task.Status}
                      size="small"
                      sx={{
                        bgcolor: task.Status === 'Concluída' ? 'success.main' : 
                                task.Status === 'Em Andamento' ? 'info.main' : 
                                'warning.main',
                        color: 'white',
                        '&:hover': {
                          bgcolor: task.Status === 'Concluída' ? 'success.dark' : 
                                  task.Status === 'Em Andamento' ? 'info.dark' : 
                                  'warning.dark',
                        },
                      }}
                    />
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
      <Dialog 
        open={openAddDialog} 
        onClose={handleCloseDialogs} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: 'background.paper',
            color: 'text.primary',
          }
        }}
      >
        <DialogTitle sx={{ borderBottom: 1, borderColor: 'divider' }}>Nova Tarefa</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Descrição"
              name="descrição"
              value={formData.descrição}
              onChange={handleInputChange}
              margin="normal"
              sx={{ 
                '& .MuiOutlinedInput-root': {
                  '& fieldset': {
                    borderColor: 'divider',
                  },
                  '&:hover fieldset': {
                    borderColor: 'primary.main',
                  },
                },
                '& .MuiInputLabel-root': {
                  color: 'text.secondary',
                },
              }}
            />
            <FormControl fullWidth margin="normal">
              <InputLabel>Prioridade</InputLabel>
              <Select
                name="prioridade"
                value={formData.prioridade}
                label="Prioridade"
                onChange={handleInputChange}
                sx={{ 
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'divider',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'primary.main',
                  },
                  '& .MuiInputLabel-root': {
                    color: 'text.secondary',
                  },
                }}
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
                sx={{ 
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'divider',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'primary.main',
                  },
                  '& .MuiInputLabel-root': {
                    color: 'text.secondary',
                  },
                }}
              >
                {categories.map((c) => (
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
                sx={{ 
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'divider',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'primary.main',
                  },
                  '& .MuiInputLabel-root': {
                    color: 'text.secondary',
                  },
                }}
              >
                {status.map((s) => (
                  <MenuItem key={s} value={s}>{s}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions sx={{ borderTop: 1, borderColor: 'divider', p: 2 }}>
          <Button onClick={handleCloseDialogs}>Cancelar</Button>
          <Button onClick={handleAddTask} variant="contained" color="primary">
            Adicionar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo de Editar Tarefa */}
      <Dialog 
        open={openEditDialog} 
        onClose={handleCloseDialogs} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: 'background.paper',
            color: 'text.primary',
          }
        }}
      >
        <DialogTitle sx={{ borderBottom: 1, borderColor: 'divider' }}>Editar Tarefa</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Descrição"
              name="descrição"
              value={formData.descrição}
              onChange={handleInputChange}
              margin="normal"
              sx={{ 
                '& .MuiOutlinedInput-root': {
                  '& fieldset': {
                    borderColor: 'divider',
                  },
                  '&:hover fieldset': {
                    borderColor: 'primary.main',
                  },
                },
                '& .MuiInputLabel-root': {
                  color: 'text.secondary',
                },
              }}
            />
            <FormControl fullWidth margin="normal">
              <InputLabel>Prioridade</InputLabel>
              <Select
                name="prioridade"
                value={formData.prioridade}
                label="Prioridade"
                onChange={handleInputChange}
                sx={{ 
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'divider',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'primary.main',
                  },
                  '& .MuiInputLabel-root': {
                    color: 'text.secondary',
                  },
                }}
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
                sx={{ 
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'divider',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'primary.main',
                  },
                  '& .MuiInputLabel-root': {
                    color: 'text.secondary',
                  },
                }}
              >
                {categories.map((c) => (
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
                sx={{ 
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'divider',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'primary.main',
                  },
                  '& .MuiInputLabel-root': {
                    color: 'text.secondary',
                  },
                }}
              >
                {status.map((s) => (
                  <MenuItem key={s} value={s}>{s}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions sx={{ borderTop: 1, borderColor: 'divider', p: 2 }}>
          <Button onClick={handleCloseDialogs}>Cancelar</Button>
          <Button onClick={handleUpdateTask} variant="contained" color="primary">
            Salvar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo de Confirmar Exclusão */}
      <Dialog 
        open={openDeleteDialog} 
        onClose={handleCloseDialogs}
        PaperProps={{
          sx: {
            bgcolor: 'background.paper',
            color: 'text.primary',
          }
        }}
      >
        <DialogTitle sx={{ borderBottom: 1, borderColor: 'divider' }}>Confirmar Exclusão</DialogTitle>
        <DialogContent>
          <Typography>
            Tem certeza que deseja excluir a tarefa "{selectedTask?.Descrição}"?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ borderTop: 1, borderColor: 'divider', p: 2 }}>
          <Button onClick={handleCloseDialogs}>Cancelar</Button>
          <Button onClick={handleDeleteTask} variant="contained" color="error">
            Excluir
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo de Exclusão em Massa */}
      <Dialog 
        open={openBulkDeleteDialog} 
        onClose={handleCloseBulkDeleteDialog}
        PaperProps={{
          sx: {
            bgcolor: 'background.paper',
            color: 'text.primary',
          }
        }}
      >
        <DialogTitle sx={{ borderBottom: 1, borderColor: 'divider' }}>Confirmar Exclusão</DialogTitle>
        <DialogContent>
          <Typography>
            Tem certeza que deseja excluir {selectedTasks.length} tarefa(s) selecionada(s)?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ borderTop: 1, borderColor: 'divider', p: 2 }}>
          <Button onClick={handleCloseBulkDeleteDialog}>Cancelar</Button>
          <Button onClick={handleBulkDeleteTasks} variant="contained" color="error">
            Excluir
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
});

export default TaskList; 