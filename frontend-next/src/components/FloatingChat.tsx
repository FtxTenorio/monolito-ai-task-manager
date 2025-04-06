import React from 'react';
import { Box, IconButton, Typography, Paper, TextField, Button, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import { Minimize, Maximize, Send, Refresh } from '@mui/icons-material';
import { Message } from '@/types';
import { styled } from '@mui/material/styles';

const ChatContainer = styled(Paper)(({ theme }) => ({
  position: 'fixed',
  bottom: 100,
  right: 16,
  width: 400,
  height: 500,
  display: 'flex',
  flexDirection: 'column',
  zIndex: 1000,
  transition: 'all 0.3s ease',
  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
  '&.minimized': {
    display: 'none',
  },
}));

const ChatHeader = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: theme.spacing(1),
  borderBottom: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
}));

const ChatMessages = styled(Box)(({ theme }) => ({
  flex: 1,
  overflow: 'auto',
  padding: theme.spacing(2),
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(2),
}));

const MessageBubble = styled(Paper)<{ isUser: boolean }>(({ theme, isUser }) => ({
  padding: theme.spacing(1),
  maxWidth: '80%',
  alignSelf: isUser ? 'flex-end' : 'flex-start',
  backgroundColor: isUser ? theme.palette.primary.light : theme.palette.grey[100],
  color: isUser ? theme.palette.primary.contrastText : theme.palette.text.primary,
}));

const ChatInput = styled(Box)(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(1),
  padding: theme.spacing(1),
  borderTop: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.paper,
}));

interface FloatingChatProps {
  messages: Message[];
  onSendMessage: (message: string) => void;
  isMinimized: boolean;
  onMinimize: () => void;
  onMaximize: () => void;
  isProcessing: boolean;
  isTyping: boolean;
  status: string;
  error: string | null;
  responseFormat: string;
  onFormatChange: (format: string) => void;
  isConnected: boolean;
  onReconnect: () => void;
}

const FloatingChat: React.FC<FloatingChatProps> = ({
  messages,
  onSendMessage,
  isMinimized,
  onMinimize,
  onMaximize,
  isProcessing,
  isTyping,
  status,
  error,
  responseFormat,
  onFormatChange,
  isConnected,
  onReconnect,
}) => {
  const [message, setMessage] = React.useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      onSendMessage(message);
      setMessage('');
    }
  };

  console.log('FloatingChat renderizado, isMinimized:', isMinimized);

  return (
    <ChatContainer className={isMinimized ? 'minimized' : ''}>
      <ChatHeader>
        <Typography variant="subtitle1">Chat</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {!isConnected && (
            <IconButton size="small" onClick={onReconnect} color="inherit">
              <Refresh />
            </IconButton>
          )}
          <IconButton size="small" onClick={isMinimized ? onMaximize : onMinimize} color="inherit">
            {isMinimized ? <Maximize /> : <Minimize />}
          </IconButton>
        </Box>
      </ChatHeader>

      {!isMinimized && (
        <>
          <ChatMessages>
            {messages.map((msg, index) => (
              <MessageBubble key={index} isUser={msg.isUser}>
                <Typography variant="body2">{msg.text}</Typography>
              </MessageBubble>
            ))}
            {isTyping && (
              <Box sx={{ alignSelf: 'flex-start' }}>
                <Typography variant="body2" color="text.secondary">
                  Digitando...
                </Typography>
              </Box>
            )}
            {error && (
              <Box sx={{ alignSelf: 'flex-start' }}>
                <Typography variant="body2" color="error">
                  {error}
                </Typography>
              </Box>
            )}
            {status && (
              <Box sx={{ alignSelf: 'flex-start' }}>
                <Typography variant="body2" color="text.secondary">
                  {status}
                </Typography>
              </Box>
            )}
          </ChatMessages>

          <ChatInput>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <Select
                value={responseFormat}
                onChange={(e) => onFormatChange(e.target.value)}
                size="small"
              >
                <MenuItem value="text">Texto</MenuItem>
                <MenuItem value="markdown">Markdown</MenuItem>
                <MenuItem value="code">Código</MenuItem>
              </Select>
            </FormControl>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flex: 1, gap: 8 }}>
              <TextField
                fullWidth
                size="small"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Digite sua mensagem..."
                disabled={isProcessing}
              />
              <Button
                type="submit"
                variant="contained"
                color="primary"
                disabled={isProcessing || !message.trim()}
              >
                <Send />
              </Button>
            </form>
          </ChatInput>
        </>
      )}
    </ChatContainer>
  );
};

export default FloatingChat; 