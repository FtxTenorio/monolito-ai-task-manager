'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  Box, 
  Typography, 
  IconButton, 
  Paper, 
  Container,
  CircularProgress,
  Fade,
  TextField,
  Tooltip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  SelectChangeEvent,
  Dialog,
  DialogContent,
  DialogTitle,
  Button,
  Fab
} from '@mui/material';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import WifiIcon from '@mui/icons-material/Wifi';
import WifiOffIcon from '@mui/icons-material/WifiOff';
import LanguageIcon from '@mui/icons-material/Language';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import AddIcon from '@mui/icons-material/Add';
import ListAltIcon from '@mui/icons-material/ListAlt';
import { styled } from '@mui/material/styles';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import TaskList from '@/components/TaskList';
import Chat from '@/components/Chat';

// Componentes estilizados
const ChatContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(2),
  maxHeight: '60vh',
  overflowY: 'auto',
  padding: theme.spacing(2),
  marginBottom: theme.spacing(2),
  scrollBehavior: 'smooth',
}));

const MessageBubble = styled(Paper)<{ isUser: boolean }>(({ theme, isUser }) => ({
  padding: theme.spacing(2),
  maxWidth: '80%',
  alignSelf: isUser ? 'flex-end' : 'flex-start',
  backgroundColor: isUser ? theme.palette.primary.light : theme.palette.grey[100],
  color: isUser ? theme.palette.primary.contrastText : theme.palette.text.primary,
}));

const MicButton = styled(IconButton)(({ theme }) => ({
  width: 80,
  height: 80,
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
  '&:hover': {
    backgroundColor: theme.palette.primary.dark,
  },
  '&.recording': {
    backgroundColor: theme.palette.secondary.main,
    animation: 'pulse 1.5s infinite',
  },
  '@keyframes pulse': {
    '0%': {
      transform: 'scale(1)',
    },
    '50%': {
      transform: 'scale(1.1)',
    },
    '100%': {
      transform: 'scale(1)',
    },
  },
}));

const LiveTextContainer = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  marginBottom: theme.spacing(2),
  backgroundColor: theme.palette.background.paper,
  border: `1px dashed ${theme.palette.primary.main}`,
  minHeight: '60px',
  display: 'flex',
  alignItems: 'center',
}));

const ConnectionIndicator = styled(Box)(({ theme }) => ({
  position: 'fixed',
  top: theme.spacing(2),
  right: theme.spacing(2),
  zIndex: 1000,
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(2),
}));

const LanguageSelector = styled(FormControl)(({ theme }) => ({
  minWidth: 120,
  backgroundColor: 'rgba(255, 255, 255, 0.9)',
  borderRadius: theme.shape.borderRadius,
  '& .MuiOutlinedInput-root': {
    '& fieldset': {
      borderColor: theme.palette.primary.main,
    },
    '&:hover fieldset': {
      borderColor: theme.palette.primary.dark,
    },
  },
}));

const ResponseFormatSelector = styled(FormControl)(({ theme }) => ({
  minWidth: 120,
  backgroundColor: 'rgba(255, 255, 255, 0.9)',
  borderRadius: theme.shape.borderRadius,
  '& .MuiOutlinedInput-root': {
    '& fieldset': {
      borderColor: theme.palette.primary.main,
    },
    '&:hover fieldset': {
      borderColor: theme.palette.primary.dark,
    },
  },
}));

const CodeBlock = styled(Box)(({ theme }) => ({
  position: 'relative',
  margin: theme.spacing(1, 0),
  '& .language-label': {
    position: 'absolute',
    top: 0,
    right: 0,
    padding: theme.spacing(0.5, 1),
    backgroundColor: theme.palette.grey[800],
    color: theme.palette.grey[300],
    fontSize: '0.75rem',
    borderBottomLeftRadius: theme.shape.borderRadius,
  },
}));

