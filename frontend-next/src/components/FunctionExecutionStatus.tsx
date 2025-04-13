import React from 'react';
import { Box, Typography, Chip, CircularProgress } from '@mui/material';
import { styled } from '@mui/material/styles';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import InfoIcon from '@mui/icons-material/Info';
import { FunctionExecutionType } from './MainLayout';
const StatusContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  marginTop: theme.spacing(1),
  marginBottom: theme.spacing(1),
  padding: theme.spacing(1),
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.mode === 'dark' 
    ? 'rgba(255, 255, 255, 0.05)' 
    : 'rgba(0, 0, 0, 0.03)',
}));

const StatusIcon = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 24,
  height: 24,
}));

interface FunctionExecutionStatusProps {
  type: FunctionExecutionType;
  content: string;
}

const FunctionExecutionStatus: React.FC<FunctionExecutionStatusProps> = ({ type, content }) => {
  const getStatusColor = () => {
    switch (type) {
      case 'function_call_start':
        return 'primary';
      case 'function_call_error':
        return 'error';
      case 'function_call_end':
        return 'info';
      case 'function_call_info':
        return 'info';
      case 'agent_response_end':
        return 'success';
      default:
        return 'default';
    }
  };

  const getStatusIcon = () => {
    switch (type) {
      case 'function_call_start':
        return <PlayArrowIcon fontSize="small" />;
      case 'function_call_error':
        return <ErrorIcon fontSize="small" />;
      case 'function_call_end':
        return <CheckCircleIcon fontSize="small" />;
      case 'function_call_info':
        return <InfoIcon fontSize="small" />;
      default:
        return <PlayArrowIcon fontSize="small" />;
    }
  };

  const getStatusText = () => {
    switch (type) {
      case 'function_call_start':
        return 'Iniciando';
      case 'function_call_error':
        return 'Erro';
      case 'function_call_end':
        return 'Concluído';
      case 'function_call_info':
        return 'Processando';
      case 'agent_response_end':
        return 'Finalizado';
      default:
        return '';
    }
  };

  return (
    <StatusContainer sx={{ backgroundColor: getStatusText() === 'Finalizado' ? 'rgba(0, 128, 0, 0.1)' : 'transparent' }}>
      <StatusIcon>
        {getStatusIcon()}
      </StatusIcon>
      <Chip 
        label={getStatusText()} 
        color={getStatusColor()} 
        size="small" 
        variant="outlined" 
      />
      <Typography variant="body2" color="text.secondary">
        {content}
      </Typography>
    </StatusContainer>
  );
};

export default FunctionExecutionStatus; 