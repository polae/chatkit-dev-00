import { create } from 'zustand'
import type {
  Session,
  SessionStats,
  ConversationResponse,
  AgentStats,
  AgentDetail,
  AgentChartData,
  DashboardMetrics,
  SyncStatus,
  TimeRange,
} from '@/types'
import * as sessionsApi from '@/api/sessions'
import * as agentsApi from '@/api/agents'
import * as metricsApi from '@/api/metrics'
import * as syncApi from '@/api/sync'

interface DashboardState {
  // Global time range filter
  timeRange: TimeRange
  setTimeRange: (range: TimeRange) => void

  // Sessions
  sessions: Session[]
  sessionsMeta: { total: number; page: number; limit: number; pages: number } | null
  sessionsLoading: boolean
  sessionStats: SessionStats | null
  fetchSessions: (params?: {
    status?: 'complete' | 'incomplete' | 'all'
    search?: string
    page?: number
  }) => Promise<void>
  fetchSessionStats: () => Promise<void>

  // Conversation
  conversation: ConversationResponse | null
  conversationLoading: boolean
  fetchConversation: (sessionId: string) => Promise<void>

  // Agents
  agents: AgentStats[]
  agentsLoading: boolean
  selectedAgent: string | null
  agentDetail: AgentDetail | null
  agentCharts: AgentChartData | null
  setSelectedAgent: (name: string | null) => void
  fetchAgents: () => Promise<void>
  fetchAgentDetail: (name: string) => Promise<void>

  // Metrics
  dashboardMetrics: DashboardMetrics | null
  metricsLoading: boolean
  fetchDashboardMetrics: () => Promise<void>

  // Sync status
  syncStatus: SyncStatus | null
  syncInProgress: boolean
  fetchSyncStatus: () => Promise<void>
  triggerSync: () => Promise<void>
  refreshAllData: () => Promise<void>
}

export const useDashboardStore = create<DashboardState>((set, get) => ({
  // Time range
  timeRange: 'all',
  setTimeRange: (range) => set({ timeRange: range }),

  // Sessions
  sessions: [],
  sessionsMeta: null,
  sessionsLoading: false,
  sessionStats: null,

  fetchSessions: async (params) => {
    set({ sessionsLoading: true })
    try {
      const result = await sessionsApi.getSessions({
        time_range: get().timeRange,
        ...params,
      })
      set({ sessions: result.data, sessionsMeta: result.meta })
    } catch (error) {
      console.error('Failed to fetch sessions:', error)
    } finally {
      set({ sessionsLoading: false })
    }
  },

  fetchSessionStats: async () => {
    try {
      const stats = await sessionsApi.getSessionStats(get().timeRange)
      set({ sessionStats: stats })
    } catch (error) {
      console.error('Failed to fetch session stats:', error)
    }
  },

  // Conversation
  conversation: null,
  conversationLoading: false,

  fetchConversation: async (sessionId) => {
    set({ conversationLoading: true, conversation: null })
    try {
      const result = await sessionsApi.getConversation(sessionId)
      set({ conversation: result })
    } catch (error) {
      console.error('Failed to fetch conversation:', error)
    } finally {
      set({ conversationLoading: false })
    }
  },

  // Agents
  agents: [],
  agentsLoading: false,
  selectedAgent: null,
  agentDetail: null,
  agentCharts: null,

  setSelectedAgent: (name) => set({ selectedAgent: name }),

  fetchAgents: async () => {
    set({ agentsLoading: true })
    try {
      const result = await agentsApi.getAgents()
      set({ agents: result.data })
    } catch (error) {
      console.error('Failed to fetch agents:', error)
    } finally {
      set({ agentsLoading: false })
    }
  },

  fetchAgentDetail: async (name) => {
    try {
      const [detail, charts] = await Promise.all([
        agentsApi.getAgentDetail(name),
        agentsApi.getAgentCharts(name),
      ])
      set({ agentDetail: detail, agentCharts: charts })
    } catch (error) {
      console.error('Failed to fetch agent detail:', error)
    }
  },

  // Metrics
  dashboardMetrics: null,
  metricsLoading: false,

  fetchDashboardMetrics: async () => {
    set({ metricsLoading: true })
    try {
      const metrics = await metricsApi.getDashboardMetrics(get().timeRange)
      set({ dashboardMetrics: metrics })
    } catch (error) {
      console.error('Failed to fetch dashboard metrics:', error)
    } finally {
      set({ metricsLoading: false })
    }
  },

  // Sync
  syncStatus: null,
  syncInProgress: false,

  fetchSyncStatus: async () => {
    try {
      const status = await syncApi.getSyncStatus()
      set({ syncStatus: status })
      return status
    } catch (error) {
      console.error('Failed to fetch sync status:', error)
      return null
    }
  },

  triggerSync: async () => {
    const { fetchSyncStatus, refreshAllData } = get()
    set({ syncInProgress: true })

    try {
      await syncApi.triggerSync()

      // Poll for sync completion (max 60 seconds)
      const maxAttempts = 30
      for (let i = 0; i < maxAttempts; i++) {
        await new Promise((resolve) => setTimeout(resolve, 2000))
        const status = await syncApi.getSyncStatus()
        set({ syncStatus: status })

        if (status.status === 'idle' || status.status === 'error') {
          break
        }
      }

      // Refresh all data after sync completes
      await refreshAllData()
    } catch (error) {
      console.error('Failed to trigger sync:', error)
    } finally {
      set({ syncInProgress: false })
      fetchSyncStatus()
    }
  },

  refreshAllData: async () => {
    const { fetchSessions, fetchSessionStats, fetchAgents, fetchDashboardMetrics } = get()
    // Refresh all data in parallel
    await Promise.all([
      fetchSessions(),
      fetchSessionStats(),
      fetchAgents(),
      fetchDashboardMetrics(),
    ])
  },
}))
