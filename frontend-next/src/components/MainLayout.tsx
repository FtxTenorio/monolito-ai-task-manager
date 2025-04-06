import React, { useState, useRef, useEffect } from 'react';
import { Box, Paper, Fab, IconButton, Typography, Tooltip, Switch, FormControlLabel, Drawer, List, ListItem, ListItemIcon, ListItemText, ListItemButton, Divider } from '@mui/material';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import MinimizeIcon from '@mui/icons-material/Minimize';
import MaximizeIcon from '@mui/icons-material/Maximize';
import ChatIcon from '@mui/icons-material/Chat';
import ListAltIcon from '@mui/icons-material/ListAlt';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import { styled } from '@mui/material/styles';
import TaskList from './TaskList';
import RoutineCalendar from './RoutineCalendar';
import FloatingChat from './FloatingChat';
import { Message } from '@/types';

// Declaração de tipos para a API de reconhecimento de voz
declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

const DRAWER_WIDTH = 240;

// Styled components
const MainContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  height: '100vh',
  width: '100%',
  overflow: 'hidden',
  position: 'relative',
}));

const SideDrawer = styled(Drawer)(({ theme }) => ({
  width: DRAWER_WIDTH,
  flexShrink: 0,
  '& .MuiDrawer-paper': {
    width: DRAWER_WIDTH,
    boxSizing: 'border-box',
    backgroundColor: theme.palette.background.paper,
    borderRight: `1px solid ${theme.palette.divider}`,
    height: '100%',
    position: 'relative',
    zIndex: 1,
  },
}));

const ContentArea = styled(Box)(({ theme }) => ({
  flex: 1,
  overflow: 'auto',
  marginLeft: DRAWER_WIDTH,
  height: 'calc(100vh - 80px)', // Subtract bottom bar height
  [theme.breakpoints.down('md')]: {
    marginLeft: 0,
  },
}));

const BottomBar = styled(Paper)(({ theme }) => ({
  position: 'fixed',
  bottom: 0,
  left: 0,
  right: 0,
  height: 80,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: theme.spacing(1),
  backgroundColor: theme.palette.background.paper,
  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
  zIndex: 1200, // Higher than the drawer
}));