const MessageContent = styled(Box)(({ theme }) => ({
  '& p': {
    margin: theme.spacing(1, 0),
  },
  '& h1, & h2, & h3, & h4, & h5, & h6': {
    margin: theme.spacing(2, 0, 1),
    color: theme.palette.text.primary,
    fontWeight: 500,
    lineHeight: 1.2,
  },
  '& h1': {
    fontSize: '1.5rem',
  },
  '& h2': {
    fontSize: '1.25rem',
  },
  '& h3': {
    fontSize: '1.1rem',
  },
  '& pre': {
    margin: 0,
    padding: 0,
    backgroundColor: 'transparent',
  },
  '& code': {
    backgroundColor: 'transparent',
    padding: theme.spacing(0.5),
    borderRadius: theme.shape.borderRadius,
    fontFamily: 'monospace',
    fontSize: '0.9em',
    color: theme.palette.primary.main,
  },
  '& ul, & ol': {
    margin: theme.spacing(1, 0),
    paddingLeft: theme.spacing(3),
    '& li': {
      margin: theme.spacing(0.5, 0),
    },
  },
  '& blockquote': {
    borderLeft: `4px solid ${theme.palette.primary.main}`,
    margin: theme.spacing(1, 0),
    paddingLeft: theme.spacing(1),
    color: theme.palette.text.secondary,
  },
  '& table': {
    borderCollapse: 'collapse',
    width: '100%',
    margin: theme.spacing(1, 0),
  },
  '& th, & td': {
    border: `1px solid ${theme.palette.divider}`,
    padding: theme.spacing(0.5),
    textAlign: 'left',
  },
  '& th': {
    backgroundColor: theme.palette.grey[100],
  },
  '& a': {
    color: theme.palette.primary.main,
    textDecoration: 'none',
    '&:hover': {
      textDecoration: 'underline',
    },
  },
  '& img': {
    maxWidth: '100%',
    height: 'auto',
    borderRadius: theme.shape.borderRadius,
    margin: theme.spacing(1, 0),
  },
}));

// Interface para mensagens
interface Message {
  text: string;
  isUser: boolean;
}

interface ThinkingUpdate {
  type: string;
  update_type: string;
  content: string;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [status, setStatus] = useState('Clique no microfone para começar');
  const [isConnected, setIsConnected] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [liveText, setLiveText] = useState('');
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('pt-BR');
  const [isTyping, setIsTyping] = useState(false);
  const [typingDots, setTypingDots] = useState('');
  const [responseFormat, setResponseFormat] = useState('markdown');
  const [isTaskListExpanded, setIsTaskListExpanded] = useState(false);
  const [thinkingUpdates, setThinkingUpdates] = useState<ThinkingUpdate[]>([]);
  
  const socketRef = useRef<WebSocket | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const taskListRef = useRef<{ fetchTasks: () => void }>(null);
  
  const SILENCE_THRESHOLD = 1500; // 1.5 segundos de silêncio
  const MAX_RECONNECT_ATTEMPTS = 5;
  const RECONNECT_INTERVAL = 3000; // 3 segundos

