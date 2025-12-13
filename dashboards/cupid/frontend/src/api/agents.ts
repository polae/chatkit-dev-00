import { fetchApi } from './client'
import type { AgentStats, AgentDetail, AgentChartData } from '@/types'

interface AgentsResponse {
  data: AgentStats[]
}

export async function getAgents(): Promise<AgentsResponse> {
  return fetchApi('/agents')
}

export async function getAgentDetail(agentName: string): Promise<AgentDetail> {
  return fetchApi(`/agents/${encodeURIComponent(agentName)}`)
}

export async function getAgentCharts(agentName: string): Promise<AgentChartData> {
  return fetchApi(`/agents/${encodeURIComponent(agentName)}/charts`)
}
