import { NavLink } from 'react-router-dom'
import { Heart, Users, Bot, BarChart3, ExternalLink, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useDashboardStore } from '@/store/useDashboardStore'
import { useEffect } from 'react'
import { formatRelativeTime } from '@/lib/format'

const navItems = [
  { to: '/sessions', icon: Users, label: 'Sessions' },
  { to: '/agents', icon: Bot, label: 'Agents' },
  { to: '/metrics', icon: BarChart3, label: 'Metrics' },
]

export default function Sidebar() {
  const { syncStatus, syncInProgress, fetchSyncStatus, triggerSync } = useDashboardStore()

  useEffect(() => {
    fetchSyncStatus()
    const interval = setInterval(fetchSyncStatus, 30000)
    return () => clearInterval(interval)
  }, [fetchSyncStatus])

  return (
    <aside className="w-60 bg-card border-r border-border flex flex-col h-screen fixed left-0 top-0">
      {/* Logo */}
      <NavLink to="/" className="p-6 flex items-center gap-3 hover:bg-muted/50 transition-colors">
        <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
          <Heart className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="font-semibold text-lg">Cupid</h1>
          <p className="text-xs text-muted-foreground">Dashboard</p>
        </div>
      </NavLink>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2">
        <p className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Observability
        </p>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                isActive
                  ? 'bg-primary/20 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )
            }
          >
            <item.icon className="w-4 h-4" />
            {item.label}
          </NavLink>
        ))}

        <p className="px-3 py-2 mt-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
          External
        </p>
        <a
          href="https://us.cloud.langfuse.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
          Langfuse Console
        </a>
      </nav>

      {/* Sync Status */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground">Sync Status</span>
          <button
            onClick={triggerSync}
            disabled={syncInProgress || syncStatus?.status === 'running'}
            className="p-1 rounded hover:bg-muted disabled:opacity-50"
            title={syncInProgress ? 'Syncing and refreshing data...' : 'Trigger manual sync'}
          >
            <RefreshCw
              className={cn(
                'w-3 h-3 text-muted-foreground',
                (syncInProgress || syncStatus?.status === 'running') && 'animate-spin'
              )}
            />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <div
            className={cn(
              'w-2 h-2 rounded-full',
              syncInProgress && 'bg-yellow-500',
              !syncInProgress && syncStatus?.status === 'idle' && 'bg-green-500',
              !syncInProgress && syncStatus?.status === 'running' && 'bg-yellow-500',
              !syncInProgress && syncStatus?.status === 'error' && 'bg-red-500',
              !syncStatus && !syncInProgress && 'bg-gray-500'
            )}
          />
          <span className="text-xs text-muted-foreground">
            {syncInProgress
              ? 'Syncing...'
              : syncStatus?.last_sync_at
                ? formatRelativeTime(syncStatus.last_sync_at)
                : 'Never synced'}
          </span>
        </div>
      </div>
    </aside>
  )
}
