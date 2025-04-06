import React, { useRef, useState, useEffect } from 'react';
import { Box, Typography, CircularProgress, Fade, IconButton, Tooltip, Menu, MenuItem, Divider, Fab, Dialog, DialogTitle, DialogContent, IconButton as MuiIconButton, Button } from '@mui/material';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import RefreshIcon from '@mui/icons-material/Refresh';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import CheckIcon from '@mui/icons-material/Check';
import ListAltIcon from '@mui/icons-material/ListAlt';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import styled from '@emotion/styled';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Message } from '@/types';
import RoutineCalendar, { Routine, RoutineCalendarRef } from './RoutineCalendar';
import TaskList, { TaskListRef } from './TaskList';
import RoutineList, { RoutineListRef } from './RoutineList';

interface ChatProps {
  messages: Message[];
  isConnected: boolean;
  isProcessing: boolean;
  isListening: boolean;
  status: string;
  onToggleListening: () => void;
  isTyping?: boolean;
  typingDots?: string;
  liveText?: string;
  onRetryMessage?: (messageIndex: number) => void;
}

const ChatContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
`;

const MicButton = styled.button<{ isRecording?: boolean }>`
  background: ${props => props.isRecording ? '#ff4444' : '#4CAF50'};
  color: white;
  border: none;
  border-radius: 50%;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;

  &:disabled {
    background: #ccc;
    cursor: not-allowed;
  }

  &:hover:not(:disabled) {
    transform: scale(1.1);
  }
`;

const MessageActions = styled(Box)`
  display: flex;
  justify-content: flex-end;
  margin-top: 8px;
  opacity: 0.7;
  transition: opacity 0.2s;
  
  &:hover {
    opacity: 1;
  }
`;

const MessageBubble = styled.div<{ isUser: boolean }>`
  max-width: 70%;
  margin: 8px;
  padding: 12px;
  border-radius: 12px;
  background-color: ${props => props.isUser ? '#e3f2fd' : '#f5f5f5'};
  align-self: ${props => props.isUser ? 'flex-end' : 'flex-start'};
  width: 100%;
  box-sizing: border-box;
  position: relative;
`;

const MessageContent = styled.div`
  pre {
    margin: 0;
    padding: 1rem;
    background: #1e1e1e;
    border-radius: 4px;
    overflow-x: auto;
  }

  code {
    font-family: 'Fira Code', monospace;
  }
`;

const CodeBlock = styled.div`
  position: relative;
  margin: 1rem 0;

  .language-label {
    position: absolute;
    top: 0;
    right: 0;
    padding: 0.25rem 0.5rem;
    background: #333;
    color: #fff;
    font-size: 0.75rem;
    border-radius: 0 4px 0 4px;
  }
`;

const LiveTextContainer = styled(Box)`
  position: fixed;
  bottom: 100px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 1rem;
  border-radius: 8px;
  max-width: 80%;
  text-align: center;
