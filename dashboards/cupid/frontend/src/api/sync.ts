import { fetchApi } from './client'
import type { SyncStatus } from '@/types'

export async function getSyncStatus(): Promise<SyncStatus> {
  return fetchApi('/sync/status')
}

export async function triggerSync(): Promise<{ status: string; message: string }> {
  return fetchApi('/sync/trigger', { method: 'POST' })
}
