import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Collapse, 
  IconButton, 
  Tooltip,
  CircularProgress,
  Divider,
  Chip
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import InfoIcon from '@mui/icons-material/Info';
import { styled } from '@mui/material/styles';

// Interface para informações de ferramentas
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

interface ThinkingUpdate {
  update_type: 'tool_start' | 'tool_end' | 'chain_start' | 'chain_end' | 'llm_start' | 'llm_end' | 'llm_error' | 'tool_error';
  content: {
    tool?: ToolInfo;
    result?: ToolResult;
    active_tools?: string[];
    message: string;
    inputs?: any;
    outputs?: any;
    model?: string;
    tokens_used?: any;
    error?: string;
  };
}

interface ToolExecutionDetailsProps {
  thinkingUpdates: ThinkingUpdate[];
  isProcessing: boolean;
}

// Componentes estilizados
const ToolExecutionContainer = styled(Paper)(({ theme }) => ({
  position: 'fixed',
  bottom: 150,
  left: '50%',
  transform: 'translateX(-50%)',
  width: '90%',
  maxWidth: 600,
  maxHeight: 300,
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  borderRadius: theme.shape.borderRadius,
  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
  zIndex: 1000,
  transition: 'all 0.3s ease',
}));

const ToolExecutionHeader = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: theme.spacing(1, 2),
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
  cursor: 'pointer',
}));

const ToolExecutionContent = styled(Box)(({ theme }) => ({
  padding: theme.spacing(1, 2),
  overflowY: 'auto',
  backgroundColor: theme.palette.background.paper,
}));

const ToolItem = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  padding: theme.spacing(1),
  marginBottom: theme.spacing(1),
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.grey[50],
  border: `1px solid ${theme.palette.grey[200]}`,
}));

const ToolIcon = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 32,
  height: 32,
  borderRadius: '50%',
  backgroundColor: theme.palette.primary.light,
  color: theme.palette.primary.contrastText,
  marginRight: theme.spacing(1),
}));

const ToolDetails = styled(Box)(({ theme }) => ({
  flex: 1,
}));

const ToolName = styled(Typography)(({ theme }) => ({
  fontWeight: 600,
  color: theme.palette.text.primary,
}));

const ToolDescription = styled(Typography)(({ theme }) => ({
  fontSize: '0.8rem',
  color: theme.palette.text.secondary,
}));

const ToolStatus = styled(Chip)(({ theme }) => ({
  marginLeft: theme.spacing(1),
}));

// Função auxiliar para verificar se o conteúdo é um objeto com a propriedade tool
const isToolContent = (content: any): content is { tool: ToolInfo } => {
  return typeof content === 'object' && content !== null && 'tool' in content && content.tool !== undefined;
};

// Função auxiliar para verificar se o conteúdo é um objeto com a propriedade result
const isResultContent = (content: any): content is { result: ToolResult } => {
  return typeof content === 'object' && content !== null && 'result' in content && content.result !== undefined;
};

const ToolExecutionDetails: React.FC<ToolExecutionDetailsProps> = ({ 
  thinkingUpdates, 
  isProcessing 
}) => {
  const [expanded, setExpanded] = useState(false);
  
  // Extrair ferramentas ativas das atualizações
  const getActiveTools = () => {
    const activeTools: { name: string; description: string; status: string }[] = [];
    
    thinkingUpdates.forEach(update => {
      if (update.update_type === 'tool_start' && update.content.tool) {
        activeTools.push({
          name: update.content.tool.name,
          description: update.content.tool.description,
          status: 'running'
        });
      } else if (update.update_type === 'tool_end' && update.content.result) {
        // Remover ferramenta concluída da lista
        const index = activeTools.findIndex(tool => tool.name === update.content.result!.tool_name);
        if (index !== -1) {
          activeTools.splice(index, 1);
        }
      }
    });
    
    return activeTools;
  };
  
  // Extrair resultados de ferramentas das atualizações
  const getToolResults = () => {
    const results: { name: string; output: string | any; executionTime: number }[] = [];
    
    thinkingUpdates.forEach(update => {
      if (update.update_type === 'tool_end' && update.content.result) {
        results.push({
          name: update.content.result!.tool_name,
          output: update.content.result!.output,
          executionTime: update.content.result!.execution_time
        });
      }
    });
    
    return results;
  };
  
  const activeTools = getActiveTools();
  const toolResults = getToolResults();
  
  // Se não houver ferramentas ativas e não estiver processando, não mostrar nada
  if (activeTools.length === 0 && !isProcessing) {
    return null;
  }
  
  return (
    <ToolExecutionContainer>
      <ToolExecutionHeader onClick={() => setExpanded(!expanded)}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <CircularProgress size={16} sx={{ color: 'white', mr: 1 }} />
          <Typography variant="subtitle2">
            {isProcessing ? 'Processando...' : 'Ferramentas Executadas'}
          </Typography>
          {activeTools.length > 0 && (
            <Chip 
              label={activeTools.length} 
              size="small" 
              sx={{ 
                ml: 1, 
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                color: 'white',
                height: 20
              }} 
            />
          )}
        </Box>
        <IconButton size="small" sx={{ color: 'white' }}>
          {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </IconButton>
      </ToolExecutionHeader>
      
      <Collapse in={expanded}>
        <ToolExecutionContent>
          {activeTools.length > 0 && (
            <>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                Ferramentas Ativas
              </Typography>
              {activeTools.map((tool, index) => (
                <ToolItem key={index}>
                  <ToolIcon>
                    🔧
                  </ToolIcon>
                  <ToolDetails>
                    <ToolName variant="body2">
                      {tool.name}
                    </ToolName>
                    <ToolDescription variant="body2">
                      {tool.description}
                    </ToolDescription>
                  </ToolDetails>
                  <ToolStatus 
                    label="Executando" 
                    color="primary" 
                    size="small"
                    icon={<CircularProgress size={12} sx={{ color: 'white' }} />}
                  />
                </ToolItem>
              ))}
              {toolResults.length > 0 && <Divider sx={{ my: 1 }} />}
            </>
          )}
          
          {toolResults.length > 0 && (
            <>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                Ferramentas Concluídas
              </Typography>
              {toolResults.map((result, index) => (
                <ToolItem key={index}>
                  <ToolIcon>
                    ✅
                  </ToolIcon>
                  <ToolDetails>
                    <ToolName variant="body2">
                      {result.name}
                    </ToolName>
                    <ToolDescription variant="body2">
                      Tempo de execução: {result.executionTime.toFixed(2)}s
                    </ToolDescription>
                  </ToolDetails>
                  <ToolStatus 
                    label="Concluído" 
                    color="success" 
                    size="small"
                  />
                </ToolItem>
              ))}
            </>
          )}
          
          {activeTools.length === 0 && toolResults.length === 0 && (
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Aguardando processamento...
              </Typography>
            </Box>
          )}
        </ToolExecutionContent>
      </Collapse>
    </ToolExecutionContainer>
  );
};

export default ToolExecutionDetails; 