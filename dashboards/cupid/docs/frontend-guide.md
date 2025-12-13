# Frontend Guide

The Cupid Dashboard frontend is a React application built with TypeScript, Tailwind CSS, and modern tooling.

## Tech Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| Framework | React 19 | UI framework |
| Language | TypeScript 5.4 | Type safety |
| Build | Vite 6 | Fast build tool |
| Styling | Tailwind CSS 3.4 | Utility-first CSS |
| State | Zustand | Lightweight state management |
| Charts | Recharts | Data visualization |
| Routing | React Router 7 | Client-side routing |
| Icons | Lucide React | Icon library |

## Project Structure

```
frontend/
├── Dockerfile
├── nginx.conf
├── package.json
├── vite.config.ts
├── tailwind.config.ts
├── index.html
└── src/
    ├── main.tsx              # React entry point
    ├── index.css             # Global styles + Tailwind
    ├── App.tsx               # Routes definition
    ├── types/
    │   └── index.ts          # TypeScript interfaces
    ├── api/
    │   ├── client.ts         # Base fetch wrapper
    │   ├── sessions.ts       # Sessions API
    │   ├── agents.ts         # Agents API
    │   ├── metrics.ts        # Metrics API
    │   └── sync.ts           # Sync API
    ├── store/
    │   └── useDashboardStore.ts  # Zustand store
    ├── lib/
    │   ├── constants.ts      # Agent/chapter constants
    │   ├── format.ts         # Formatting utilities
    │   └── utils.ts          # Tailwind class merger
    ├── components/
    │   ├── layout/
    │   │   ├── Layout.tsx    # Main layout wrapper
    │   │   └── Sidebar.tsx   # Navigation sidebar
    │   └── shared/
    │       ├── KPICard.tsx   # Metric display card
    │       ├── Badge.tsx     # Status badge
    │       └── TimeRangeSelector.tsx
    └── pages/
        ├── HomePage.tsx
        ├── SessionsPage.tsx
        ├── ConversationPage.tsx
        ├── AgentsPage.tsx
        └── MetricsPage.tsx
```

---

## Routing

### Route Configuration (`App.tsx`)

```tsx
<Routes>
  <Route path="/" element={<Layout />}>
    <Route index element={<HomePage />} />
    <Route path="sessions" element={<SessionsPage />} />
    <Route path="sessions/:id" element={<ConversationPage />} />
    <Route path="agents" element={<AgentsPage />} />
    <Route path="metrics" element={<MetricsPage />} />
  </Route>
</Routes>
```

| Path | Page | Description |
|------|------|-------------|
| `/` | HomePage | Dashboard overview with KPIs |
| `/sessions` | SessionsPage | Session list with filtering |
| `/sessions/:id` | ConversationPage | Full conversation transcript |
| `/agents` | AgentsPage | Agent performance analytics |
| `/metrics` | MetricsPage | Aggregate metrics and charts |

---

## Pages

### HomePage

Dashboard landing page with overview metrics.

**Features:**
- Hero section with Cupid branding
- 4 KPI cards: Sessions, Traces, Total Cost, Avg Latency
- Navigation cards to other pages

**Data Fetched:**
- `sessionStats` - Session aggregates
- `dashboardMetrics` - KPI data

### SessionsPage

Browse and filter game sessions.

**Features:**
- Expandable session table
- Search by session ID or character name
- Status filter (All/Complete/Incomplete)
- Time range selector
- KPI cards: Sessions, Cost, Avg Duration, Avg Latency
- "View" button links to conversation

**Table Columns:**
- Session ID (truncated)
- Status badge (Complete/Chapter reached)
- Characters (Mortal → Match)
- Duration
- Actions (expand, view)

**Expanded Row Shows:**
- Total Cost
- Avg Latency
- First/Last Seen
- Trace Count

### ConversationPage

Full conversation transcript for a session.

**Features:**
- Back navigation
- Session header card with summary
- Chapter dividers
- Message cards (user/agent)
- Expandable message details
- Markdown rendering for agent responses

**Message Card Shows:**
- Type icon (user/agent)
- Agent name or "User"
- Timestamp
- Content
- Latency and cost (agents)

