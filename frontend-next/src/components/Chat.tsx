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

// Definir tipos para o conteúdo das atualizações
interface ToolInfo {
  name: string;
  description: string;
  input: string;
  parameters?: Record<string, any>;
}

interface ToolResult {
  tool_name: string;
  status: string;
  output: string | any;
  execution_time: number;
}

interface ThinkingUpdateContent {
  tool?: ToolInfo;
  result?: ToolResult;
  active_tools?: string[];
  message: string;
  inputs?: any;
  outputs?: any;
  model?: string;
  tokens_used?: any;
  error?: string;
}

// Atualizar o tipo para ser mais flexível
type ThinkingUpdateType = string;

interface ThinkingUpdate {
  update_type: ThinkingUpdateType;
  content: string | ThinkingUpdateContent;
}

interface Message {
  text: string;
  isUser: boolean;
  thinkingUpdates?: ThinkingUpdate[];
  processingStartTime?: Date;
  processingEndTime?: Date;
}

// Definir o tipo para o estado de expansão do feedback
interface FeedbackExpandedState {
  [key: number]: boolean;
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
  width: 100%;
  box-sizing: border-box;
  
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
  padding: 0.5rem;
  background-color: #f9f9f9;
  max-height: 200px;
  overflow-y: auto;
  transition: all 0.3s ease;
  border-top: 1px solid #e0e0e0;
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

const ToolDetailBox = styled(Box)`
  background: #f8f9fa;
  border-radius: 4px;
  padding: 0.5rem;
  margin: 0.25rem 0;
  border-left: 3px solid #2196f3;
`;

const ToolDetailTitle = styled(Typography)`
  font-weight: 600;
  font-size: 0.8rem;
  color: #1976d2;
  margin-bottom: 0.25rem;
`;

const ToolDetailText = styled(Typography)`
  font-size: 0.75rem;
  color: #666;
  margin: 0.1rem 0;
`;

const ToolParameterBox = styled(Box)`
  background: #fff;
  border-radius: 4px;
  padding: 0.25rem;
  margin: 0.25rem 0;
  border: 1px solid #e0e0e0;
`;

const ProcessingFeedbackContent = styled(DialogContent)`
  max-height: 500px;
  overflow-y: auto;
`;

// Função auxiliar para verificar se o conteúdo é um objeto ThinkingUpdateContent
const isThinkingUpdateContent = (content: string | ThinkingUpdateContent): content is ThinkingUpdateContent => {
  return typeof content === 'object' && content !== null && 'message' in content;
};

// Função auxiliar para obter a mensagem do conteúdo
const getContentMessage = (content: string | ThinkingUpdateContent | undefined): string => {
  if (!content) return 'Sem informações disponíveis';
  if (typeof content === 'string') return content;
  if (isThinkingUpdateContent(content)) return content.message;
  return 'Sem informações disponíveis';
};

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
  thinkingUpdates,
}) => {
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [toolProgress, setToolProgress] = useState(0);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [selectedMessageIndex, setSelectedMessageIndex] = useState<number | null>(null);
  const [isFeedbackExpanded, setIsFeedbackExpanded] = useState<FeedbackExpandedState>({});
  const [autoExpandFeedback, setAutoExpandFeedback] = useState(true);
  const [localMessages, setLocalMessages] = useState<Message[]>(propMessages);
  
  // Adicionar logs para depuração
  console.log("Chat renderizando com props:", {
    propMessagesLength: propMessages.length,
    thinkingUpdatesLength: thinkingUpdates.length,
    isProcessing
  });
  
  // Efeito para sincronizar as mensagens locais com as props
  useEffect(() => {
    console.log("Sincronizando mensagens locais com props:", propMessages.length);
    setLocalMessages(propMessages);
  }, [propMessages]);
  
  // Efeito para atualizar as mensagens com as atualizações de processamento
  useEffect(() => {
    console.log("Efeito de atualização de processamento:", {
      thinkingUpdatesLength: thinkingUpdates.length,
      localMessagesLength: localMessages.length,
      isProcessing
    });
    
    if (thinkingUpdates.length > 0 && localMessages.length > 0) {
      // Encontrar a última mensagem da IA
      const lastAIMessageIndex = [...localMessages].reverse().findIndex(msg => !msg.isUser);
      console.log("Índice da última mensagem da IA:", lastAIMessageIndex);
      
      if (lastAIMessageIndex !== -1) {
        const actualIndex = localMessages.length - 1 - lastAIMessageIndex;
        console.log("Índice real da mensagem:", actualIndex);
        
        // Atualizar a mensagem com as atualizações de processamento
        const updatedMessages = [...localMessages];
        
        // Verificar se a mensagem já tem thinkingUpdates
        const existingUpdates = updatedMessages[actualIndex].thinkingUpdates || [];
        console.log("Atualizações existentes:", existingUpdates.length);
        console.log("Novas atualizações:", thinkingUpdates.length);
        
        // Combinar as atualizações existentes com as novas, evitando duplicatas
        const combinedUpdates = [...existingUpdates];
        
        // Adicionar apenas atualizações que não existem ainda
        thinkingUpdates.forEach(newUpdate => {
          const isDuplicate = combinedUpdates.some(existingUpdate => 
            existingUpdate.update_type === newUpdate.update_type && 
            JSON.stringify(existingUpdate.content) === JSON.stringify(newUpdate.content)
          );
          
          if (!isDuplicate) {
            combinedUpdates.push(newUpdate);
          }
        });
        
        console.log("Atualizações combinadas:", combinedUpdates.length);
        
        updatedMessages[actualIndex] = {
          ...updatedMessages[actualIndex],
          thinkingUpdates: combinedUpdates,
          processingStartTime: updatedMessages[actualIndex].processingStartTime || new Date(),
          processingEndTime: isProcessing ? undefined : new Date()
        };
        
        console.log("Atualizando mensagem com feedback:", {
          index: actualIndex,
          thinkingUpdatesLength: combinedUpdates.length,
          message: updatedMessages[actualIndex]
        });
        
        // Atualizar o estado local das mensagens
        setLocalMessages(updatedMessages);
        
        // Expandir automaticamente o feedback se estiver habilitado
        if (autoExpandFeedback && !isFeedbackExpanded[actualIndex]) {
          console.log("Expandindo feedback automaticamente para mensagem:", actualIndex);
          setIsFeedbackExpanded(prev => ({
            ...prev,
            [actualIndex]: true
          }));
        }
      }
    }
  }, [thinkingUpdates, localMessages, isProcessing, autoExpandFeedback, isFeedbackExpanded]);
  
  // Encontrar a ferramenta ativa na mensagem selecionada
  const getActiveTool = (messageIndex: number): ThinkingUpdate | null => {
    const message = localMessages[messageIndex];
    if (!message || !message.thinkingUpdates) return null;
    
    return message.thinkingUpdates.find(update => update.update_type === 'tool_start') || null;
  };
  
  // Encontrar o resultado da ferramenta na mensagem selecionada
  const getActiveToolResult = (messageIndex: number): ThinkingUpdate | null => {
    const message = localMessages[messageIndex];
    if (!message || !message.thinkingUpdates) return null;
    
    return message.thinkingUpdates.find(update => update.update_type === 'tool_end') || null;
  };
  
  // Extrair informações da ferramenta ativa
  const getToolInfo = (content: string | ThinkingUpdateContent | undefined) => {
    if (!content) {
      return { toolName: 'Desconhecida', toolDescription: '', toolInput: '' };
    }
    
    if (typeof content === 'string') {
      const lines = content.split('\n');
      const toolName = lines[0].replace('Usando ferramenta: ', '');
      const toolDescription = lines[1]?.replace('Descrição: ', '') || '';
      const toolInput = lines[2]?.replace('Entrada: ', '') || '';
      
      return { toolName, toolDescription, toolInput };
    } else if (typeof content === 'object' && 'tool' in content && content.tool) {
      return {
        toolName: content.tool.name,
        toolDescription: content.tool.description,
        toolInput: content.tool.input
      };
    }
    return { toolName: 'Desconhecida', toolDescription: '', toolInput: '' };
  };
  
  // Obter lista de ferramentas utilizadas para uma mensagem específica
  const getUsedTools = (messageIndex: number): string[] => {
    const message = localMessages[messageIndex];
    if (!message || !message.thinkingUpdates) return [];
    
    const toolStarts = message.thinkingUpdates.filter(update => update.update_type === 'tool_start');
    return toolStarts.map(update => {
      const content = update.content;
      if (typeof content === 'string') {
        const lines = content.split('\n');
        return lines[0].replace('Usando ferramenta: ', '');
      } else if (typeof content === 'object' && 'tool' in content && content.tool) {
        return content.tool.name;
      }
      return 'Ferramenta desconhecida';
    });
  };
  
  // Calcular o tempo de processamento para uma mensagem específica
  const getProcessingTime = (messageIndex: number) => {
    const message = localMessages[messageIndex];
    if (!message) return null;
    
    if (message.processingStartTime && message.processingEndTime) {
      const diffMs = message.processingEndTime.getTime() - message.processingStartTime.getTime();
      const diffSec = Math.round(diffMs / 1000);
      return diffSec;
    }
    return null;
  };
  
  // Função para abrir o popup de resumo
  const handleOpenSummary = (messageIndex: number) => {
    setSelectedMessageIndex(messageIndex);
    setIsSummaryOpen(true);
  };
  
  // Função para fechar o popup de resumo
  const handleCloseSummary = () => {
    setIsSummaryOpen(false);
    setSelectedMessageIndex(null);
  };
  
  // Função para alternar a expansão do feedback para uma mensagem específica
  const handleFeedbackToggle = (messageIndex: number) => (event: React.SyntheticEvent, expanded: boolean) => {
    setIsFeedbackExpanded(prev => ({
      ...prev,
      [messageIndex]: expanded
    }));
  };
  
  // Função para alternar a expansão automática
  const handleAutoExpandToggle = (event: React.MouseEvent) => {
    event.stopPropagation();
    setAutoExpandFeedback(!autoExpandFeedback);
  };
  
  // Efeito para simular o progresso da ferramenta
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    // Encontrar a última mensagem da IA
    const lastAIMessageIndex = [...localMessages].reverse().findIndex(msg => !msg.isUser);
    
    if (lastAIMessageIndex !== -1) {
      const actualIndex = localMessages.length - 1 - lastAIMessageIndex;
      const message = localMessages[actualIndex];
      
      if (message && message.thinkingUpdates) {
        const activeTool = message.thinkingUpdates.find(update => update.update_type === 'tool_start');
        const activeToolResult = message.thinkingUpdates.find(update => update.update_type === 'tool_end');
        
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
      }
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [localMessages, thinkingUpdates]);
  
  const renderToolDetails = (update: ThinkingUpdate) => {
    if (update.update_type === "tool_start" && typeof update.content === 'object' && 'tool' in update.content && update.content.tool) {
      const tool = update.content.tool;
      return (
        <ToolDetailBox>
          <ToolDetailTitle>
            {tool.name} - Iniciando
          </ToolDetailTitle>
          <ToolDetailText>
            <strong>Descrição:</strong> {tool.description}
          </ToolDetailText>
          <ToolDetailText>
            <strong>Input:</strong> {tool.input}
          </ToolDetailText>
          {tool.parameters && Object.keys(tool.parameters).length > 0 && (
            <ToolParameterBox>
              <ToolDetailText>
                <strong>Parâmetros:</strong>
              </ToolDetailText>
              <pre style={{ fontSize: '0.7rem', margin: '0.25rem 0' }}>
                {JSON.stringify(tool.parameters, null, 2)}
              </pre>
            </ToolParameterBox>
          )}
        </ToolDetailBox>
      );
    }
    
    if (update.update_type === "tool_end" && typeof update.content === 'object' && 'result' in update.content && update.content.result) {
      const result = update.content.result;
      return (
        <ToolDetailBox>
          <ToolDetailTitle>
            {result.tool_name} - Concluído em {result.execution_time.toFixed(2)}s
          </ToolDetailTitle>
          <ToolDetailText>
            <strong>Status:</strong> {result.status}
          </ToolDetailText>
          <ToolParameterBox>
            <ToolDetailText>
              <strong>Resultado:</strong>
            </ToolDetailText>
            <pre style={{ fontSize: '0.7rem', margin: '0.25rem 0' }}>
              {typeof result.output === 'string' ? result.output : JSON.stringify(result.output, null, 2)}
            </pre>
          </ToolParameterBox>
        </ToolDetailBox>
      );
    }

    if (update.update_type === "llm_start" && typeof update.content === 'object' && 'model' in update.content) {
      return (
        <ToolDetailBox>
          <ToolDetailTitle>
            Modelo de Linguagem - Iniciando
          </ToolDetailTitle>
          <ToolDetailText>
            <strong>Modelo:</strong> {update.content.model}
          </ToolDetailText>
        </ToolDetailBox>
      );
    }

    if (update.update_type === "llm_end" && typeof update.content === 'object' && 'tokens_used' in update.content) {
      return (
        <ToolDetailBox>
          <ToolDetailTitle>
            Modelo de Linguagem - Concluído
          </ToolDetailTitle>
          {update.content.tokens_used && (
            <ToolDetailText>
              <strong>Tokens utilizados:</strong>
              <pre style={{ fontSize: '0.7rem', margin: '0.25rem 0' }}>
                {JSON.stringify(update.content.tokens_used, null, 2)}
              </pre>
            </ToolDetailText>
          )}
        </ToolDetailBox>
      );
    }

    return null;
  };

  return (
    <Box className="flex-1 flex flex-col bg-white">
      <ChatContainer ref={chatContainerRef}>
        {localMessages && localMessages.length > 0 ? (
          localMessages.map((message: Message, index: number) => {
            // Log detalhado para cada mensagem
            console.log("Renderizando mensagem:", {
              index,
              isUser: message.isUser,
              thinkingUpdatesLength: message.thinkingUpdates?.length || 0,
              thinkingUpdates: message.thinkingUpdates,
              isFeedbackExpanded: isFeedbackExpanded[index]
            });
            
            // Verificar se a mensagem tem atualizações de processamento
            const hasThinkingUpdates = !message.isUser && message.thinkingUpdates && message.thinkingUpdates.length > 0;
            console.log("Mensagem tem atualizações de processamento:", hasThinkingUpdates, "para índice:", index);
            
            return (
              <React.Fragment key={index}>
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
                      
                      {/* Mostrar feedback dentro da mensagem da IA */}
                      {!message.isUser && hasThinkingUpdates && (
                        <Fade in={true} timeout={500}>
                          <Box sx={{ mt: 2, borderTop: '1px solid #e0e0e0', pt: 1 }}>
                            <FeedbackAccordion 
                              expanded={isFeedbackExpanded[index] || false} 
                              onChange={handleFeedbackToggle(index)}
                              TransitionProps={{ timeout: 300 }}
                              className={getActiveTool(index) && !getActiveToolResult(index) ? 'active-tool' : ''}
                              sx={{ width: '100%', mb: 1 }}
                            >
                              {getActiveTool(index) && !getActiveToolResult(index) && <ActiveToolPulseIndicator />}
                              <FeedbackAccordionSummary
                                expandIcon={<ExpandMoreIcon />}
                                aria-controls="feedback-content"
                                id="feedback-header"
                                className={getActiveTool(index) && !getActiveToolResult(index) ? 'active-tool-summary' : ''}
                                sx={{ 
                                  backgroundColor: isFeedbackExpanded[index] ? '#e3f2fd' : '#f0f7ff',
                                  borderLeft: getActiveTool(index) && !getActiveToolResult(index) ? '3px solid #2196f3' : 'none'
                                }}
                              >
                                <FeedbackHeader>
                                  <FeedbackIcon>
                                    <NotificationsActiveIcon fontSize="small" />
                                  </FeedbackIcon>
                                  <FeedbackTitle variant="subtitle2">
                                    Feedback do Processamento
                                  </FeedbackTitle>
                                  <FeedbackCount badgeContent={message.thinkingUpdates?.length || 0} color="primary" />
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
                                {getActiveTool(index) && (
                                  <ActiveToolIndicator>
                                    <ActiveToolIcon>
                                      🔧
                                    </ActiveToolIcon>
                                    <ActiveToolContent>
                                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                        <ActiveToolName variant="body2">
                                          {getToolInfo(getActiveTool(index)?.content).toolName}
                                        </ActiveToolName>
                                        {!getActiveToolResult(index) && (
                                          <ToolLoadingIcon>
                                            <CircularProgress size={16} color="primary" />
                                          </ToolLoadingIcon>
                                        )}
                                      </Box>
                                      <ActiveToolDescription variant="body2">
                                        {getToolInfo(getActiveTool(index)?.content).toolDescription}
                                      </ActiveToolDescription>
                                      
                                      {/* Indicador de progresso */}
                                      {!getActiveToolResult(index) && (
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
                                
                                {/* Lista de atualizações de processamento */}
                                {message.thinkingUpdates && message.thinkingUpdates.length > 0 ? (
                                  message.thinkingUpdates.map((update: ThinkingUpdate, updateIndex: number) => (
                                    <ThinkingStep key={updateIndex}>
                                      <ThinkingIcon>
                                        {update.update_type === 'start' && '🔄'}
                                        {update.update_type === 'tool_start' && '🔧'}
                                        {update.update_type === 'tool_end' && '✅'}
                                        {update.update_type === 'chain_start' && '⛓️'}
                                        {update.update_type === 'chain_end' && '✨'}
                                        {update.update_type === 'complete' && '🎉'}
                                        {update.update_type === 'error' && '❌'}
                                        {update.update_type === 'llm_start' && '🧠'}
                                        {update.update_type === 'llm_end' && '✨'}
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
                                          {update.update_type === 'llm_start' && 'Iniciando modelo de linguagem'}
                                          {update.update_type === 'llm_end' && 'Modelo de linguagem concluído'}
                                        </Typography>
                                        
                                        {(update.update_type === 'tool_start' || update.update_type === 'tool_end') && (
                                          <ToolInfo>
                                            {getContentMessage(update.content)}
                                          </ToolInfo>
                                        )}
                                        
                                        {update.update_type !== 'tool_start' && update.update_type !== 'tool_end' && (
                                          <Typography variant="body2" color="text.secondary">
                                            {getContentMessage(update.content)}
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
                                {getActiveToolResult(index) && (
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
                                      {getContentMessage(getActiveToolResult(index)?.content)}
                                    </ToolResultContent>
                                  </ToolResultContainer>
                                )}
                                
                                {/* Botão para abrir o resumo do processamento */}
                                {message.processingEndTime && (
                                  <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                                    <ProcessingSummaryButton
                                      onClick={() => handleOpenSummary(index)}
                                      startIcon={<InfoIcon />}
                                    >
                                      Ver resumo completo
                                    </ProcessingSummaryButton>
                                  </Box>
                                )}
                              </FeedbackAccordionDetails>
                            </FeedbackAccordion>
                          </Box>
                        </Fade>
                      )}
                    </MessageContent>
                  )}
                </MessageBubble>
              </React.Fragment>
            );
          })
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
      
      {/* Dialog (popup) para o resumo do processamento */}
      <Dialog
        open={isSummaryOpen}
        onClose={handleCloseSummary}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Feedback do Processamento
        </DialogTitle>
        <ProcessingFeedbackContent>
          {selectedMessageIndex !== null && localMessages[selectedMessageIndex] && (
            <>
              <Box mb={2}>
                <Typography variant="subtitle1" gutterBottom>
                  Tempo de Processamento: {getProcessingTime(selectedMessageIndex)} segundos
                </Typography>
              </Box>
              
              <Box mb={2}>
                <Typography variant="subtitle1" gutterBottom>
                  Detalhes da Execução:
                </Typography>
                {localMessages[selectedMessageIndex].thinkingUpdates?.map((update, index) => (
                  <Box key={index} mb={1}>
                    {renderToolDetails(update)}
                  </Box>
                ))}
              </Box>
              
              {getUsedTools(selectedMessageIndex).length > 0 && (
                <Box mb={2}>
                  <Typography variant="subtitle1" gutterBottom>
                    Ferramentas Utilizadas:
                  </Typography>
                  {getUsedTools(selectedMessageIndex).map((tool, index) => (
                    <ToolSummaryItem key={index}>
                      {tool}
                    </ToolSummaryItem>
                  ))}
                </Box>
              )}
            </>
          )}
        </ProcessingFeedbackContent>
        <DialogActions>
          <Button onClick={handleCloseSummary} color="primary">
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