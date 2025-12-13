export function formatCost(cost: number | null | undefined): string {
  if (cost === null || cost === undefined) return '-'
  return `$${cost.toFixed(4)}`
}

export function formatLatency(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined) return '-'
  if (seconds >= 1) {
    return `${seconds.toFixed(2)}s`
  }
  return `${(seconds * 1000).toFixed(0)}ms`
}

export function formatLatencyMs(ms: number | null | undefined): string {
  if (ms === null || ms === undefined) return '-'
  if (ms >= 1000) {
    return `${(ms / 1000).toFixed(2)}s`
  }
  return `${ms.toFixed(0)}ms`
}

export function formatTokens(tokens: number | null | undefined): string {
  if (tokens === null || tokens === undefined) return '-'
  if (tokens >= 1000) {
    return `${(tokens / 1000).toFixed(1)}K`
  }
  return tokens.toString()
}

export function formatRelativeTime(timestamp: string | null | undefined): string {
  if (!timestamp) return '-'
  const now = new Date()
  const date = new Date(timestamp)
  const diff = now.getTime() - date.getTime()

  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString()
}

export function formatDuration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined) return '-'
  const minutes = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)

  if (minutes > 0) {
    return `${minutes}m ${secs}s`
  }
  return `${secs}s`
}

export function formatDate(timestamp: string | null | undefined): string {
  if (!timestamp) return '-'
  const date = new Date(timestamp)
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}
