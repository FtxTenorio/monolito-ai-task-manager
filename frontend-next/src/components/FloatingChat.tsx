import React, { useEffect, useState, useRef } from 'react';
import { Box, IconButton, Typography, Paper, TextField, Button, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import { Minimize, Maximize, Send, Refresh } from '@mui/icons-material';
import { Message } from '@/types';
import { styled } from '@mui/material/styles';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

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
  const [message, setMessage] = useState('');
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    console.log('FloatingChat - isMinimized mudou para:', isMinimized);
  }, [isMinimized]);

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

  // Limpar o texto reconhecido quando a mensagem for enviada
  useEffect(() => {
    if (message === '') {
      // Se a mensagem for limpa, significa que foi enviada
      // Não precisamos fazer nada aqui, pois o texto reconhecido já será limpo
      // quando o usuário enviar a mensagem
    }
  }, [message]);

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
          <IconButton 
            size="small" 
            onClick={isMinimized ? onMaximize : onMinimize} 
            color="inherit"
          >
            {isMinimized ? <Maximize /> : <Minimize />}
          </IconButton>
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