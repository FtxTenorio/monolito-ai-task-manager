'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  Box, 
  Typography, 
  IconButton, 
  Paper, 
  Container,
  CircularProgress,
  Fade
} from '@mui/material';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
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
  
  const socketRef = useRef<WebSocket | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  const SILENCE_THRESHOLD = 1500; // 1.5 segundos de silêncio

  // Inicializar WebSocket
  useEffect(() => {
    socketRef.current = new WebSocket('ws://localhost:8000/ws');
    
    socketRef.current.onopen = () => {
      setIsConnected(true);
      setStatus('Conectado ao servidor. Clique no microfone para começar.');
    };
    
    socketRef.current.onclose = () => {
      setIsConnected(false);
      setStatus('Desconectado do servidor. Tentando reconectar...');
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
    
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
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
          let transcript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
          }
          
          // Resetar o timer de silêncio
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
          }
          
          // Configurar um novo timer para detectar silêncio
          silenceTimerRef.current = setTimeout(() => {
            if (transcript.trim()) {
              // Adicionar a mensagem do usuário ao chat
              setMessages(prev => [...prev, { text: transcript, isUser: true }]);
              
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
          if (isListening) {
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
  }, [isListening]);

  // Função para alternar o reconhecimento de voz
  const toggleListening = () => {
    if (isListening) {
      // Parar o reconhecimento
      recognitionRef.current?.stop();
      setIsListening(false);
      setStatus('Reconhecimento de voz parado. Clique no microfone para começar.');
      
      // Limpar o timer de silêncio
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
    } else {
      // Iniciar o reconhecimento
      recognitionRef.current?.start();
      setIsListening(true);
      setStatus('Falando...');
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h1" component="h1" align="center" gutterBottom>
        Assistente de Voz
      </Typography>
      
      <ChatContainer>
        {messages.map((message, index) => (
          <MessageBubble key={index} isUser={message.isUser} elevation={1}>
            <Typography>{message.text}</Typography>
          </MessageBubble>
        ))}
      </ChatContainer>
      
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