**Expanded Details:**
- Total tokens
- Prompt tokens
- Completion tokens
- Model name

### AgentsPage

Agent performance analytics with detail panel.

**Features:**
- 2-column layout (grid + detail panel)
- Agent cards sorted by game flow order
- Category color coding
- Selectable agents
- Sticky detail panel

**Agent Card Shows:**
- Name and category icon
- Execution count
- Avg latency
- Total cost
- Total tokens
- Success rate

**Detail Panel Shows:**
- Line chart: Latency over time
- Bar chart: Executions by hour
- Recent executions table

### MetricsPage

Aggregate analytics and visualizations.

**Features:**
- Time range selector
- 5 KPI cards
- Pie chart: Cost by chapter
- Bar chart: Traces per day (last 7 days)

---

## Components

### Layout Components

#### Layout (`components/layout/Layout.tsx`)

Main layout wrapper with sidebar.

```tsx
<div className="flex h-screen bg-background">
  <Sidebar />
  <main className="flex-1 overflow-auto p-6">
    <Outlet />
  </main>
</div>
```

#### Sidebar (`components/layout/Sidebar.tsx`)

Fixed navigation sidebar (240px width).

**Sections:**
- Logo: Heart icon + "Cupid Dashboard"
- Navigation: Sessions, Agents, Metrics
- External: Link to Langfuse Console
- Sync Status: Last sync time + refresh button

### Shared Components

#### KPICard (`components/shared/KPICard.tsx`)

Metric display card with icon.

```tsx
<KPICard
  label="Total Cost"
  value="$67.50"
  icon={DollarSign}
  iconColor="text-green-500"
  subtext="All time"
/>
```

#### Badge (`components/shared/Badge.tsx`)

Status indicator with variants.

```tsx
<Badge variant="success">Complete</Badge>
<Badge variant="warning">Chapter 3</Badge>
<Badge variant="error">Error</Badge>
```

**Variants:** `default`, `success`, `warning`, `error`, `info`

#### TimeRangeSelector (`components/shared/TimeRangeSelector.tsx`)

Button group for time range filtering.

```tsx
<TimeRangeSelector />
```

Options: 24h, 7d, 30d, All

---

## State Management

### Zustand Store (`store/useDashboardStore.ts`)

Centralized state with API calls.

```typescript
interface DashboardStore {
  // Global
  timeRange: TimeRange
  setTimeRange: (range: TimeRange) => void

  // Sessions
  sessions: Session[]
  sessionsMeta: PaginationMeta
  sessionStats: SessionStats | null
  fetchSessions: (params) => Promise<void>
  fetchSessionStats: () => Promise<void>

  // Conversation
  conversation: ConversationResponse | null
  fetchConversation: (sessionId: string) => Promise<void>

  // Agents
  agents: AgentStats[]
  selectedAgent: string | null
  agentDetail: AgentDetail | null
  agentCharts: AgentChartData | null
  fetchAgents: () => Promise<void>
  fetchAgentDetail: (name: string) => Promise<void>
  setSelectedAgent: (name: string | null) => void

  // Metrics
  dashboardMetrics: DashboardMetrics | null
  fetchDashboardMetrics: () => Promise<void>

  // Sync
  syncStatus: SyncStatus | null
  syncInProgress: boolean
  fetchSyncStatus: () => Promise<void>
  triggerSync: () => Promise<void>
  refreshAllData: () => Promise<void>
}
```

### Usage in Components

```tsx
function SessionsPage() {
  const { sessions, fetchSessions, timeRange } = useDashboardStore()

  useEffect(() => {
    fetchSessions({ time_range: timeRange })
  }, [timeRange])
}
```

### Manual Sync with Auto-Refresh

When `triggerSync()` is called:

1. Sets `syncInProgress = true`
2. Triggers backend sync via `POST /api/sync/trigger`
3. Polls sync status every 2 seconds (max 60 seconds)
4. When sync completes, calls `refreshAllData()`
5. Sets `syncInProgress = false`

The `refreshAllData()` function fetches all cached data in parallel:
- Sessions and session stats
- Agents list
- Dashboard metrics

This ensures the UI automatically updates after a manual sync without requiring a browser refresh.

---

