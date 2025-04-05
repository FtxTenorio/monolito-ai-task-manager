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
  Tooltip
} from '@mui/material';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import WifiIcon from '@mui/icons-material/Wifi';
import WifiOffIcon from '@mui/icons-material/WifiOff';
import { styled } from '@mui/material/styles';

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
}));

// Interface para mensagens
interface Message {
  text: string;
  isUser: boolean;
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
  
  const socketRef = useRef<WebSocket | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  const SILENCE_THRESHOLD = 1500; // 1.5 segundos de silêncio
  const MAX_RECONNECT_ATTEMPTS = 3;
  const RECONNECT_INTERVAL = 3000; // 3 segundos

  // Efeito para rolar para baixo quando novas mensagens chegarem
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

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
      if (isConnected) {  // Só tenta reconectar se estava conectado
        setIsConnected(false);
        if (!isReconnecting) {
          startReconnectionProcess();
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
        if (data.response) {
          setMessages(prev => [...prev, { text: data.response, isUser: false }]);
          setStatus('Resposta recebida. Clique no microfone para falar novamente.');
          setIsProcessing(false);
        } else if (data.error) {
          setStatus(`Erro: ${data.error}`);
          setIsProcessing(false);
        }
      } catch (e) {
        console.error('Erro ao processar mensagem:', e);
        setIsProcessing(false);
      }
    };
  };

  const startReconnectionProcess = () => {
    setIsReconnecting(true);
    setReconnectAttempts(1);
    setStatus(`Desconectado do servidor. Tentativa de reconexão 1/${MAX_RECONNECT_ATTEMPTS}...`);
    
    const tryReconnect = (attempt: number) => {
      if (attempt > MAX_RECONNECT_ATTEMPTS) {
        setIsReconnecting(false);
        setStatus('Não foi possível conectar ao servidor. Clique em "Tentar Novamente" para reconectar.');
        return;
      }

      setReconnectAttempts(attempt);
      setStatus(`Tentativa de reconexão ${attempt}/${MAX_RECONNECT_ATTEMPTS}...`);
      connectWebSocket();

      reconnectTimerRef.current = setTimeout(() => {
        if (!isConnected) {
          tryReconnect(attempt + 1);
        }
      }, RECONNECT_INTERVAL);
    };

    tryReconnect(1);
  };

  const handleRetryConnection = () => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
    }
    startReconnectionProcess();
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
        
        recognitionRef.current.lang = 'pt-BR';
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        
        recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
          if (isStopping) return; // Ignora resultados se estiver parando
          
          let transcript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
          }
          
          // Atualizar o texto em tempo real
          setLiveText(transcript);
          
          // Resetar o timer de silêncio
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
          }
          
          // Configurar um novo timer para detectar silêncio
          silenceTimerRef.current = setTimeout(() => {
            if (transcript.trim() && !isStopping) {
              // Adicionar a mensagem do usuário ao chat
              setMessages(prev => [...prev, { text: transcript, isUser: true }]);
              
              // Limpar o texto em tempo real
              setLiveText('');
              
              // Enviar o texto para o servidor
              if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
                socketRef.current.send(JSON.stringify({ text: transcript }));
                setStatus('Processando sua mensagem...');
                setIsProcessing(true);
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
  }, [isListening, isStopping]);

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <ConnectionIndicator>
        <Tooltip title={isConnected ? "Conectado ao servidor" : "Desconectado do servidor"}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton color={isConnected ? "success" : "error"}>
              {isConnected ? <WifiIcon /> : <WifiOffIcon />}
            </IconButton>
            {!isConnected && !isReconnecting && (
              <IconButton 
                onClick={handleRetryConnection}
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
      </ConnectionIndicator>

      <Typography variant="h1" component="h1" align="center" gutterBottom>
        Assistente de Voz
      </Typography>
      
      <ChatContainer ref={chatContainerRef}>
        {messages.map((message, index) => (
          <MessageBubble key={index} isUser={message.isUser} elevation={1}>
            <Typography>{message.text}</Typography>
          </MessageBubble>
        ))}
      </ChatContainer>
      
      {isListening && (
        <LiveTextContainer elevation={0}>
          <Typography variant="body1" color="text.secondary">
            {liveText || 'Falando...'}
          </Typography>
        </LiveTextContainer>
      )}
      
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
        <Typography 
          variant="body2" 
          color={isConnected ? 'text.secondary' : 'error.main'}
          sx={{ fontStyle: 'italic' }}
        >
          {status}
        </Typography>
        
        <Fade in={isProcessing}>
          <CircularProgress size={24} sx={{ position: 'absolute', top: '50%', left: '50%', marginLeft: -12, marginTop: -12 }} />
        </Fade>
        
        <MicButton 
          onClick={toggleListening} 
          className={isListening ? 'recording' : ''}
          disabled={!isConnected}
        >
          {isListening ? <MicOffIcon fontSize="large" /> : <MicIcon fontSize="large" />}
        </MicButton>
      </Box>
    </Container>
  );
}
