// Interface para informações de ferramentas
export interface ToolInfo {
  name: string;
  description: string;
  input: string;
  parameters?: Record<string, any>;
}

export interface ToolResult {
  tool_name: string;
  status: string;
  output: string | any;
  execution_time: number;
}

export interface ThinkingUpdate {
  type?: string;
  update_type: string;
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

export interface Message {
  text: string;
  isUser: boolean;
  processingStartTime?: Date;
  processingEndTime?: Date;
  isFeedbackExpanded?: boolean;
} 