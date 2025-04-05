import React, { useRef, useState } from 'react';
import { Box, Typography, CircularProgress, Fade } from '@mui/material';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import styled from '@emotion/styled';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface Message {
  text: string;
  isUser: boolean;
}

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
}

const ChatContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
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

const MessageBubble = styled.div<{ isUser: boolean }>`
  max-width: 70%;
  margin: 8px;
  padding: 12px;
  border-radius: 12px;
  background-color: ${props => props.isUser ? '#e3f2fd' : '#f5f5f5'};
  align-self: ${props => props.isUser ? 'flex-end' : 'flex-start'};
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
  messages,
  isConnected,
  isProcessing,
  isListening,
  status,
  onToggleListening,
  isTyping,
  typingDots,
  liveText
}) => {
  const chatContainerRef = useRef<HTMLDivElement>(null);

  return (
    <Box className="flex-1 flex flex-col bg-white">
      <ChatContainer ref={chatContainerRef}>
        {messages.map((message, index) => (
          <MessageBubble key={index} isUser={message.isUser}>
            {message.isUser ? (
              <Typography>{message.text}</Typography>
            ) : (
              <MessageContent>
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    code({ className, children }) {
                      const match = /language-(\w+)/.exec(className || '');
                      const language = match ? match[1] : '';
                      return match ? (
                        <CodeBlock>
                          <div className="language-label">{language}</div>
                          <SyntaxHighlighter
                            style={vscDarkPlus as any}
                            language={language}
                            PreTag="div"
                          >
                            {String(children).replace(/\n$/, '')}
                          </SyntaxHighlighter>
                        </CodeBlock>
                      ) : (
                        <code className={className}>
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
          </MessageBubble>
        ))}
        {isTyping && (
          <MessageBubble isUser={false}>
            <Typography>.{typingDots}</Typography>
          </MessageBubble>
        )}
      </ChatContainer>

      {isListening && (
        <LiveTextContainer>
          <Typography variant="body1" color="text.secondary">
            {liveText || 'Falando...'}
          </Typography>
        </LiveTextContainer>
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
    </Box>
  );
};

export default Chat; 