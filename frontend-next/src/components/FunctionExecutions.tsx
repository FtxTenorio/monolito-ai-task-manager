import React from 'react';
import { Box } from '@mui/material';
import FunctionExecutionStatus from './FunctionExecutionStatus';
import { FunctionExecutionType } from './MainLayout';
interface FunctionExecution {
  type: FunctionExecutionType;
  content: string;
  format: string;
}

interface FunctionExecutionsProps {
  executions: FunctionExecution[];
}

const FunctionExecutions: React.FC<FunctionExecutionsProps> = ({ executions }) => {
  return (
    <Box sx={{ width: '100%' }}>
      {executions.map((execution, index) => (
        <Box
          key={`execution-${index}`}
          sx={{
            p: 1,
            borderBottom: index < executions.length - 1 ? '1px solid rgba(0,0,0,0.1)' : 'none'
          }}
        >
          <FunctionExecutionStatus
            type={execution.type}
            content={execution.content}
          />
        </Box>
      ))}
    </Box>
  );
};

export default FunctionExecutions; 