  // Efeito para rolar para baixo quando novas mensagens chegarem
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Efeito para animação dos pontinhos
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isTyping) {
      interval = setInterval(() => {
        setTypingDots(prev => {
          if (prev.length >= 2) return '';
          return prev + '.';
        });
      }, 500);
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isTyping]);

  const connectWebSocket = () => {
    if (socketRef.current) {
      socketRef.current.close();
    }

    socketRef.current = new WebSocket('ws://localhost:8000/ws');
    
    socketRef.current.onopen = () => {
      setIsConnected(true);
      setStatus('Conectado ao servidor. Clique no microfone para começar.');
      setReconnectAttempts(0);
      setIsReconnecting(false);
    };
    
    socketRef.current.onclose = () => {
      if (isConnected) {
        setIsConnected(false);
        if (!isReconnecting && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          setIsReconnecting(true);
          setReconnectAttempts(prev => prev + 1);
          setStatus('Reconectando...');
          setTimeout(() => {
            connectWebSocket();
          }, 1000 * Math.min(reconnectAttempts + 1, 5));
        } else if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
          setIsReconnecting(false);
          setStatus('Não foi possível conectar ao servidor. Tente novamente mais tarde.');
        }
      }
    };
    
    socketRef.current.onerror = (error) => {
      console.error('WebSocket error:', error);
      setStatus('Erro na conexão com o servidor.');
    };
    
    socketRef.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("Mensagem recebida do WebSocket:", data);
        
        if (data.type === 'thinking') {
          setThinkingUpdates(prev => [...prev, data]);
        } else if (data.type === 'message') {
          console.log("Adicionando mensagem ao chat:", data.content);
          setMessages(prev => [...prev, { text: data.content, isUser: false }]);
          setIsProcessing(false);
          setIsTyping(false);
          setThinkingUpdates([]);
        } else if (data.type === 'error') {
          console.error("Erro recebido do servidor:", data.content);
          setMessages(prev => [...prev, { text: `Erro: ${data.content}`, isUser: false }]);
          setIsProcessing(false);
          setIsTyping(false);
          setThinkingUpdates([]);
        }
      } catch (e) {
        console.error('Erro ao processar mensagem do WebSocket:', e);
      }
    };
  };

  // Inicializar WebSocket
  useEffect(() => {
    connectWebSocket();
    
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
    };
  }, []);

  // Inicializar reconhecimento de voz
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
      
      if (SpeechRecognitionAPI) {
        recognitionRef.current = new SpeechRecognitionAPI();
        
        recognitionRef.current.lang = selectedLanguage;
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        
        recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
          if (isStopping) return;
          
          let transcript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
          }
          
          setLiveText(transcript);
          
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
          }
          
          silenceTimerRef.current = setTimeout(() => {
            if (transcript.trim() && !isStopping) {
              setMessages(prev => [...prev, { text: transcript, isUser: true }]);
              setLiveText('');
              
              if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
                socketRef.current.send(JSON.stringify({ 
                  text: transcript,
                  format: responseFormat
                }));
                setStatus('Processando sua mensagem...');
                setIsProcessing(true);
                setIsTyping(true);
              }
            }
          }, SILENCE_THRESHOLD);
        };
        
        recognitionRef.current.onerror = (event: SpeechRecognitionErrorEvent) => {
          console.error('Erro no reconhecimento:', event.error);
          setStatus('Erro no reconhecimento de voz: ' + event.error);
        };
        
        recognitionRef.current.onend = () => {
          if (isListening && !isStopping) {
            setStatus('Reiniciando reconhecimento...');
            recognitionRef.current?.start();
          }
        };
      }
    }
    
    return () => {
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
    };
  }, [isListening, isStopping, selectedLanguage, responseFormat]);

  const handleLanguageChange = (event: SelectChangeEvent<string>) => {
    const newLanguage = event.target.value;
    setSelectedLanguage(newLanguage);
    
    // Se estiver ouvindo, reinicia o reconhecimento com o novo idioma
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current.lang = newLanguage;
      recognitionRef.current.start();
    }
  };

  const handleFormatChange = (event: SelectChangeEvent<string>) => {
    setResponseFormat(event.target.value);
  };

  const handleTaskListOpen = () => {
    setIsTaskListExpanded(true);
    // Pequeno delay para garantir que o componente está montado
    setTimeout(() => {
      taskListRef.current?.fetchTasks();
    }, 100);
  };

  // Função para alternar o reconhecimento de voz
  const toggleListening = () => {
    if (isListening) {
      // Primeiro, parar o reconhecimento
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current.abort(); // Força a parada imediata
      }
      
      // Limpar o timer de silêncio
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      
      // Atualizar estados
      setIsListening(false);
      setLiveText('');
      setStatus('Reconhecimento de voz parado. Clique no microfone para começar.');
    } else {
      if (recognitionRef.current) {
        recognitionRef.current.start();
        setIsListening(true);
        setStatus('Falando...');
      }
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4, height: '100vh', overflow: 'hidden' }}>
      <ConnectionIndicator>
        <Tooltip title={isConnected ? "Conectado ao servidor" : "Desconectado do servidor"}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton color={isConnected ? "success" : "error"}>
              {isConnected ? <WifiIcon /> : <WifiOffIcon />}
            </IconButton>
            {!isConnected && !isReconnecting && (
              <IconButton 
                onClick={connectWebSocket}
                color="primary"
                size="small"
                sx={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  '&:hover': { backgroundColor: 'rgba(255, 255, 255, 1)' }
                }}
              >
                <Typography variant="caption">Tentar Novamente</Typography>
              </IconButton>
            )}
          </Box>
        </Tooltip>
        
        <LanguageSelector size="small">
          <InputLabel id="language-select-label">
            <LanguageIcon fontSize="small" sx={{ mr: 1 }} />
            Idioma
          </InputLabel>
          <Select
            labelId="language-select-label"
            value={selectedLanguage}
            label="Idioma"
            onChange={handleLanguageChange}
            disabled={isListening}
          >
            <MenuItem value="pt-BR">Português (BR)</MenuItem>
            <MenuItem value="en-US">English (US)</MenuItem>
            <MenuItem value="es-ES">Español</MenuItem>
            <MenuItem value="fr-FR">Français</MenuItem>
            <MenuItem value="de-DE">Deutsch</MenuItem>
            <MenuItem value="it-IT">Italiano</MenuItem>
            <MenuItem value="ja-JP">日本語</MenuItem>
            <MenuItem value="ko-KR">한국어</MenuItem>
            <MenuItem value="zh-CN">中文</MenuItem>
            <MenuItem value="ru-RU">Русский</MenuItem>
          </Select>
        </LanguageSelector>

        <ResponseFormatSelector size="small">
          <InputLabel id="format-select-label">
            <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ marginRight: 8 }}>Formato</span>
            </Typography>
          </InputLabel>
          <Select
            labelId="format-select-label"
            value={responseFormat}
            label="Formato"
            onChange={handleFormatChange}
            disabled={isListening}
          >
            <MenuItem value="markdown">Markdown</MenuItem>
            <MenuItem value="text">Texto Simples</MenuItem>
            <MenuItem value="html">HTML</MenuItem>
          </Select>
        </ResponseFormatSelector>
      </ConnectionIndicator>

      <Typography variant="h1" component="h1" align="center" gutterBottom>
        Assistente de Voz
      </Typography>
      
      <div className="flex h-[calc(100vh-200px)]">
        {/* Chat */}
        <Chat
          messages={messages}
          isConnected={isConnected}
          isProcessing={isProcessing}
          isListening={isListening}
          status={status}
          onToggleListening={toggleListening}
          isTyping={isTyping}
          typingDots={typingDots}
          liveText={liveText}
          thinkingUpdates={thinkingUpdates}
        />
      </div>

      {/* Botões de atalho para tarefas */}
      <Box sx={{ position: 'fixed', bottom: 24, right: 24, display: 'flex', gap: 2 }}>
        <Tooltip title="Ver todas as tarefas">
          <Fab 
            color="primary" 
            onClick={handleTaskListOpen}
            sx={{ bgcolor: 'primary.main' }}
          >
            <ListAltIcon />
          </Fab>
        </Tooltip>
      </Box>

      {/* Dialog para TaskList expandida */}
      <Dialog
        open={isTaskListExpanded}
        onClose={() => setIsTaskListExpanded(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Minhas Tarefas</Typography>
            <IconButton 
              onClick={() => setIsTaskListExpanded(false)}
              color="primary"
              size="small"
            >
              <FullscreenExitIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <TaskList ref={taskListRef} />
        </DialogContent>
      </Dialog>
    </Container>
  );
}
