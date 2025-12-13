import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Heart, Users, Bot, BarChart3, ArrowRight } from 'lucide-react'
import { useDashboardStore } from '@/store/useDashboardStore'
import KPICard from '@/components/shared/KPICard'
import { formatCost, formatLatency } from '@/lib/format'

export default function HomePage() {
  const { sessionStats, fetchSessionStats, dashboardMetrics, fetchDashboardMetrics } =
    useDashboardStore()

  useEffect(() => {
    fetchSessionStats()
    fetchDashboardMetrics()
  }, [fetchSessionStats, fetchDashboardMetrics])

  const stats = dashboardMetrics?.kpis

  return (
    <div className="p-8">
      {/* Hero */}
      <div className="text-center mb-12">
        <div className="w-20 h-20 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-6">
          <Heart className="w-10 h-10 text-primary" />
        </div>
        <h1 className="text-3xl font-bold mb-2">Cupid Observability</h1>
        <p className="text-muted-foreground max-w-md mx-auto">
          Monitor your AI matchmaking game with real-time tracing and analytics powered by Langfuse.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-4 mb-12">
        <KPICard
          label="Sessions"
          value={stats?.unique_sessions ?? '-'}
          icon={Users}
          iconColor="text-blue-500"
        />
        <KPICard
          label="Traces"
          value={stats?.total_traces ?? '-'}
          icon={BarChart3}
          iconColor="text-green-500"
        />
        <KPICard
          label="Total Cost"
          value={stats ? formatCost(stats.total_cost) : '-'}
          icon={Heart}
          iconColor="text-purple-500"
        />
        <KPICard
          label="Avg Latency"
          value={stats ? formatLatency(stats.avg_latency_seconds) : '-'}
          icon={Bot}
          iconColor="text-pink-500"
        />
      </div>

      {/* Navigation Cards */}
      <div className="grid grid-cols-3 gap-6">
        <Link
          to="/sessions"
          className="bg-card rounded-lg border border-border p-6 hover:border-primary/50 transition-colors group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-lg bg-blue-500/20">
              <Users className="w-6 h-6 text-blue-500" />
            </div>
            <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
          <h2 className="text-lg font-semibold mb-1">Sessions</h2>
          <p className="text-sm text-muted-foreground">
            Browse conversation sessions and view full transcripts
          </p>
        </Link>

        <Link
          to="/agents"
          className="bg-card rounded-lg border border-border p-6 hover:border-primary/50 transition-colors group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-lg bg-green-500/20">
              <Bot className="w-6 h-6 text-green-500" />
            </div>
            <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
          <h2 className="text-lg font-semibold mb-1">Agents</h2>
          <p className="text-sm text-muted-foreground">
            Analyze performance metrics for all 12 Cupid agents
          </p>
        </Link>

        <Link
          to="/metrics"
          className="bg-card rounded-lg border border-border p-6 hover:border-primary/50 transition-colors group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-lg bg-purple-500/20">
              <BarChart3 className="w-6 h-6 text-purple-500" />
            </div>
            <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
          <h2 className="text-lg font-semibold mb-1">Metrics</h2>
          <p className="text-sm text-muted-foreground">
            View aggregate analytics and cost breakdowns
          </p>
        </Link>
      </div>
    </div>
  )
}
