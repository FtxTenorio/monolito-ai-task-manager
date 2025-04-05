import React, { useRef, useState, useEffect } from 'react';
import { Box, Typography, CircularProgress, Fade, Dialog, DialogTitle, DialogContent, DialogActions, Button, Badge, IconButton, Collapse, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import InfoIcon from '@mui/icons-material/Info';
import NotificationsIcon from '@mui/icons-material/Notifications';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import styled from '@emotion/styled';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface Message {
  text: string;
  isUser: boolean;
}

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
  isTyping?: boolean;
  typingDots?: string;
  liveText?: string;
  thinkingUpdates: ThinkingUpdate[];
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

const MessageBubble = styled.div<{ isUser: boolean }>`
  max-width: 70%;
  margin: 8px;
  padding: 12px;
  border-radius: 12px;
  background-color: ${props => props.isUser ? '#e3f2fd' : '#f5f5f5'};
  align-self: ${props => props.isUser ? 'flex-end' : 'flex-start'};
  width: 100%;
  box-sizing: border-box;
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

const ThinkingContainer = styled(Box)`
  margin-top: 1rem;
  padding: 1rem;
  border-radius: 8px;
  background-color: #f5f5f5;
  max-height: 200px;
  overflow-y: auto;
`;

const ActiveToolIndicator = styled(Box)`
  display: flex;
  align-items: center;
  padding: 0.15rem;
  margin-bottom: 0.15rem;
  background-color: rgba(33, 150, 243, 0.1);
  border-radius: 4px;
  border-left: 3px solid #2196f3;
`;

const ActiveToolPulseIndicator = styled(Box)`
  position: absolute;
  top: -8px;
  right: -8px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background-color: #2196f3;
  box-shadow: 0 0 0 2px #fff;
  animation: pulse 2s infinite;
  
  @keyframes pulse {
    0% {
      box-shadow: 0 0 0 0 rgba(33, 150, 243, 0.4);
    }
    70% {
      box-shadow: 0 0 0 6px rgba(33, 150, 243, 0);
    }
    100% {
      box-shadow: 0 0 0 0 rgba(33, 150, 243, 0);
    }
  }
`;

const ActiveToolIcon = styled(Box)`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background-color: #2196f3;
  color: white;
  margin-right: 0.25rem;
  font-size: 0.75rem;
`;

const ActiveToolContent = styled(Box)`
  flex: 1;
`;

const ActiveToolName = styled(Typography)`
  font-weight: 600;
  color: #2196f3;
  font-size: 0.75rem;
`;

const ActiveToolDescription = styled(Typography)`
  font-size: 0.7rem;
  color: #666;
`;

const ToolLoadingIcon = styled(Box)`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  margin-right: 0.5rem;
  animation: spin 1s linear infinite;
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const ThinkingStep = styled(Box)`
  display: flex;
  align-items: flex-start;
  margin-bottom: 0.15rem;
  padding: 0.15rem;
  border-radius: 4px;
  background-color: rgba(33, 150, 243, 0.05);
`;

const ThinkingIcon = styled.div`
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 0.25rem;
  color: #2196f3;
  font-size: 0.75rem;
`;

const ThinkingContent = styled(Box)`
  flex: 1;
`;

const ToolInfo = styled(Box)`
  margin-top: 0.15rem;
  font-size: 0.7rem;
  color: #666;
  white-space: pre-line;
`;

const ToolResultContainer = styled(Box)`
  margin-top: 0.15rem;
  padding: 0.15rem;
  background-color: rgba(76, 175, 80, 0.1);
  border-radius: 4px;
  border-left: 3px solid #4caf50;
`;

const ToolResultHeader = styled(Box)`
  display: flex;
  align-items: center;
  margin-bottom: 0.15rem;
`;

const ToolResultIcon = styled(Box)`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background-color: #4caf50;
  color: white;
  margin-right: 0.25rem;
  font-size: 0.75rem;
`;

const ToolResultContent = styled(Box)`
  font-size: 0.7rem;
  color: #333;
  white-space: pre-line;
  max-height: 80px;
  overflow-y: auto;
`;

const ToolProgressIndicator = styled(Box)`
  display: flex;
  align-items: center;
  margin-top: 0.5rem;
`;

const ToolProgressBar = styled(Box)`
  height: 4px;
  background-color: #e0e0e0;
  border-radius: 2px;
  overflow: hidden;
  flex: 1;
  margin-right: 0.5rem;
`;

const ToolProgressFill = styled(Box)<{ progress: number }>`
  height: 100%;
  width: ${props => props.progress}%;
  background-color: #2196f3;
  border-radius: 2px;
  transition: width 0.3s ease;
`;

const ToolProgressText = styled(Typography)`
  font-size: 0.7rem;
  color: #666;
  min-width: 40px;
  text-align: right;
`;

const ToolsSummaryContainer = styled(Box)`
  margin-top: 1rem;
  padding: 0.75rem;
  background-color: #f0f7ff;
  border-radius: 4px;
  border: 1px solid #bbdefb;
`;

const ToolsSummaryHeader = styled(Box)`
  display: flex;
  align-items: center;
  margin-bottom: 0.5rem;
`;

const ToolsSummaryIcon = styled(Box)`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background-color: #bbdefb;
  color: #1976d2;
  margin-right: 0.5rem;
`;

const ToolsSummaryList = styled(Box)`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
`;

const ToolSummaryItem = styled(Box)`
  display: flex;
  align-items: center;
  padding: 0.25rem 0.5rem;
  background-color: #e3f2fd;
  border-radius: 16px;
  font-size: 0.75rem;
  color: #1976d2;
`;

const ProcessingSummaryContainer = styled(Box)`
  margin-top: 1rem;
  padding: 0.75rem;
  background-color: #f5f5f5;
  border-radius: 4px;
  border: 1px solid #e0e0e0;
`;

const ProcessingSummaryHeader = styled(Box)`
  display: flex;
  align-items: center;
  margin-bottom: 0.5rem;
`;

const ProcessingSummaryIcon = styled(Box)`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background-color: #e0e0e0;
  color: #757575;
  margin-right: 0.5rem;
`;

const ProcessingSummaryDetails = styled(Box)`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const ProcessingSummaryItem = styled(Box)`
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
  color: #757575;
`;

const ProcessingSummaryButton = styled(Button)`
  margin-top: 1rem;
  background-color: #f0f7ff;
  color: #1976d2;
  border: 1px solid #bbdefb;
  padding: 8px 16px;
  border-radius: 20px;
  font-weight: 500;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  transition: all 0.2s ease;

  &:hover {
    background-color: #e3f2fd;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    transform: translateY(-1px);
  }

  .MuiButton-startIcon {
    margin-right: 8px;
    color: #1976d2;
  }
`;

const SummarySection = styled(Box)`
  margin-bottom: 1.5rem;
  padding: 1rem;
  border-radius: 8px;
  background-color: #f9f9f9;
`;

const SummarySectionTitle = styled(Typography)`
  display: flex;
  align-items: center;
  margin-bottom: 0.75rem;
  color: #1976d2;
  font-weight: 600;
`;

const SummarySectionIcon = styled(Box)`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background-color: #bbdefb;
  color: #1976d2;
  margin-right: 0.5rem;
`;

const SummaryItem = styled(Box)`
  display: flex;
  justify-content: space-between;
  padding: 0.5rem 0;
  border-bottom: 1px solid #e0e0e0;
  
  &:last-child {
    border-bottom: none;
  }
`;

const SummaryItemLabel = styled(Typography)`
  color: #757575;
`;

const SummaryItemValue = styled(Typography)`
  font-weight: 600;
  color: #333;
`;

const ToolList = styled(Box)`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.5rem;
`;

const ToolItem = styled(Box)`
  display: flex;
  align-items: center;
  padding: 0.5rem 0.75rem;
  background-color: #e3f2fd;
  border-radius: 16px;
  font-size: 0.8rem;
  color: #1976d2;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
`;

const FeedbackAccordion = styled(Accordion)`
  margin: 0.25rem 0;
  border-radius: 6px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  background-color: #f5f5f5;
  border: 1px solid #e0e0e0;
  transition: all 0.3s ease;
  position: relative;
  width: 80%;
  box-sizing: border-box;
  align-self: flex-start;
  
  &:before {
    display: none;
  }
  
  &.Mui-expanded {
    margin: 0.25rem 0;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
  
  &.active-tool {
    border-left: 3px solid #2196f3;
    background-color: #e3f2fd;
  }
`;

const FeedbackAccordionSummary = styled(AccordionSummary)`
  background-color: #f0f7ff;
  border-radius: 6px 6px 0 0;
  padding: 0.15rem 0.5rem;
  transition: all 0.3s ease;
  min-height: 32px;
  
  .MuiAccordionSummary-content {
    margin: 0.15rem 0;
  }
  
  .MuiAccordionSummary-expandIconWrapper {
    color: #1976d2;
    transition: transform 0.3s ease;
    font-size: 1rem;
  }
  
  &.Mui-expanded {
    background-color: #e3f2fd;
    
    .MuiAccordionSummary-expandIconWrapper {
      transform: rotate(180deg);
    }
  }
  
  &.active-tool-summary {
    background-color: #e3f2fd;
  }
`;

const FeedbackAccordionDetails = styled(AccordionDetails)`
  padding: 0.25rem 0.5rem;
  background-color: #f9f9f9;
  max-height: 150px;
  overflow-y: auto;
  transition: all 0.3s ease;
`;

const FeedbackHeader = styled(Box)`
  display: flex;
  align-items: center;
  gap: 0.25rem;
`;

const FeedbackIcon = styled(Box)`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background-color: #bbdefb;
  color: #1976d2;
  animation: pulse 2s infinite;
  
  @keyframes pulse {
    0% {
      box-shadow: 0 0 0 0 rgba(25, 118, 210, 0.4);
    }
    70% {
      box-shadow: 0 0 0 4px rgba(25, 118, 210, 0);
    }
    100% {
      box-shadow: 0 0 0 0 rgba(25, 118, 210, 0);
    }
  }
`;

const FeedbackTitle = styled(Typography)`
  font-weight: 600;
  color: #1976d2;
  font-size: 0.75rem;
`;

const FeedbackCount = styled(Badge)`
  margin-left: auto;
  
  .MuiBadge-badge {
    font-size: 0.65rem;
    height: 16px;
    min-width: 16px;
    padding: 0 4px;
    border-radius: 8px;
  }
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
  liveText,
  thinkingUpdates,
}) => {
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [toolProgress, setToolProgress] = useState(0);
  const [processingStartTime, setProcessingStartTime] = useState<Date | null>(null);
  const [processingEndTime, setProcessingEndTime] = useState<Date | null>(null);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [isFeedbackExpanded, setIsFeedbackExpanded] = useState(true);
  const [autoExpandFeedback, setAutoExpandFeedback] = useState(true);
  
  // Adicionar log para depuração
  console.log("Chat renderizando com mensagens:", messages);
  console.log("Número de mensagens:", messages.length);
  console.log("Thinking updates:", thinkingUpdates);
  
  // Encontrar a ferramenta ativa (se houver)
  const activeTool = thinkingUpdates.find(update => update.update_type === 'tool_start');
  const activeToolResult = thinkingUpdates.find(update => update.update_type === 'tool_end');
  
  // Extrair informações da ferramenta ativa
  const getToolInfo = (content: string) => {
    const lines = content.split('\n');
    const toolName = lines[0].replace('Usando ferramenta: ', '');
    const toolDescription = lines[1]?.replace('Descrição: ', '') || '';
    const toolInput = lines[2]?.replace('Entrada: ', '') || '';
    
    return { toolName, toolDescription, toolInput };
  };
  
  const toolInfo = activeTool ? getToolInfo(activeTool.content) : null;
  
  // Obter lista de ferramentas utilizadas
  const getUsedTools = () => {
    const toolStarts = thinkingUpdates.filter(update => update.update_type === 'tool_start');
    return toolStarts.map(update => {
      const lines = update.content.split('\n');
      return lines[0].replace('Usando ferramenta: ', '');
    });
  };
  
  const usedTools = getUsedTools();
  
  // Efeito para simular o progresso da ferramenta
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (activeTool && !activeToolResult) {
      setToolProgress(0);
      interval = setInterval(() => {
        setToolProgress(prev => {
          if (prev >= 90) {
            clearInterval(interval);
            return 90;
          }
          return prev + 10;
        });
      }, 500);
    } else if (activeToolResult) {
      setToolProgress(100);
    } else {
      setToolProgress(0);
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [activeTool, activeToolResult]);
  
  // Efeito para rastrear o tempo de processamento
  useEffect(() => {
    const startUpdate = thinkingUpdates.find(update => update.update_type === 'start');
    const completeUpdate = thinkingUpdates.find(update => update.update_type === 'complete');
    
    if (startUpdate && !processingStartTime) {
      setProcessingStartTime(new Date());
    }
    
    if (completeUpdate && !processingEndTime) {
      setProcessingEndTime(new Date());
    }
  }, [thinkingUpdates, processingStartTime, processingEndTime]);
  
  // Calcular o tempo de processamento
  const getProcessingTime = () => {
    if (processingStartTime && processingEndTime) {
      const diffMs = processingEndTime.getTime() - processingStartTime.getTime();
      const diffSec = Math.round(diffMs / 1000);
      return diffSec;
    }
    return null;
  };
  
  const processingTime = getProcessingTime();
  
  // Função para abrir o popup de resumo
  const handleOpenSummary = () => {
    setIsSummaryOpen(true);
    const dialog = document.querySelector('.MuiDialog-paper');
    if (dialog) {
      dialog.classList.add('opening');
      setTimeout(() => {
        dialog.classList.remove('opening');
      }, 200);
    }
  };
  
  // Função para fechar o popup de resumo
  const handleCloseSummary = () => {
    setIsSummaryOpen(false);
  };

  const handleCloseSummaryWithAnimation = () => {
    const dialog = document.querySelector('.MuiDialog-paper');
    if (dialog) {
      dialog.classList.add('closing');
      setTimeout(() => {
        dialog.classList.remove('closing');
        handleCloseSummary();
      }, 200);
    } else {
      handleCloseSummary();
    }
  };

  // Efeito para expandir automaticamente o feedback quando uma nova ferramenta for executada
  useEffect(() => {
    if (autoExpandFeedback && activeTool && !isFeedbackExpanded) {
      setIsFeedbackExpanded(true);
    }
  }, [activeTool, autoExpandFeedback, isFeedbackExpanded]);
  
  // Função para alternar a expansão do feedback
  const handleFeedbackToggle = () => {
    setIsFeedbackExpanded(!isFeedbackExpanded);
  };
  
  // Função para alternar a expansão automática
  const handleAutoExpandToggle = (event: React.MouseEvent) => {
    event.stopPropagation();
    setAutoExpandFeedback(!autoExpandFeedback);
  };

  return (
    <Box className="flex-1 flex flex-col bg-white">
      <ChatContainer ref={chatContainerRef}>
        {messages && messages.length > 0 ? (
          messages.map((message, index) => (
            <React.Fragment key={index}>
              {/* Mostrar feedback antes da mensagem da IA */}
              {!message.isUser && (
                <Fade in={true} timeout={500}>
                  <FeedbackAccordion 
                    expanded={isFeedbackExpanded} 
                    onChange={handleFeedbackToggle}
                    TransitionProps={{ timeout: 300 }}
                    className={activeTool && !activeToolResult ? 'active-tool' : ''}
                  >
                    {activeTool && !activeToolResult && <ActiveToolPulseIndicator />}
                    <FeedbackAccordionSummary
                      expandIcon={<ExpandMoreIcon />}
                      aria-controls="feedback-content"
                      id="feedback-header"
                      className={activeTool && !activeToolResult ? 'active-tool-summary' : ''}
                    >
                      <FeedbackHeader>
                        <FeedbackIcon>
                          <NotificationsActiveIcon fontSize="small" />
                        </FeedbackIcon>
                        <FeedbackTitle variant="subtitle2">
                          Feedback do Processamento
                        </FeedbackTitle>
                        <FeedbackCount badgeContent={thinkingUpdates.length} color="primary" />
                        <IconButton 
                          size="small" 
                          onClick={handleAutoExpandToggle}
                          sx={{ 
                            ml: 1, 
                            color: autoExpandFeedback ? '#1976d2' : '#757575',
                            '&:hover': { backgroundColor: 'rgba(25, 118, 210, 0.1)' }
                          }}
                          title={autoExpandFeedback ? "Desativar expansão automática" : "Ativar expansão automática"}
                        >
                          {autoExpandFeedback ? <NotificationsActiveIcon fontSize="small" /> : <NotificationsIcon fontSize="small" />}
                        </IconButton>
                      </FeedbackHeader>
                    </FeedbackAccordionSummary>
                    <FeedbackAccordionDetails>
                      {/* Indicador de ferramenta ativa */}
                      {activeTool && toolInfo && (
                        <ActiveToolIndicator>
                          <ActiveToolIcon>
                            🔧
                          </ActiveToolIcon>
                          <ActiveToolContent>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <ActiveToolName variant="body2">
                                {toolInfo.toolName}
                              </ActiveToolName>
                              {!activeToolResult && (
                                <ToolLoadingIcon>
                                  <CircularProgress size={16} color="primary" />
                                </ToolLoadingIcon>
                              )}
                            </Box>
                            <ActiveToolDescription variant="body2">
                              {toolInfo.toolDescription}
                            </ActiveToolDescription>
                            
                            {/* Indicador de progresso */}
                            {!activeToolResult && (
                              <ToolProgressIndicator>
                                <ToolProgressBar>
                                  <ToolProgressFill progress={toolProgress} />
                                </ToolProgressBar>
                                <ToolProgressText variant="body2">
                                  {toolProgress}%
                                </ToolProgressText>
                              </ToolProgressIndicator>
                            )}
                          </ActiveToolContent>
                        </ActiveToolIndicator>
                      )}
                      
                      {thinkingUpdates.length > 0 ? (
                        thinkingUpdates.map((update, index) => (
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
                            <ThinkingContent>
                              <Typography variant="body2">
                                {update.update_type === 'tool_start' && 'Usando ferramenta'}
                                {update.update_type === 'tool_end' && 'Resultado da ferramenta'}
                                {update.update_type === 'start' && 'Iniciando processamento'}
                                {update.update_type === 'chain_start' && 'Iniciando cadeia de processamento'}
                                {update.update_type === 'chain_end' && 'Cadeia de processamento concluída'}
                                {update.update_type === 'complete' && 'Processamento concluído'}
                                {update.update_type === 'error' && 'Erro no processamento'}
                              </Typography>
                              
                              {(update.update_type === 'tool_start' || update.update_type === 'tool_end') && (
                                <ToolInfo>
                                  {update.content}
                                </ToolInfo>
                              )}
                              
                              {update.update_type !== 'tool_start' && update.update_type !== 'tool_end' && (
                                <Typography variant="body2" color="text.secondary">
                                  {update.content}
                                </Typography>
                              )}
                            </ThinkingContent>
                          </ThinkingStep>
                        ))
                      ) : (
                        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                          Nenhuma atualização de processamento disponível.
                        </Typography>
                      )}
                      
                      {/* Resultado da ferramenta */}
                      {activeToolResult && (
                        <ToolResultContainer>
                          <ToolResultHeader>
                            <ToolResultIcon>
                              ✅
                            </ToolResultIcon>
                            <Typography variant="body2" fontWeight="600" color="#4caf50">
                              Resultado da ferramenta
                            </Typography>
                          </ToolResultHeader>
                          <ToolResultContent>
                            {activeToolResult.content.replace('Resultado: ', '')}
                          </ToolResultContent>
                        </ToolResultContainer>
                      )}
                    </FeedbackAccordionDetails>
                  </FeedbackAccordion>
                </Fade>
              )}
              <MessageBubble isUser={message.isUser}>
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
            </React.Fragment>
          ))
        ) : (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 2 }}>
            Nenhuma mensagem ainda. Clique no microfone para começar.
          </Typography>
        )}
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

      {/* Botão para abrir o resumo do processamento */}
      {processingEndTime && (
        <Fade in={true} timeout={500}>
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
            <Badge
              color="primary"
              variant="dot"
              sx={{
                '& .MuiBadge-badge': {
                  top: 8,
                  right: 8,
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: '#4caf50',
                  boxShadow: '0 0 0 2px #fff'
                }
              }}
            >
              <ProcessingSummaryButton
                onClick={handleOpenSummary}
                startIcon={<NotificationsIcon />}
              >
                Ver resumo do processamento
              </ProcessingSummaryButton>
            </Badge>
          </Box>
        </Fade>
      )}
      
      {/* Dialog (popup) para o resumo do processamento */}
      <Dialog
        open={isSummaryOpen}
        onClose={handleCloseSummaryWithAnimation}
        maxWidth="sm"
        fullWidth
        TransitionComponent={Fade}
        TransitionProps={{ timeout: 500 }}
        PaperProps={{
          sx: {
            borderRadius: 2,
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.1)',
            transform: 'scale(0.95)',
            transition: 'all 0.2s ease-in-out',
            '&.MuiDialog-paper': {
              transform: 'scale(1)',
              opacity: 1
            },
            '&.closing': {
              transform: 'scale(0.95)',
              opacity: 0
            },
            '&.opening': {
              transform: 'scale(1)',
              opacity: 1
            }
          }
        }}
      >
        <DialogTitle sx={{ borderBottom: '1px solid #e0e0e0', pb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <ProcessingSummaryIcon>
              ⏱️
            </ProcessingSummaryIcon>
            <Typography variant="h6" color="#757575">
              Resumo do processamento
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          {/* Informações gerais */}
          <SummarySection>
            <SummarySectionTitle>
              <SummarySectionIcon>
                <InfoIcon fontSize="small" />
              </SummarySectionIcon>
              Informações gerais
            </SummarySectionTitle>
            <SummaryItem>
              <SummaryItemLabel>Tempo de processamento:</SummaryItemLabel>
              <SummaryItemValue>{processingTime} segundos</SummaryItemValue>
            </SummaryItem>
            <SummaryItem>
              <SummaryItemLabel>Status:</SummaryItemLabel>
              <SummaryItemValue sx={{ color: '#4caf50' }}>Concluído</SummaryItemValue>
            </SummaryItem>
          </SummarySection>
          
          {/* Ferramentas utilizadas */}
          {usedTools.length > 0 && (
            <SummarySection>
              <SummarySectionTitle>
                <SummarySectionIcon>
                  🔧
                </SummarySectionIcon>
                Ferramentas utilizadas ({usedTools.length})
              </SummarySectionTitle>
              <ToolList>
                {usedTools.map((tool, index) => (
                  <ToolItem key={index}>
                    {tool}
                  </ToolItem>
                ))}
              </ToolList>
            </SummarySection>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #e0e0e0' }}>
          <Button 
            onClick={handleCloseSummaryWithAnimation} 
            variant="contained" 
            color="primary"
            sx={{ borderRadius: 2 }}
          >
            Fechar
          </Button>
        </DialogActions>
      </Dialog>

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