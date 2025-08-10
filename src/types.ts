export interface UsageEntry {
  timestamp: string;
  sessionId?: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUSD: number;
  promptId?: string;
  completionId?: string;
}

export interface DailyUsage {
  date: string;
  inputTokens: number;
  outputTokens: number;
  totalCost: number;
  modelsUsed: string[];
  modelBreakdowns: ModelBreakdown[];
}

export interface MonthlyUsage {
  month: string;
  inputTokens: number;
  outputTokens: number;
  totalCost: number;
  modelsUsed: string[];
  modelBreakdowns: ModelBreakdown[];
}

export interface SessionUsage {
  sessionId: string;
  inputTokens: number;
  outputTokens: number;
  totalCost: number;
  lastActivity: string;
  modelsUsed: string[];
  modelBreakdowns: ModelBreakdown[];
}

export interface ModelBreakdown {
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalCost: number;
}