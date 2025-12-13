import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Users, DollarSign, Clock, Timer, Search, RefreshCw, ChevronDown, ChevronRight, Eye } from 'lucide-react'
import { useDashboardStore } from '@/store/useDashboardStore'
import KPICard from '@/components/shared/KPICard'
import Badge from '@/components/shared/Badge'
import TimeRangeSelector from '@/components/shared/TimeRangeSelector'
import { formatCost, formatLatency, formatDuration, formatRelativeTime } from '@/lib/format'
import { CHAPTER_NAMES } from '@/lib/constants'
import { cn } from '@/lib/utils'
import type { Session } from '@/types'

function SessionRow({ session }: { session: Session }) {
  const [expanded, setExpanded] = useState(false)

  const progressLabel = session.is_complete
    ? 'Complete'
    : session.max_chapter >= 0
    ? `${CHAPTER_NAMES[session.max_chapter] || `Chapter ${session.max_chapter}`}`
    : 'Just Started'

  return (
    <>
      <tr
        className="border-b border-border hover:bg-muted/50 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <td className="px-4 py-3">
          <button className="p-1">
            {expanded ? (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
        </td>
        <td className="px-4 py-3">
          <span className="font-mono text-sm text-pink-400">{session.id}</span>
        </td>
        <td className="px-4 py-3">
          <Badge variant={session.is_complete ? 'success' : 'warning'}>
            {progressLabel}
          </Badge>
        </td>
        <td className="px-4 py-3 text-sm">
          {session.mortal_name && session.match_name ? (
            <span>
              {session.mortal_name} <span className="text-muted-foreground">&</span>{' '}
              {session.match_name}
            </span>
          ) : (
            <span className="text-muted-foreground">-</span>
          )}
        </td>
        <td className="px-4 py-3 text-sm text-muted-foreground">
          {formatDuration(session.duration_seconds)}
        </td>
        <td className="px-4 py-3">
          <Link
            to={`/sessions/${session.id}`}
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 px-3 py-1 bg-primary/20 text-primary rounded text-sm hover:bg-primary/30 transition-colors"
          >
            <Eye className="w-3 h-3" />
            View
          </Link>
        </td>
      </tr>
      {expanded && (
        <tr className="bg-muted/30">
          <td colSpan={6} className="px-4 py-3">
            <div className="grid grid-cols-5 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Total Cost</p>
                <p className="font-medium">{formatCost(session.total_cost)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Avg Latency</p>
                <p className="font-medium">{formatLatency(session.avg_latency)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">First Seen</p>
                <p className="font-medium">{formatRelativeTime(session.first_trace_at)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Last Active</p>
                <p className="font-medium">{formatRelativeTime(session.last_trace_at)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Traces</p>
                <p className="font-medium">{session.trace_count}</p>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

export default function SessionsPage() {
  const {
    sessions,
    sessionsLoading,
    sessionStats,
    timeRange,
    setTimeRange,
    fetchSessions,
    fetchSessionStats,
  } = useDashboardStore()

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<'all' | 'complete' | 'incomplete'>('all')

  useEffect(() => {
    fetchSessions({ search, status })
    fetchSessionStats()
  }, [fetchSessions, fetchSessionStats, timeRange, search, status])

  const handleRefresh = () => {
    fetchSessions({ search, status })
    fetchSessionStats()
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Sessions</h1>
          <p className="text-muted-foreground">Browse and analyze conversation sessions</p>
        </div>
        <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by session ID or character name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-muted rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as typeof status)}
          className="px-4 py-2 bg-muted rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="all">All Status</option>
          <option value="complete">Complete</option>
          <option value="incomplete">Incomplete</option>
        </select>
        <button
          onClick={handleRefresh}
          disabled={sessionsLoading}
          className="p-2 bg-muted rounded-lg hover:bg-muted/80 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={cn('w-4 h-4', sessionsLoading && 'animate-spin')} />
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <KPICard
          label="Sessions"
          value={sessionStats?.total_sessions ?? '-'}
          icon={Users}
          iconColor="text-blue-500"
        />
        <KPICard
          label="Total Cost"
          value={sessionStats ? formatCost(sessionStats.total_cost) : '-'}
          icon={DollarSign}
          iconColor="text-green-500"
        />
        <KPICard
          label="Avg Duration"
          value={sessionStats ? formatDuration(sessionStats.avg_duration_seconds) : '-'}
          icon={Clock}
          iconColor="text-purple-500"
        />
        <KPICard
          label="Avg Latency"
          value={sessionStats ? formatLatency(sessionStats.avg_latency_seconds) : '-'}
          icon={Timer}
          iconColor="text-pink-500"
        />
      </div>

      {/* Table */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="w-10 px-4 py-3"></th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Session ID
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Characters
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Duration
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {sessionsLoading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  Loading sessions...
                </td>
              </tr>
            ) : sessions.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  No sessions found
                </td>
              </tr>
            ) : (
              sessions.map((session) => <SessionRow key={session.id} session={session} />)
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
