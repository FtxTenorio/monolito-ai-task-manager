import React, { useEffect, useState, useRef } from 'react';
import { Box, IconButton, Typography, Paper, TextField, Button, Select, MenuItem, FormControl, InputLabel, Tooltip } from '@mui/material';
import { Minimize, Maximize, Send, Refresh, CloseFullscreen, OpenInFull, Close } from '@mui/icons-material';
import { Message } from '@/types';
import { styled } from '@mui/material/styles';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import CloseIcon from '@mui/icons-material/Close';
import MinimizeIcon from '@mui/icons-material/Minimize';
import MaximizeIcon from '@mui/icons-material/Maximize';

const ChatContainer = styled(Paper, {
  shouldForwardProp: (prop) => prop !== 'isMinimized' && prop !== 'isMaximized'
})<{ isMinimized: boolean; isMaximized: boolean }>(({ theme, isMinimized, isMaximized }) => ({
  position: 'fixed',
  bottom: isMinimized ? 'auto' : '100px',
  right: theme.spacing(2),
  width: isMaximized ? '90vw' : '400px',
  height: isMaximized ? '80vh' : '500px',
  display: 'flex',
  flexDirection: 'column',
  zIndex: 1000,
  transition: 'all 0.3s ease',
  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
  backgroundColor: theme.palette.background.paper,
  ...(isMinimized && {
    transform: 'translateY(100%)',
    opacity: 0,
  }),
  '&.minimized': {
    display: 'none',
  },
  '&.maximized': {
    width: '90vw',
    height: '75vh',
    bottom: '12vh',
    right: '5vw',
    maxWidth: '1400px',
    maxHeight: '800px',
    margin: 'auto',
  },
}));

const HeaderIconButton = styled(IconButton)(({ theme }) => ({
  color: theme.palette.primary.contrastText,
  padding: theme.spacing(0.5),
  '&:hover': {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  '& .MuiSvgIcon-root': {
    fontSize: '1.2rem',
  },
  '.maximized &': {
    padding: theme.spacing(0.75),
    '& .MuiSvgIcon-root': {
      fontSize: '1.4rem',
    },
  },
}));

const ChatHeader = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: theme.spacing(1, 2),
  borderBottom: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.default,
}));

const ChatMessages = styled(Box)(({ theme }) => ({
  flex: 1,
  overflow: 'auto',
  padding: theme.spacing(2),
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(2),
  '.maximized &': {
    padding: theme.spacing(3),
    gap: theme.spacing(3),
  },
}));

const MessageBubble = styled(Paper, {
  shouldForwardProp: (prop) => prop !== 'isUser',
})<{ isUser: boolean }>(({ theme, isUser }) => ({
  padding: theme.spacing(1.5),
  maxWidth: '80%',
  alignSelf: isUser ? 'flex-end' : 'flex-start',
  backgroundColor: isUser ? theme.palette.primary.light : theme.palette.grey[100],
  color: isUser ? theme.palette.primary.contrastText : theme.palette.text.primary,
  '& .maximized &': {
    maxWidth: '60%',
    padding: theme.spacing(2),
  },
}));

const MessageContent = styled(Box)(({ theme }) => ({
  '& p': {
    margin: 0,
  },
  '& pre': {
    margin: theme.spacing(1, 0),
  },
  '& code': {
    backgroundColor: theme.palette.grey[200],
    padding: theme.spacing(0.5),
    borderRadius: theme.shape.borderRadius,
    fontFamily: 'monospace',
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
    fontSize: '0.75rem',
    backgroundColor: theme.palette.grey[800],
    color: theme.palette.grey[300],
    borderBottomLeftRadius: theme.shape.borderRadius,
  },
}));

const ChatInput = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  borderTop: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.default,
}));

const HeaderButtons = styled(Box)(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(1),
  alignItems: 'center',
}));

const HeaderButton = styled(IconButton)(({ theme }) => ({
  color: theme.palette.text.secondary,
  padding: theme.spacing(0.5),
  '&:hover': {
    color: theme.palette.text.primary,
    backgroundColor: theme.palette.action.hover,
  },
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
  recognizedText?: string;
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
  recognizedText,
}) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [message, setMessage] = useState('');
  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  useEffect(() => {
    if (recognizedText) {
      setMessage(recognizedText);
    }
  }, [recognizedText]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      onSendMessage(message);
      setMessage('');
    }
  };

  const handleMaximizeToggle = () => {
    setIsMaximized(!isMaximized);
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSubmit(event as any);
    }
  };

  return (
    <ChatContainer 
      isMinimized={isMinimized}
      isMaximized={isMaximized}
      className={`${isMinimized ? 'minimized' : ''} ${isMaximized ? 'maximized' : ''}`}
    >
      <ChatHeader>
        <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>Chat</Typography>
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 0.5,
          '& > button': {
            transition: 'all 0.2s ease',
          }
        }}>
          {!isConnected && (
            <Tooltip title="Reconectar">
              <HeaderIconButton size="small" onClick={onReconnect}>
                <Refresh />
              </HeaderIconButton>
            </Tooltip>
          )}
          <Tooltip title={isMaximized ? "Restaurar" : "Maximizar"}>
            <HeaderIconButton
              size="small" 
              onClick={handleMaximizeToggle}
            >
              {isMaximized ? <CloseFullscreen /> : <OpenInFull />}
            </HeaderIconButton>
          </Tooltip>
          <Tooltip title={isMinimized ? "Restaurar" : "Fechar"}>
            <HeaderIconButton
              size="small" 
              onClick={isMinimized ? onMaximize : onMinimize}
            >
              {isMinimized ? <Maximize /> : <Close />}
            </HeaderIconButton>
          </Tooltip>
        </Box>
      </ChatHeader>

      {!isMinimized && (
        <>
          <ChatMessages>
            {messages.map((msg, index) => (
              <MessageBubble key={index} isUser={msg.isUser}>
                {msg.isUser ? (
                  <Typography variant="body2">{msg.text}</Typography>
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
                      {msg.text}
                    </ReactMarkdown>
                  </MessageContent>
                )}
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
            <div ref={messagesEndRef} />
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
            <form onSubmit={handleSubmit} style={{ flex: 1, display: 'flex', gap: 8 }}>
              <TextField
                fullWidth
                size={isMaximized ? "medium" : "small"}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Digite sua mensagem..."
                disabled={isProcessing}
              />
              <Button
                type="submit"
                variant="contained"
                color="primary"
                disabled={isProcessing || !message.trim()}
                size={isMaximized ? "large" : "medium"}
              >
                Enviar
              </Button>
            </form>
          </ChatInput>
        </>
      )}
    </ChatContainer>
  );
};

export default FloatingChat; 