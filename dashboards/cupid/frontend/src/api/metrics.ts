import { fetchApi } from './client'
import type { DashboardMetrics, TimeRange } from '@/types'

export async function getDashboardMetrics(time_range?: TimeRange): Promise<DashboardMetrics> {
  const searchParams = new URLSearchParams()
  if (time_range) searchParams.set('time_range', time_range)
  return fetchApi(`/metrics/dashboard?${searchParams}`)
}
