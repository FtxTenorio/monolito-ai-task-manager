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
  timestamp?: string;
}

export interface Routine {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'completed' | 'cancelled';
  schedule: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'weekdays' | 'weekends' | 'custom';
  priority: 'high' | 'medium' | 'low';
  tags: string[];
  estimated_duration: number;
  start_date?: string;
  end_date?: string;
  custom_days?: number[];
  created_at: string;
  updated_at: string;
}

export interface RoutineCalendarRef {
  fetchRoutines: () => void;
} 