const MicButton = styled(Fab)(({ theme }) => ({
  width: 60,
  height: 60,
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
  '&:hover': {
    backgroundColor: theme.palette.primary.dark,
  },
  '&.recording': {
    backgroundColor: theme.palette.error.main,
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

const MinimizeButton = styled(IconButton)(({ theme }) => ({
  position: 'absolute',
  right: theme.spacing(2),
  color: theme.palette.text.secondary,
  '&:hover': {
    color: theme.palette.text.primary,
  },
}));

interface MainLayoutProps {
  children?: React.ReactNode;
  messages: Message[];
  onSendMessage: (message: string) => void;
  isProcessing: boolean;
  isTyping: boolean;
  status: string;
  error: string | null;
  responseFormat: string;
  onFormatChange: (format: string) => void;
  isConnected: boolean;
  onReconnect: () => void;
  isListening: boolean;
  onToggleListening: () => void;
}

const MainLayout: React.FC<MainLayoutProps> = ({
  children,
  messages,
  onSendMessage,
  isProcessing,
  isTyping,
  status,
  error,
  responseFormat,
  onFormatChange,
  isConnected,
  onReconnect,
  isListening,
  onToggleListening,
}) => {
  const [isChatVisible, setIsChatVisible] = useState(true);
  const [isChatMinimized, setIsChatMinimized] = useState(false);
  const [continuousListening, setContinuousListening] = useState(true);
  const [recognizedText, setRecognizedText] = useState('');
  const [currentView, setCurrentView] = useState<'tasks' | 'calendar'>('tasks');
  const taskListRef = useRef<any>(null);
  const routineCalendarRef = useRef<any>(null);
  const recognitionRef = useRef<any>(null);

  // Função para lidar com o envio de mensagem
  const handleSendMessage = (message: string) => {
    onSendMessage(message);
    // Limpar o texto reconhecido após o envio
    setRecognizedText('');
  };

  // Função utilitária para inicializar o reconhecimento de voz
  const initializeSpeechRecognition = (continuous: boolean) => {
    // Verificar se o navegador suporta a API de reconhecimento de voz
    if (typeof window === 'undefined') {
      console.error('Window is not defined');
      return false;
    }

    // Verificar se a API está disponível
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.error('Speech recognition not supported in this browser');
      return false;
    }

    try {
      // Usar a API apropriada dependendo do navegador
      const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true; // Sempre mantém como true para permitir reconhecimento contínuo
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'pt-BR';

      recognitionRef.current.onresult = (event: any) => {
        console.log('Recognition result:', event.results);
        // Process all results
        for (let i = 0; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          console.log('Transcript:', transcript, 'Continuous:', continuous);
          
          if (continuous) {
            // Se escuta contínua estiver ativada, envia a mensagem diretamente
            onSendMessage(transcript);
          } else {
            // Se escuta contínua estiver desativada, coloca o texto na caixa de mensagens
            setRecognizedText(transcript);
            // Para o reconhecimento após capturar o texto
            recognitionRef.current.stop();
          }
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        // Restart recognition on error if still listening
        if (isListening) {
          setTimeout(() => {
            if (recognitionRef.current && isListening) {
              recognitionRef.current.start();
            }
          }, 300);
        }
      };

      recognitionRef.current.onend = () => {
        console.log('Recognition ended, continuous:', continuous, 'isListening:', isListening);
        
        // Sempre reinicia o reconhecimento se estiver no modo de escuta
        if (isListening) {
          console.log('Restarting recognition');
          setTimeout(() => {
            if (recognitionRef.current && isListening) {
              recognitionRef.current.start();
            }
          }, 300);
        }
      };

      return true;
    } catch (error) {
      console.error('Error initializing speech recognition:', error);
      return false;
    }
  };

  // Initialize speech recognition
  useEffect(() => {
    if (isListening) {
      const initialized = initializeSpeechRecognition(continuousListening);
      if (initialized && recognitionRef.current) {
        recognitionRef.current.start();
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [onSendMessage, continuousListening, isListening]);

  const handleMinimizeChat = () => {
    console.log('Minimizando chat');
    setIsChatMinimized(true);
  };

  const handleMaximizeChat = () => {
    console.log('Maximizando chat');
    setIsChatMinimized(false);
    setIsChatVisible(true);
  };

  const handleToggleChatVisibility = () => {
    console.log('Toggle chat visibility, isChatVisible:', isChatVisible, 'isChatMinimized:', isChatMinimized);
    
    if (isChatMinimized) {
      setIsChatMinimized(false);
      setIsChatVisible(true);
    } else {
      setIsChatMinimized(true);
    }
  };

  const handleMicButtonClick = () => {
    // Verificar se o navegador suporta a API de reconhecimento de voz
    if (typeof window === 'undefined') {
      console.log('Window is not defined');
      return;
    }

    // Verificar se a API está disponível
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.log('Speech recognition not supported in this browser');
      return;
    }

    // Se o chat estiver minimizado, abrir ele
    if (isChatMinimized) {
      handleMaximizeChat();
    }

    // Primeiro, alternar o estado de escuta
    onToggleListening();

    // Se estiver desligando o microfone
    if (isListening) {
      console.log('Desligando microfone...');
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (error) {
          console.error('Error stopping recognition:', error);
        }
        recognitionRef.current = null; // Limpar a referência para forçar reinicialização
      }
    } else {
      // Se estiver ligando o microfone
      console.log('Ligando microfone...');
      
      // Sempre reinicializar o reconhecimento para evitar problemas
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (error) {
          console.error('Error stopping existing recognition:', error);
        }
        recognitionRef.current = null;
      }
      
      const initialized = initializeSpeechRecognition(continuousListening);
      if (!initialized) {
        console.error('Failed to initialize speech recognition');
        return;
      }
      
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (error) {
          console.error('Error starting recognition:', error);
        }
      }
    }
  };

  const handleContinuousListeningChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.checked;
    console.log('Continuous listening changed to:', newValue);
    setContinuousListening(newValue);
    
    // If already listening, restart recognition with new settings
    if (isListening && recognitionRef.current) {
      console.log('Restarting recognition with new continuous setting');

      setTimeout(() => {
        if (recognitionRef.current && isListening) {
          // Reinitialize with new settings
          initializeSpeechRecognition(newValue);
          recognitionRef.current.start();
        }
      }, 300);
    }
  };

  const handleViewChange = (view: 'tasks' | 'calendar') => {
    setCurrentView(view);
  };

  return (
    <MainContainer>
      <SideDrawer variant="permanent">
        <Box sx={{ overflow: 'auto', mt: 8 }}>
          <List>
            <ListItem disablePadding>
              <ListItemButton
                onClick={() => handleViewChange('tasks')}
                selected={currentView === 'tasks'}
              >
                <ListItemIcon>
                  <ListAltIcon />
                </ListItemIcon>
                <ListItemText primary="Tarefas" />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton
                onClick={() => handleViewChange('calendar')}
                selected={currentView === 'calendar'}
              >
                <ListItemIcon>
                  <CalendarMonthIcon />
                </ListItemIcon>
                <ListItemText primary="Calendário" />
              </ListItemButton>
            </ListItem>
          </List>
        </Box>
      </SideDrawer>

      <ContentArea>
        {currentView === 'tasks' ? (
          <TaskList ref={taskListRef} />
        ) : (
          <RoutineCalendar ref={routineCalendarRef} />
        )}
      </ContentArea>

      <BottomBar elevation={3}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <MicButton
            color="primary"
            onClick={handleMicButtonClick}
            className={isListening ? 'recording' : ''}
            disabled={!isConnected}
          >
            {isListening ? <MicOffIcon /> : <MicIcon />}
          </MicButton>
          
          <FormControlLabel
            control={
              <Switch
                checked={continuousListening}
                onChange={handleContinuousListeningChange}
                color="primary"
                size="small"
              />
            }
            label="Escuta contínua"
            sx={{ color: 'text.secondary' }}
          />
          
          <MinimizeButton onClick={handleToggleChatVisibility}>
            {isChatMinimized ? <ChatIcon /> : <MinimizeIcon />}
          </MinimizeButton>
        </Box>
      </BottomBar>

      <FloatingChat
        messages={messages}
        onSendMessage={handleSendMessage}
        isMinimized={isChatMinimized}
        onMinimize={handleMinimizeChat}
        onMaximize={handleMaximizeChat}
        isProcessing={isProcessing}
        isTyping={isTyping}
        status={status}
        error={error}
        responseFormat={responseFormat}
        onFormatChange={onFormatChange}
        isConnected={isConnected}
        onReconnect={onReconnect}
        recognizedText={recognizedText}
      />
    </MainContainer>
  );
};

export default MainLayout; 