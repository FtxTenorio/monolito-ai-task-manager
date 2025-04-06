import React, { useState, useRef } from 'react';
import { Box, Paper, Fab, IconButton, Typography, Tooltip } from '@mui/material';
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
  const taskListRef = useRef<any>(null);
  const routineCalendarRef = useRef<any>(null);

  const handleMinimizeChat = () => {
    setIsChatMinimized(true);
  };

  const handleMaximizeChat = () => {
    setIsChatMinimized(false);
  };

  const handleToggleChatVisibility = () => {
    setIsChatVisible(!isChatVisible);
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
            onClick={onToggleListening}
            className={isListening ? 'recording' : ''}
            disabled={!isConnected}
          >
            {isListening ? <MicOffIcon /> : <MicIcon />}
          </MicButton>
          
          <MinimizeButton onClick={handleToggleChatVisibility}>
            {isChatVisible ? <MinimizeIcon /> : <ChatIcon />}
          </MinimizeButton>
        </Box>
      </BottomBar>

      {isChatVisible && (
        <FloatingChat
          messages={messages}
          onSendMessage={onSendMessage}
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
        />
      )}
    </MainContainer>
  );
};

export default MainLayout; 