`;

const Chat: React.FC<ChatProps> = ({
  messages: propMessages,
  isConnected,
  isProcessing,
  isListening,
  status,
  onToggleListening,
  isTyping,
  typingDots,
  liveText,
  onRetryMessage
}) => {
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const routineCalendarRef = useRef<RoutineCalendarRef>(null);
  const taskListRef = useRef<TaskListRef>(null);
  const routineListRef = useRef<RoutineListRef>(null);
  const [localMessages, setLocalMessages] = useState<Message[]>(propMessages);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedMessageIndex, setSelectedMessageIndex] = useState<number | null>(null);
  const [showRoutineCalendar, setShowRoutineCalendar] = useState(true);
  const [isTaskListExpanded, setIsTaskListExpanded] = useState(false);
  const [isRoutineListExpanded, setIsRoutineListExpanded] = useState(false);
  
  // Efeito para sincronizar as mensagens locais com as props
  useEffect(() => {
    setLocalMessages(propMessages);
  }, [propMessages]);
  
  // Efeito para rolar para baixo quando novas mensagens chegarem
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [localMessages]);

  const handleCopyClick = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };
  
  const handleMoreOptionsClick = (event: React.MouseEvent<HTMLElement>, index: number) => {
    setAnchorEl(event.currentTarget);
    setSelectedMessageIndex(index);
  };
  
  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedMessageIndex(null);
  };
  
  const handleRetryMessage = () => {
    if (selectedMessageIndex !== null && onRetryMessage) {
      onRetryMessage(selectedMessageIndex);
    }
    handleMenuClose();
  };
  
  const handleSpeakMessage = () => {
    if (selectedMessageIndex !== null) {
      const message = localMessages[selectedMessageIndex];
      if (message && !message.isUser) {
        const utterance = new SpeechSynthesisUtterance(message.text);
        utterance.lang = 'pt-BR';
        window.speechSynthesis.speak(utterance);
      }
    }
    handleMenuClose();
  };

  const handleRoutineSelect = (routine: Routine) => {
    // Aqui você pode adicionar lógica para lidar com a seleção de uma rotina
    console.log('Selected routine:', routine);
  };

  const handleShowRoutineCalendar = () => {
    setShowRoutineCalendar(true);
    // Pequeno delay para garantir que o componente está montado
    setTimeout(() => {
      routineCalendarRef.current?.fetchRoutines();
      routineCalendarRef.current?.setVisible(true);
    }, 100);
  };

  const handleRoutineCalendarClose = () => {
    setShowRoutineCalendar(false);
  };

  const handleTaskListOpen = () => {
    setIsTaskListExpanded(true);
  };

  const handleRoutineListOpen = () => {
    setIsRoutineListExpanded(true);
    setTimeout(() => {
      routineListRef.current?.refresh();
    }, 100);
  };

  // Renderizar mensagens
  const renderMessages = () => {
    return localMessages.map((message, index) => (
      <MessageBubble key={index} isUser={message.isUser}>
        {message.isUser ? (
          <Typography>{message.text}</Typography>
        ) : (
          <MessageContent>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                code({ className, children, ...props }: any) {
                  const match = /language-(\w+)/.exec(className || '');
                  const isInline = !match;
                  return !isInline && match ? (
                    <CodeBlock>
                      <div className="language-label">{match[1]}</div>
                      <SyntaxHighlighter
                        language={match[1]}
                        style={vscDarkPlus as any}
                        PreTag="div"
                        {...props}
                      >
                        {String(children).replace(/\n$/, '')}
                      </SyntaxHighlighter>
                    </CodeBlock>
                  ) : (
                    <code className={className} {...props}>
                      {children}
                    </code>
                  );
                },
              }}
            >
              {message.text}
            </ReactMarkdown>
          </MessageContent>
        )}
        
        <MessageActions>
          <Tooltip title="Copiar mensagem">
            <IconButton 
              size="small" 
              onClick={() => handleCopyClick(message.text, index)}
              sx={{ mr: 1 }}
            >
              {copiedIndex === index ? <CheckIcon fontSize="small" /> : <ContentCopyIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
          
          {!message.isUser && onRetryMessage && (
            <Tooltip title="Tentar novamente">
              <IconButton 
                size="small" 
                onClick={() => onRetryMessage(index)}
                sx={{ mr: 1 }}
              >
                <RefreshIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          
          <Tooltip title="Mais opções">
            <IconButton 
              size="small" 
              onClick={(e) => handleMoreOptionsClick(e, index)}
            >
              <MoreVertIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </MessageActions>
      </MessageBubble>
    ));
  };

  return (
    <Box sx={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <ChatContainer ref={chatContainerRef}>
        {localMessages && localMessages.length > 0 ? (
          renderMessages()
        ) : (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 2 }}>
            Nenhuma mensagem ainda. Clique no microfone para começar.
          </Typography>
        )}
        {isTyping && (
          <Box sx={{ 
            maxWidth: '70%', 
            margin: '8px', 
            padding: '12px', 
            borderRadius: '12px', 
            backgroundColor: '#f5f5f5', 
            alignSelf: 'flex-start', 
            width: '100%', 
            boxSizing: 'border-box' 
          }}>
            <Typography>.{typingDots}</Typography>
          </Box>
        )}
        {liveText && (
          <LiveTextContainer>
            <Typography>{liveText}</Typography>
          </LiveTextContainer>
        )}
      </ChatContainer>

      {showRoutineCalendar && (
        <RoutineCalendar
          ref={routineCalendarRef}
          onRoutineSelect={handleRoutineSelect}
          onClose={handleRoutineCalendarClose}
        />
      )}

      <Box className="p-4 border-t border-gray-200">
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
            onClick={onToggleListening}
            isRecording={isListening}
            disabled={!isConnected}
          >
            {isListening ? <MicOffIcon fontSize="large" /> : <MicIcon fontSize="large" />}
          </MicButton>
        </Box>
      </Box>
      
      {/* Botões de atalho para tarefas e rotinas */}
      <Box sx={{ position: 'fixed', bottom: 24, right: 24, display: 'flex', gap: 2 }}>
        {!showRoutineCalendar && (
          <Tooltip title="Ver rotinas">
            <Fab 
              color="primary" 
              onClick={handleShowRoutineCalendar}
              sx={{ bgcolor: 'primary.main' }}
            >
              <CalendarMonthIcon />
            </Fab>
          </Tooltip>
        )}
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
            <MuiIconButton 
              onClick={() => setIsTaskListExpanded(false)}
              color="primary"
              size="small"
            >
              <FullscreenExitIcon />
            </MuiIconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <TaskList ref={taskListRef} />
        </DialogContent>
      </Dialog>
      
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleRetryMessage}>
          <RefreshIcon fontSize="small" sx={{ mr: 1 }} />
          Tentar novamente
        </MenuItem>
        <MenuItem onClick={handleSpeakMessage}>
          <MicIcon fontSize="small" sx={{ mr: 1 }} />
          Ouvir mensagem
        </MenuItem>
      </Menu>

      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
          {/* ... existing code ... */}
        </Box>
        <Box sx={{ width: 300, overflow: 'auto', p: 2 }}>
          {isTaskListExpanded ? (
            <TaskList ref={taskListRef} />
          ) : (
            <Button
              fullWidth
              variant="outlined"
              onClick={handleTaskListOpen}
              sx={{ mb: 2 }}
            >
              Mostrar Lista de Tarefas
            </Button>
          )}
          {isRoutineListExpanded ? (
            <RoutineList ref={routineListRef} />
          ) : (
            <Button
              fullWidth
              variant="outlined"
              onClick={handleRoutineListOpen}
              sx={{ mb: 2 }}
            >
              Mostrar Lista de Rotinas
            </Button>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default Chat; 