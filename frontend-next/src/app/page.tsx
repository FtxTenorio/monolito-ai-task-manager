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
import MainLayout from '@/components/MainLayout';
import { Message } from '@/types';

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

// Componente para exibir ferramentas ativas
const ToolExecutionIndicator = ({ activeTools }: { activeTools: string[] }) => {
  if (activeTools.length === 0) return null;
  
  return (
    <Box 
      sx={{ 
        position: 'fixed', 
        bottom: 100, 
        left: '50%', 
        transform: 'translateX(-50%)',
        backgroundColor: 'rgba(33, 150, 243, 0.9)',
        color: 'white',
        padding: '8px 16px',
        borderRadius: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.2)',
        zIndex: 1000,
        maxWidth: '80%',
        overflow: 'hidden'
      }}
    >
      <CircularProgress size={16} sx={{ color: 'white' }} />
      <Typography variant="body2" sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        Executando: {activeTools.join(', ')}
      </Typography>
    </Box>
  );
};

export default function Home() {
  // State declarations with explicit types
  const [messages, setMessages] = useState<Message[]>([]);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [typingDots, setTypingDots] = useState<string>('');
  const [liveText, setLiveText] = useState<string>('');
  const [status, setStatus] = useState<string>('Conectando ao servidor...');
  const [error, setError] = useState<string | null>(null);
  const [responseFormat, setResponseFormat] = useState<string>('markdown');
  const [language, setLanguage] = useState<string>('pt-BR');
  const [activeTools, setActiveTools] = useState<string[]>([]);
  
  // Ref declarations with explicit types
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const typingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const MAX_RECONNECT_ATTEMPTS = 5;
  const RECONNECT_INTERVAL = 3000; // 3 segundos

  // Adicionar logs para depuração
  console.log("Home renderizando com estado:", {
    messagesLength: messages.length,
    isProcessing
  });

  // Efeito para rolar para baixo quando novas mensagens chegarem
  useEffect(() => {
    // Removed chatContainerRef references
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

  // Function declarations with explicit types
  const handleFormatChange = (format: string): void => {
    setResponseFormat(format);
  };

  const addUserMessage = (text: string): void => {
    console.log("Enviando mensagem para o backend:", text);
    setMessages(prev => [...prev, { text, isUser: true }]);
    setIsTyping(true);
    setStatus('Processando...');
    
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      const messageData = {
        text: text,
        format: responseFormat,
        language: language
      };
      console.log("Enviando dados para o WebSocket:", messageData);
      socketRef.current.send(JSON.stringify(messageData));
    } else {
      console.error("WebSocket não está conectado. Estado:", socketRef.current?.readyState);
      setError('Não foi possível enviar a mensagem. Servidor desconectado.');
      setStatus('Erro na conexão. Tente novamente.');
    }
  };

  const addAIMessage = (text: string): void => {
    setMessages(prevMessages => [
      ...prevMessages,
      {
        text,
        isUser: false,
        processingStartTime: new Date(),
        processingEndTime: new Date()
      }
    ]);
    
    setIsProcessing(false);
    setIsTyping(false);
    setStatus('Resposta recebida. Digite sua mensagem para continuar.');
  };

  const addErrorMessage = (text: string): void => {
    setMessages(prev => [...prev, { text: `Erro: ${text}`, isUser: false }]);
    setIsProcessing(false);
    setIsTyping(false);
  };

  const handleRetryMessage = (messageIndex: number): void => {
    const userMessageIndex = messageIndex - 1;
    if (userMessageIndex >= 0 && userMessageIndex < messages.length) {
      const userMessage = messages[userMessageIndex];
      
      setMessages(prevMessages => {
        const newMessages = [...prevMessages];
        newMessages.splice(messageIndex, 1);
        return newMessages;
      });
      
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({ 
          text: userMessage.text,
          format: responseFormat
        }));
        setStatus('Processando sua mensagem...');
        setIsProcessing(true);
        setIsTyping(true);
      }
    }
  };

  const connectWebSocket = (): void => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    
    if (socketRef.current) {
      socketRef.current.close();
    }
    
    setStatus('Conectando ao servidor...');
    
    try {
      const socket = new WebSocket('ws://localhost:8000/ws');
      socketRef.current = socket;
      
      socket.onopen = () => {
        console.log('WebSocket conectado');
        setIsConnected(true);
        setStatus('Conectado. Digite sua mensagem para começar.');
        setError(null);
      };
      
      socket.onclose = () => {
        console.log('WebSocket desconectado');
        setIsConnected(false);
        setStatus('Desconectado do servidor. Tentando reconectar...');
        
        reconnectTimerRef.current = setTimeout(() => {
          connectWebSocket();
        }, 5000);
      };
      
      socket.onerror = (event) => {
        console.error('Erro no WebSocket:', event);
        setError('Erro na conexão com o servidor');
      };
      
      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log("Recebido do WebSocket:", data);
          
          if (data.type === 'message') {
            console.log("Adicionando mensagem ao chat:", data.content);
            addAIMessage(data.content);
          } else if (data.type === 'error') {
            console.error("Erro recebido do servidor:", data.content);
            addErrorMessage(data.content);
          }
        } catch (e) {
          console.error('Erro ao processar mensagem do WebSocket:', e);
        }
      };
    } catch (error) {
      console.error('Erro ao criar WebSocket:', error);
      setError('Não foi possível conectar ao servidor');
      setStatus('Erro na conexão. Tente novamente mais tarde.');
    }
  };

  // Placeholder functions for audio-related functionality
  const toggleListening = (): void => {
    // This is now just a placeholder function
    console.log("Audio functionality has been removed");
  };

  const handleLanguageChange = (event: SelectChangeEvent<string>) => {
    const newLanguage = event.target.value;
    setLanguage(newLanguage);
  };

  return (
    <MainLayout
      messages={messages}
      onSendMessage={addUserMessage}
      isProcessing={isProcessing}
      isTyping={isTyping}
      status={status}
      error={error}
      responseFormat={responseFormat}
      onFormatChange={handleFormatChange}
      isConnected={isConnected}
      onReconnect={connectWebSocket}
      isListening={isListening}
      onToggleListening={toggleListening}
    />
  );
}



