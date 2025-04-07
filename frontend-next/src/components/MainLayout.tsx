import React, { useState, useRef, useEffect } from 'react';
import { Box, Paper, Fab, IconButton, Typography, Tooltip, Switch, FormControlLabel, Drawer, List, ListItem, ListItemIcon, ListItemText, ListItemButton, Divider, AppBar, Toolbar, Button, Avatar, Collapse, Badge } from '@mui/material';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import MinimizeIcon from '@mui/icons-material/Minimize';
import MaximizeIcon from '@mui/icons-material/Maximize';
import ChatIcon from '@mui/icons-material/Chat';
import ListAltIcon from '@mui/icons-material/ListAlt';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import RefreshIcon from '@mui/icons-material/Refresh';
import RecordVoiceOverIcon from '@mui/icons-material/RecordVoiceOver';
import HearingIcon from '@mui/icons-material/Hearing';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { styled } from '@mui/material/styles';
import TaskList from './TaskList';
import RoutineCalendar from './RoutineCalendar';
import FloatingChat from './FloatingChat';
import SpotifyConnect from './SpotifyConnect';
import SpotifyMiniPlayer from './SpotifyMiniPlayer';
import { ThemeToggle } from './ThemeToggle';
import spotifyService from '@/services/spotifyService';
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
    zIndex: theme.zIndex.drawer,
    marginTop: '64px', // AppBar height
  },
}));

const StyledAppBar = styled(AppBar)(({ theme }) => ({
  zIndex: theme.zIndex.drawer + 1,
  backgroundColor: theme.palette.background.paper,
  color: theme.palette.text.primary,
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.12)',
}));

const ContentArea = styled(Box)(({ theme }) => ({
  flex: 1,
  overflow: 'auto',
  marginLeft: DRAWER_WIDTH,
  height: 'calc(100vh - 144px)', // Subtract bottom bar height (80px) and AppBar height (64px)
  marginTop: '64px', // AppBar height
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

const ToggleButton = styled(IconButton)(({ theme }) => ({
  width: 38,
  height: 38,
  backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
  color: theme.palette.text.secondary,
  transition: 'all 0.2s ease',
  '&:hover': {
    backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
  },
  '&.active': {
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
    '&:hover': {
      backgroundColor: theme.palette.primary.dark,
    },
  },
  '& .MuiSvgIcon-root': {
    fontSize: '1.2rem',
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

const UserContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(2),
  marginLeft: 'auto',
  padding: theme.spacing(1),
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
  const [currentView, setCurrentView] = useState<'tasks' | 'calendar' | 'spotify'>('tasks');
  const [integrationsOpen, setIntegrationsOpen] = useState(true);
  const taskListRef = useRef<any>(null);
  const routineCalendarRef = useRef<any>(null);
  const recognitionRef = useRef<any>(null);
  const [isSpotifyConnected, setIsSpotifyConnected] = useState(false);

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

  useEffect(() => {
    const checkSpotifyConnection = async () => {
      try {
        const isConnected = await spotifyService.checkLoginStatus();
        setIsSpotifyConnected(isConnected);
      } catch (error) {
        console.error('Erro ao verificar conexão com Spotify:', error);
        setIsSpotifyConnected(false);
      }
    };

    checkSpotifyConnection();
  }, []);

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

  const handleViewChange = (view: 'tasks' | 'calendar' | 'spotify') => {
    setCurrentView(view);
  };

  const handleIntegrationsToggle = () => {
    setIntegrationsOpen(!integrationsOpen);
  };

  return (
    <MainContainer>
      <StyledAppBar position="fixed">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Monolito AI Task Manager
          </Typography>
          <UserContainer>
            <ThemeToggle />
            {isSpotifyConnected && <SpotifyMiniPlayer />}
            <Avatar sx={{ bgcolor: 'primary.main' }}>U</Avatar>
          </UserContainer>
        </Toolbar>
      </StyledAppBar>

      <SideDrawer variant="permanent">
        <Box sx={{ overflow: 'auto', display: 'flex', flexDirection: 'column', height: '100%' }}>
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
          
          <Divider sx={{ my: 1 }} />
          
          <List>
            <ListItem disablePadding>
              <ListItemButton onClick={handleIntegrationsToggle}>
                <ListItemText primary="Integrações" />
                {integrationsOpen ? <ExpandLess /> : <ExpandMore />}
              </ListItemButton>
            </ListItem>
            <Collapse in={integrationsOpen} timeout="auto" unmountOnExit>
              <List component="div" disablePadding>
                <ListItemButton 
                  sx={{ pl: 4 }} 
                  onClick={() => handleViewChange('spotify')}
                  selected={currentView === 'spotify'}
                >
                  <ListItemIcon>
                    <MusicNoteIcon />
                  </ListItemIcon>
                  <ListItemText primary="Spotify" />
                </ListItemButton>
              </List>
            </Collapse>
          </List>
          
          <Box sx={{ flexGrow: 1 }} />
        </Box>
      </SideDrawer>

      <ContentArea>
        {currentView === 'tasks' ? (
          <TaskList ref={taskListRef} />
        ) : currentView === 'calendar' ? (
          <RoutineCalendar ref={routineCalendarRef} />
        ) : (
          <SpotifyConnect onConnect={() => console.log('Conectando ao Spotify...')} />
        )}
      </ContentArea>

      <BottomBar elevation={3}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Tooltip 
            title={continuousListening ? "Modo de escuta contínua ativado" : "Modo de escuta única ativado"}
            placement="top"
          >
            <ToggleButton
              onClick={() => setContinuousListening(!continuousListening)}
              className={continuousListening ? 'active' : ''}
            >
              {continuousListening ? <RecordVoiceOverIcon /> : <HearingIcon />}
            </ToggleButton>
          </Tooltip>
          
          <MicButton
            color="primary"
            onClick={handleMicButtonClick}
            className={isListening ? 'recording' : ''}
            disabled={!isConnected}
          >
            {isListening ? <MicOffIcon /> : <MicIcon />}
          </MicButton>
          
          {!isConnected && (
            <Tooltip title="Reconectar">
              <IconButton 
                color="primary" 
                onClick={onReconnect}
                sx={{ 
                  backgroundColor: 'rgba(0, 0, 0, 0.05)',
                  '&:hover': {
                    backgroundColor: 'rgba(0, 0, 0, 0.1)',
                  }
                }}
              >
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          )}
          
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