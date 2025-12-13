import { useEffect } from 'react'
import { Users, Activity, DollarSign, Clock, TrendingUp } from 'lucide-react'
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { useDashboardStore } from '@/store/useDashboardStore'
import KPICard from '@/components/shared/KPICard'
import TimeRangeSelector from '@/components/shared/TimeRangeSelector'
import { formatCost, formatLatency, formatDate } from '@/lib/format'

const CHART_COLORS = [
  'hsl(262, 80%, 50%)', // primary
  'hsl(220, 70%, 50%)', // blue
  'hsl(142, 70%, 45%)', // green
  'hsl(47, 90%, 50%)',  // yellow
  'hsl(350, 70%, 50%)', // pink
  'hsl(25, 90%, 50%)',  // orange
  'hsl(180, 70%, 45%)', // cyan
]

export default function MetricsPage() {
  const {
    dashboardMetrics,
    metricsLoading,
    timeRange,
    setTimeRange,
    fetchDashboardMetrics,
  } = useDashboardStore()

  useEffect(() => {
    fetchDashboardMetrics()
  }, [fetchDashboardMetrics, timeRange])

  const kpis = dashboardMetrics?.kpis

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Metrics</h1>
          <p className="text-muted-foreground">Aggregate analytics and cost breakdowns</p>
        </div>
        <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-5 gap-4 mb-8">
        <KPICard
          label="Unique Sessions"
          value={kpis?.unique_sessions ?? '-'}
          icon={Users}
          iconColor="text-blue-500"
        />
        <KPICard
          label="Total Traces"
          value={kpis?.total_traces ?? '-'}
          icon={Activity}
          iconColor="text-green-500"
        />
        <KPICard
          label="Total Cost"
          value={kpis ? formatCost(kpis.total_cost) : '-'}
          icon={DollarSign}
          iconColor="text-purple-500"
        />
        <KPICard
          label="Avg Latency"
          value={kpis ? formatLatency(kpis.avg_latency_seconds) : '-'}
          icon={Clock}
          iconColor="text-pink-500"
        />
        <KPICard
          label="Cost per Session"
          value={kpis ? formatCost(kpis.cost_per_session) : '-'}
          icon={TrendingUp}
          iconColor="text-yellow-500"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-6">
        {/* Cost by Chapter */}
        <div className="bg-card rounded-lg border border-border p-6">
          <h2 className="text-lg font-semibold mb-4">Cost by Chapter</h2>
          {metricsLoading ? (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              Loading...
            </div>
          ) : dashboardMetrics?.cost_by_chapter && dashboardMetrics.cost_by_chapter.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dashboardMetrics.cost_by_chapter}
                    dataKey="cost"
                    nameKey="chapter"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ chapter, cost }) => `${chapter}: ${formatCost(cost)}`}
                    labelLine={false}
                  >
                    {dashboardMetrics.cost_by_chapter.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={CHART_COLORS[index % CHART_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                    }}
                    formatter={(value: number) => formatCost(value)}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              No data available
            </div>
          )}
        </div>

        {/* Traces per Day */}
        <div className="bg-card rounded-lg border border-border p-6">
          <h2 className="text-lg font-semibold mb-4">Traces per Day</h2>
          {metricsLoading ? (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              Loading...
            </div>
          ) : dashboardMetrics?.traces_per_day && dashboardMetrics.traces_per_day.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dashboardMetrics.traces_per_day}>
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(value) => formatDate(value)}
                  />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                    }}
                    labelFormatter={(value) => formatDate(value)}
                  />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              No data available
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
