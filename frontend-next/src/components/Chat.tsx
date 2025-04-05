import React from 'react';
import { Box, Typography, Paper, IconButton, CircularProgress, Theme } from '@mui/material';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import { styled } from '@mui/material/styles';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

// Componentes estilizados
const ChatContainer = styled(Box)(({ theme }: { theme: Theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(2),
  maxHeight: '60vh',
  overflowY: 'auto',
  padding: theme.spacing(2),
  marginBottom: theme.spacing(2),
  scrollBehavior: 'smooth',
}));

const MessageBubble = styled(Paper)<{ isUser: boolean }>(({ theme, isUser }: { theme: Theme; isUser: boolean }) => ({
  padding: theme.spacing(2),
  maxWidth: '80%',
  alignSelf: isUser ? 'flex-end' : 'flex-start',
  backgroundColor: isUser ? theme.palette.primary.light : theme.palette.grey[100],
  color: isUser ? theme.palette.primary.contrastText : theme.palette.text.primary,
}));

const ThinkingContainer = styled(Paper)(({ theme }: { theme: Theme }) => ({
  padding: theme.spacing(2),
  marginTop: theme.spacing(2),
  backgroundColor: theme.palette.grey[50],
  border: `1px dashed ${theme.palette.primary.main}`,
}));

const ThinkingStep = styled(Box)(({ theme }: { theme: Theme }) => ({
  display: 'flex',
  alignItems: 'flex-start',
  gap: theme.spacing(1),
  marginBottom: theme.spacing(1),
  '&:last-child': {
    marginBottom: 0,
  },
}));

const ThinkingIcon = styled(Box)(({ theme }: { theme: Theme }) => ({
  width: 24,
  height: 24,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: theme.palette.primary.main,
}));

const MessageContent = styled(Box)(({ theme }: { theme: Theme }) => ({
  '& p': {
    margin: theme.spacing(1, 0),
  },
  '& h1, & h2, & h3, & h4, & h5, & h6': {
    margin: theme.spacing(2, 0, 1),
    color: theme.palette.text.primary,
    fontWeight: 500,
    lineHeight: 1.2,
  },
  '& h1': {
    fontSize: '1.5rem',
  },
  '& h2': {
    fontSize: '1.25rem',
  },
  '& h3': {
    fontSize: '1.1rem',
  },
  '& pre': {
    margin: 0,
    padding: 0,
    backgroundColor: 'transparent',
  },
  '& code': {
    backgroundColor: 'transparent',
    padding: theme.spacing(0.5),
    borderRadius: theme.shape.borderRadius,
    fontFamily: 'monospace',
    fontSize: '0.9em',
    color: theme.palette.primary.main,
  },
  '& ul, & ol': {
    margin: theme.spacing(1, 0),
    paddingLeft: theme.spacing(3),
    '& li': {
      margin: theme.spacing(0.5, 0),
    },
  },
  '& blockquote': {
    borderLeft: `4px solid ${theme.palette.primary.main}`,
    margin: theme.spacing(1, 0),
    paddingLeft: theme.spacing(1),
    color: theme.palette.text.secondary,
  },
  '& table': {
    borderCollapse: 'collapse',
    width: '100%',
    margin: theme.spacing(1, 0),
  },
  '& th, & td': {
    border: `1px solid ${theme.palette.divider}`,
    padding: theme.spacing(0.5),
    textAlign: 'left',
  },
  '& th': {
    backgroundColor: theme.palette.grey[100],
  },
  '& a': {
    color: theme.palette.primary.main,
    textDecoration: 'none',
    '&:hover': {
      textDecoration: 'underline',
    },
  },
  '& img': {
    maxWidth: '100%',
    height: 'auto',
    borderRadius: theme.shape.borderRadius,
    margin: theme.spacing(1, 0),
  },
}));

// Interface para mensagens
interface Message {
  text: string;
  isUser: boolean;
}

// Interface para atualizações de pensamento
interface ThinkingUpdate {
  type: string;
  update_type: string;
  content: string;
}

interface ChatProps {
  messages: Message[];
  isConnected: boolean;
  isProcessing: boolean;
  isListening: boolean;
  status: string;
  onToggleListening: () => void;
  isTyping: boolean;
  typingDots: string;
  liveText: string;
  thinkingUpdates: ThinkingUpdate[];
}

const Chat: React.FC<ChatProps> = ({
  messages,
  isConnected,
  isProcessing,
  isListening,
  status,
  onToggleListening,
  isTyping,
  typingDots,
  liveText,
  thinkingUpdates,
}) => {
  const chatContainerRef = React.useRef<HTMLDivElement>(null);

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <ChatContainer ref={chatContainerRef}>
        {messages.map((message, index) => (
          <MessageBubble key={index} isUser={message.isUser}>
            <MessageContent>
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code({ className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || '');
                    return match ? (
                      <SyntaxHighlighter
                        style={vscDarkPlus as any}
                        language={match[1]}
                        PreTag="div"
                        {...props}
                      >
                        {String(children).replace(/\n$/, '')}
                      </SyntaxHighlighter>
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
          </MessageBubble>
        ))}

        {/* Container de pensamento */}
        {thinkingUpdates.length > 0 && (
          <ThinkingContainer>
            <Typography variant="subtitle2" color="primary" gutterBottom>
              Processo de Pensamento
            </Typography>
            {thinkingUpdates.map((update, index) => (
              <ThinkingStep key={index}>
                <ThinkingIcon>
                  {update.update_type === 'start' && '🔄'}
                  {update.update_type === 'tool_start' && '🔧'}
                  {update.update_type === 'tool_end' && '✅'}
                  {update.update_type === 'chain_start' && '⛓️'}
                  {update.update_type === 'chain_end' && '✨'}
                  {update.update_type === 'complete' && '🎉'}
                  {update.update_type === 'error' && '❌'}
                </ThinkingIcon>
                <Typography variant="body2">{update.content}</Typography>
              </ThinkingStep>
            ))}
          </ThinkingContainer>
        )}

        {/* Indicador de digitação */}
        {isTyping && (
          <MessageBubble isUser={false}>
            <Typography>
              Digitando{typingDots}
            </Typography>
          </MessageBubble>
        )}

        {/* Texto em tempo real */}
        {liveText && (
          <MessageBubble isUser={true}>
            <Typography>{liveText}</Typography>
          </MessageBubble>
        )}
      </ChatContainer>

      {/* Status e controles */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2 }}>
        <Typography variant="body2" color="text.secondary">
          {status}
        </Typography>
        <IconButton
          onClick={onToggleListening}
          color={isListening ? 'secondary' : 'primary'}
          disabled={!isConnected}
        >
          {isListening ? <MicOffIcon /> : <MicIcon />}
        </IconButton>
        {isProcessing && <CircularProgress size={24} />}
      </Box>
    </Box>
  );
};

export default Chat; 