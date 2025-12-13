import { useEffect } from 'react'
import { Bot, Clock, DollarSign, Hash, CheckCircle } from 'lucide-react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { useDashboardStore } from '@/store/useDashboardStore'
import Badge from '@/components/shared/Badge'
import { formatCost, formatLatencyMs, formatTokens, formatRelativeTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import { AGENT_ORDER } from '@/lib/constants'

const categoryColors: Record<string, string> = {
  routing: 'text-yellow-500',
  control: 'text-blue-500',
  content: 'text-purple-500',
  ui: 'text-green-500',
}

export default function AgentsPage() {
  const {
    agents,
    agentsLoading,
    selectedAgent,
    agentDetail,
    agentCharts,
    setSelectedAgent,
    fetchAgents,
    fetchAgentDetail,
  } = useDashboardStore()

  useEffect(() => {
    fetchAgents()
  }, [fetchAgents])

  useEffect(() => {
    if (selectedAgent) {
      fetchAgentDetail(selectedAgent)
    }
  }, [selectedAgent, fetchAgentDetail])

  // Sort agents by game flow order
  const sortedAgents = [...agents].sort((a, b) => {
    const aIndex = AGENT_ORDER.indexOf(a.name)
    const bIndex = AGENT_ORDER.indexOf(b.name)
    if (aIndex === -1 && bIndex === -1) return a.name.localeCompare(b.name)
    if (aIndex === -1) return 1
    if (bIndex === -1) return -1
    return aIndex - bIndex
  })

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Agents</h1>
        <p className="text-muted-foreground">Performance analytics for Cupid's 12 sub-agents</p>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Agent Grid */}
        <div className="col-span-2">
          {agentsLoading ? (
            <div className="grid grid-cols-2 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-32 bg-muted rounded-lg animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {sortedAgents.map((agent) => (
                <button
                  key={agent.name}
                  onClick={() => setSelectedAgent(agent.name)}
                  className={cn(
                    'bg-card rounded-lg border p-4 text-left transition-colors',
                    selectedAgent === agent.name
                      ? 'border-primary'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Bot className={cn('w-5 h-5', categoryColors[agent.category] || 'text-muted-foreground')} />
                      <span className="font-medium">{agent.name}</span>
                    </div>
                    <Badge variant="default">{agent.execution_count} runs</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-muted-foreground">Avg Latency</p>
                      <p className="font-medium">{formatLatencyMs(agent.avg_latency_ms)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Total Cost</p>
                      <p className="font-medium">{formatCost(agent.total_cost)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Tokens</p>
                      <p className="font-medium">{formatTokens(agent.total_tokens)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Success Rate</p>
                      <p className="font-medium">{agent.success_rate.toFixed(0)}%</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Detail Panel */}
        <div>
          {selectedAgent && agentDetail ? (
            <div className="bg-card rounded-lg border border-border p-4 sticky top-8">
              <h2 className="text-lg font-semibold mb-4">{agentDetail.name}</h2>

              {/* Charts */}
              {agentCharts && (
                <>
                  <div className="mb-4">
                    <p className="text-xs text-muted-foreground mb-2">Latency Over Time</p>
                    <div className="h-32">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={agentCharts.latency_over_time}>
                          <XAxis dataKey="timestamp" tick={false} />
                          <YAxis tick={{ fontSize: 10 }} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                            }}
                            formatter={(value: number) => [formatLatencyMs(value), 'Latency']}
                          />
                          <Line
                            type="monotone"
                            dataKey="latency_ms"
                            stroke="hsl(var(--primary))"
                            strokeWidth={2}
                            dot={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="mb-4">
                    <p className="text-xs text-muted-foreground mb-2">Executions by Hour</p>
                    <div className="h-32">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={agentCharts.executions_by_hour}>
                          <XAxis dataKey="hour" tick={{ fontSize: 10 }} />
                          <YAxis tick={{ fontSize: 10 }} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                            }}
                          />
                          <Bar dataKey="count" fill="hsl(var(--primary))" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </>
              )}

              {/* Recent Executions */}
              <div>
                <p className="text-xs text-muted-foreground mb-2">Recent Executions</p>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {agentDetail.recent_executions.map((exec, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between text-xs p-2 bg-muted/50 rounded"
                    >
                      <div className="flex items-center gap-2">
                        {exec.status === 'success' ? (
                          <CheckCircle className="w-3 h-3 text-green-500" />
                        ) : (
                          <CheckCircle className="w-3 h-3 text-red-500" />
                        )}
                        <span className="font-mono text-muted-foreground">
                          {exec.trace_id.slice(0, 8)}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-muted-foreground">
                        <span>{formatLatencyMs(exec.latency_ms)}</span>
                        <span>{formatCost(exec.cost)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-card rounded-lg border border-border p-8 text-center text-muted-foreground">
              <Bot className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Select an agent to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
