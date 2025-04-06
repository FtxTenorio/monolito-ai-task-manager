import React, { useState, useRef, useEffect } from 'react';
import { Box, Paper, Fab, IconButton, Typography, Tooltip, Switch, FormControlLabel } from '@mui/material';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import MinimizeIcon from '@mui/icons-material/Minimize';
import MaximizeIcon from '@mui/icons-material/Maximize';
import ChatIcon from '@mui/icons-material/Chat';
import { styled } from '@mui/material/styles';
import TaskList from './TaskList';
import RoutineCalendar from './RoutineCalendar';
import FloatingChat from './FloatingChat';
import { Message } from '@/types';

// Styled components
const MainContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  height: '100vh',
  width: '100%',
  overflow: 'hidden',
  position: 'relative',
}));

const ContentArea = styled(Box)(({ theme }) => ({
  flex: 1,
  overflow: 'auto',
  padding: theme.spacing(2),
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: theme.spacing(2),
  [theme.breakpoints.down('md')]: {
    gridTemplateColumns: '1fr',
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
  zIndex: 100,
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
  const taskListRef = useRef<any>(null);
  const routineCalendarRef = useRef<any>(null);
  const recognitionRef = useRef<any>(null);

  // Função para lidar com o envio de mensagem
  const handleSendMessage = (message: string) => {
    onSendMessage(message);
    // Limpar o texto reconhecido após o envio
    setRecognizedText('');
  };

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = continuousListening;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'pt-BR';

      recognitionRef.current.onresult = (event: any) => {
        // Process all results
        for (let i = 0; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          
          if (continuousListening) {
            // Se escuta contínua estiver ativada, envia a mensagem diretamente
            onSendMessage(transcript);
          } else {
            // Se escuta contínua estiver desativada, coloca o texto na caixa de mensagens
            setRecognizedText(transcript);
          }
        }
        
        // Se não estiver em modo contínuo, reinicia o reconhecimento
        if (isListening && !continuousListening) {
          setTimeout(() => {
            if (recognitionRef.current && isListening) {
              recognitionRef.current.start();
            }
          }, 300);
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
        console.log('Recognition ended, continuous:', continuousListening, 'isListening:', isListening);
        // If still listening, restart recognition
        if (isListening) {
          console.log('Restarting recognition after end');
          setTimeout(() => {
            if (recognitionRef.current && isListening) {
              recognitionRef.current.start();
            }
          }, 300);
        }
      };
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
    if (!recognitionRef.current) {
      console.error('Speech recognition not supported');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      // Reinitialize recognition with current settings
      if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
        const SpeechRecognition = window.webkitSpeechRecognition;
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = continuousListening;
        recognitionRef.current.interimResults = false;
        recognitionRef.current.lang = 'pt-BR';

        recognitionRef.current.onresult = (event: any) => {
          // Process all results
          for (let i = 0; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            
            if (continuousListening) {
              // Se escuta contínua estiver ativada, envia a mensagem diretamente
              onSendMessage(transcript);
            } else {
              // Se escuta contínua estiver desativada, coloca o texto na caixa de mensagens
              setRecognizedText(transcript);
            }
          }
          
          // Se não estiver em modo contínuo, reinicia o reconhecimento
          if (isListening && !continuousListening) {
            setTimeout(() => {
              if (recognitionRef.current && isListening) {
                recognitionRef.current.start();
              }
            }, 300);
          }
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
        };

        recognitionRef.current.onend = () => {
          console.log('Recognition ended, continuous:', continuousListening, 'isListening:', isListening);
          // If still listening, restart recognition
          if (isListening) {
            console.log('Restarting recognition after end');
            setTimeout(() => {
              if (recognitionRef.current && isListening) {
                recognitionRef.current.start();
              }
            }, 300);
          }
        };
      }
      
      recognitionRef.current.start();
    }
    
    onToggleListening();
  };

  const handleContinuousListeningChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.checked;
    console.log('Continuous listening changed to:', newValue);
    setContinuousListening(newValue);
    
    // If already listening, restart recognition with new settings
    if (isListening && recognitionRef.current) {
      console.log('Restarting recognition with new continuous setting');
      recognitionRef.current.stop();
      setTimeout(() => {
        if (recognitionRef.current && isListening) {
          // Reinitialize with new settings
          if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
            const SpeechRecognition = window.webkitSpeechRecognition;
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = newValue;
            recognitionRef.current.interimResults = false;
            recognitionRef.current.lang = 'pt-BR';

            recognitionRef.current.onresult = (event: any) => {
              // Process all results
              for (let i = 0; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                
                if (newValue) {
                  // Se escuta contínua estiver ativada, envia a mensagem diretamente
                  onSendMessage(transcript);
                } else {
                  // Se escuta contínua estiver desativada, coloca o texto na caixa de mensagens
                  setRecognizedText(transcript);
                }
              }
              
              // Se não estiver em modo contínuo, reinicia o reconhecimento
              if (isListening && !newValue) {
                setTimeout(() => {
                  if (recognitionRef.current && isListening) {
                    recognitionRef.current.start();
                  }
                }, 300);
              }
            };

            recognitionRef.current.onerror = (event: any) => {
              console.error('Speech recognition error:', event.error);
            };

            recognitionRef.current.onend = () => {
              console.log('Recognition ended, continuous:', newValue, 'isListening:', isListening);
              // If still listening, restart recognition
              if (isListening) {
                console.log('Restarting recognition after end');
                setTimeout(() => {
                  if (recognitionRef.current && isListening) {
                    recognitionRef.current.start();
                  }
                }, 300);
              }
            };
          }
          
          recognitionRef.current.start();
        }
      }, 300);
    }
  };

  return (
    <MainContainer>
      <ContentArea>
        <Box sx={{ overflow: 'auto', height: '100%' }}>
          <TaskList ref={taskListRef} />
        </Box>
        <Box sx={{ overflow: 'auto', height: '100%' }}>
          <RoutineCalendar ref={routineCalendarRef} />
        </Box>
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