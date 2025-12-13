import { useEffect, useState } from 'react'
import { Bot } from 'lucide-react'
import { useDashboardStore } from '@/store/useDashboardStore'
import { formatCost, formatLatencyMs, formatTokens } from '@/lib/format'
import { cn } from '@/lib/utils'
import { AGENT_ORDER } from '@/lib/constants'

const categoryColors: Record<string, string> = {
  routing: 'text-yellow-500',
  content: 'text-purple-500',
  ui: 'text-green-500',
  meta: 'text-pink-500',
}

const categoryBgColors: Record<string, string> = {
  routing: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  content: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  ui: 'bg-green-500/20 text-green-400 border-green-500/30',
  meta: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
}

const categoryDotColors: Record<string, string> = {
  routing: 'bg-yellow-500',
  content: 'bg-purple-500',
  ui: 'bg-green-500',
  meta: 'bg-pink-500',
}

const CATEGORIES = ['routing', 'content', 'ui', 'meta'] as const

export default function AgentsPage() {
  const { agents, agentsLoading, fetchAgents } = useDashboardStore()
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)

  useEffect(() => {
    fetchAgents()
  }, [fetchAgents])

  // Filter agents by category
  const filteredAgents = categoryFilter
    ? agents.filter((a) => a.category === categoryFilter)
    : agents

  // Sort agents by game flow order
  const sortedAgents = [...filteredAgents].sort((a, b) => {
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

      {/* Category Filter */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setCategoryFilter(null)}
          className={cn(
            'px-3 py-1.5 rounded-full text-sm font-medium transition-colors border',
            categoryFilter === null
              ? 'bg-foreground/10 text-foreground border-foreground/20'
              : 'bg-muted/50 text-muted-foreground border-transparent hover:bg-muted'
          )}
        >
          All
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            className={cn(
              'px-3 py-1.5 rounded-full text-sm font-medium transition-colors border flex items-center gap-2',
              categoryFilter === cat
                ? categoryBgColors[cat]
                : 'bg-muted/50 text-muted-foreground border-transparent hover:bg-muted'
            )}
          >
            <span className={cn('w-2 h-2 rounded-full', categoryDotColors[cat])} />
            {cat === 'ui' ? 'UI' : cat.charAt(0).toUpperCase() + cat.slice(1)}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Agent
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Tokens
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Total Cost
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Avg Latency
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Success Rate
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Runs
              </th>
            </tr>
          </thead>
          <tbody>
            {agentsLoading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  Loading agents...
                </td>
              </tr>
            ) : sortedAgents.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  No agents found
                </td>
              </tr>
            ) : (
              sortedAgents.map((agent) => (
                <tr key={agent.name} className="border-b border-border hover:bg-muted/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Bot className={cn('w-4 h-4', categoryColors[agent.category] || 'text-muted-foreground')} />
                      <span className="font-medium text-sm">{agent.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {formatTokens(agent.total_tokens)}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {formatCost(agent.total_cost)}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {formatLatencyMs(agent.avg_latency_ms)}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {agent.success_rate.toFixed(0)}%
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {agent.execution_count}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
