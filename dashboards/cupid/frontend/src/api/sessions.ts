import { fetchApi } from './client'
import type { Session, SessionStats, ConversationResponse, TimeRange } from '@/types'

interface SessionsResponse {
  data: Session[]
  meta: {
    total: number
    page: number
    limit: number
    pages: number
  }
}

export async function getSessions(params: {
  time_range?: TimeRange
  status?: 'complete' | 'incomplete' | 'all'
  search?: string
  page?: number
  limit?: number
}): Promise<SessionsResponse> {
  const searchParams = new URLSearchParams()
  if (params.time_range) searchParams.set('time_range', params.time_range)
  if (params.status) searchParams.set('status', params.status)
  if (params.search) searchParams.set('search', params.search)
  if (params.page) searchParams.set('page', params.page.toString())
  if (params.limit) searchParams.set('limit', params.limit.toString())

  return fetchApi(`/sessions?${searchParams}`)
}

export async function getSessionStats(time_range?: TimeRange): Promise<SessionStats> {
  const searchParams = new URLSearchParams()
  if (time_range) searchParams.set('time_range', time_range)
  return fetchApi(`/sessions/stats?${searchParams}`)
}

export async function getConversation(sessionId: string): Promise<ConversationResponse> {
  return fetchApi(`/sessions/${sessionId}/conversation`)
}