## API Client

### Base Client (`api/client.ts`)

```typescript
async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`/api${endpoint}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  })
  if (!response.ok) throw new Error(...)
  return response.json()
}
```

### API Modules

```typescript
// api/sessions.ts
getSessions(params) → SessionsResponse
getSessionStats(timeRange) → SessionStats
getConversation(sessionId) → ConversationResponse

// api/agents.ts
getAgents() → AgentsResponse
getAgentDetail(name) → AgentDetail
getAgentCharts(name) → AgentChartData

// api/metrics.ts
getDashboardMetrics(timeRange) → DashboardMetrics

// api/sync.ts
getSyncStatus() → SyncStatus
triggerSync() → { status, message }
```

---

## Types (`types/index.ts`)

### Session Types

```typescript
interface Session {
  id: string
  created_at: string
  trace_count: number
  total_cost: number
  avg_latency: number
  mortal_name: string | null
  match_name: string | null
  max_chapter: number
  is_complete: boolean
  first_trace_at: string | null
  last_trace_at: string | null
  duration_seconds: number
}

interface SessionStats {
  total_sessions: number
  total_cost: number
  avg_duration_seconds: number
  avg_latency_seconds: number
  complete_sessions: number
  incomplete_sessions: number
}
```

### Agent Types

```typescript
interface AgentStats {
  name: string
  category: string
  execution_count: number
  avg_latency_ms: number
  total_cost: number
  total_tokens: number
  success_rate: number
}

interface AgentDetail {
  name: string
  category: string
  stats: AgentStats
  recent_executions: AgentExecution[]
}
```

### Conversation Types

```typescript
interface ConversationMessage {
  type: "user" | "agent"
  timestamp: string
  chapter: string | null
  agent: string | null
  content: string
  metadata: MessageMetadata | null
}

interface MessageMetadata {
  latency_ms: number
  cost: number
  total_tokens: number
  prompt_tokens: number
  completion_tokens: number
  model: string
}
```

---

## Utilities

### Format Functions (`lib/format.ts`)

```typescript
formatCost(0.0045)        → "$0.0045"
formatLatency(8.5)        → "8.5s"
formatLatencyMs(500)      → "500ms"
formatTokens(15000)       → "15K"
formatRelativeTime(iso)   → "5m ago"
formatDuration(2700)      → "45m 0s"
formatDate(iso)           → "Dec 10, 2025"
```

### Class Merger (`lib/utils.ts`)

```typescript
import { cn } from "@/lib/utils"

cn("px-4 py-2", isActive && "bg-blue-500")
```

### Constants (`lib/constants.ts`)

```typescript
AGENT_CATEGORIES = {
  "HasEnded": "routing",
  "Mortal": "content",
  // ...
}

CHAPTER_NAMES = {
  0: "Introduction",
  1: "Meet the Mortal",
  // ...
}

AGENT_ORDER = [
  "HasEnded",
  "StartCupidGame",
  // ... (game flow order)
]
```

---

## Styling

### Tailwind Configuration

```typescript
// tailwind.config.ts
export default {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        // ...
      }
    }
  }
}
```

### CSS Variables (`index.css`)

```css
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --card: 0 0% 100%;
  --muted: 210 40% 96%;
  /* ... */
}

.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  /* ... */
}
```

---

## Local Development

### Without Docker

```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
# → http://localhost:5173
```

### With Docker

```bash
cd dashboards/cupid
docker compose up -d frontend
```

### Vite Proxy

Development server proxies `/api` to backend:

```typescript
// vite.config.ts
export default defineConfig({
  server: {
    proxy: {
      "/api": "http://localhost:8080"
    }
  }
})
```

---

## Build & Production

### Build Command

```bash
npm run build
# Output: dist/
```

### Production Serving

The Dockerfile builds and serves via Nginx:

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
```

---

## Dependencies

From `package.json`:

```json
{
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-router-dom": "^7.0.0",
    "zustand": "^5.0.0",
    "recharts": "^2.13.0",
    "lucide-react": "^0.460.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.5.0"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "vite": "^6.0.0",
    "tailwindcss": "^3.4.0",
    "@types/react": "^18.3.0"
  }
}
```
