export interface Session {
  id: string
  created_at: string
  trace_count: number
  total_cost: number
  avg_latency: number
  mortal_name: string | null
  match_name: string | null
  max_chapter: number
  is_complete: boolean
  first_trace_at: string | null
  last_trace_at: string | null
  duration_seconds: number | null
}

export interface SessionStats {
  total_sessions: number
  total_cost: number
  avg_duration_seconds: number
  avg_latency_seconds: number
  complete_sessions: number
  incomplete_sessions: number
}

export interface MessageMetadata {
  latency_ms: number
  cost: number
  total_tokens: number
  prompt_tokens: number
  completion_tokens: number
  model: string | null
}

export interface ConversationMessage {
  type: 'user' | 'agent'
  timestamp: string
  chapter: string | null
  agent: string | null
  content: string
  metadata: MessageMetadata | null
}

export interface SessionDetail {
  id: string
  mortal_name: string | null
  match_name: string | null
  max_chapter: number
  is_complete: boolean
  total_cost: number
  duration_seconds: number | null
}

export interface ConversationResponse {
  session: SessionDetail
  messages: ConversationMessage[]
}

export interface AgentStats {
  name: string
  category: string
  execution_count: number
  avg_latency_ms: number
  total_cost: number
  total_tokens: number
  success_rate: number
}

export interface AgentExecution {
  trace_id: string
  timestamp: string
  latency_ms: number
  tokens: number
  cost: number
  status: string
}

export interface AgentDetail {
  name: string
  category: string
  stats: {
    execution_count: number
    avg_latency_ms: number
    total_cost: number
    total_tokens: number
    success_rate: number
  }
  recent_executions: AgentExecution[]
}

export interface AgentChartData {
  latency_over_time: Array<{ timestamp: string; latency_ms: number }>
  executions_by_hour: Array<{ hour: number; count: number }>
}

export interface DashboardMetrics {
  kpis: {
    unique_sessions: number
    total_traces: number
    total_cost: number
    avg_latency_seconds: number
    cost_per_session: number
  }
  cost_by_chapter: Array<{ chapter: string; cost: number }>
  traces_per_day: Array<{ date: string; count: number }>
}

export interface SyncStatus {
  status: string
  last_sync_at: string | null
  next_sync_at: string | null
  error_message: string | null
}

export type TimeRange = '24h' | '7d' | '30d' | 'all'
