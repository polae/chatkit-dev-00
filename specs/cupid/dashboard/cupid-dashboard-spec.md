# Cupid Observability Dashboard - Full Specification

## Overview

Build a Langfuse-powered observability dashboard for the Cupid AI matchmaking game.

**Target Location:** `/Users/johnsteven/GITHUB/CHATKIT/chatkit-dev-00/dashboards/cupid`

**Tech Stack:**
| Layer | Technology |
|-------|------------|
| Frontend | React 19, TypeScript, Vite, TailwindCSS, shadcn/ui, Zustand, Recharts, react-markdown |
| Backend | Python 3.11+, FastAPI, aiosqlite, APScheduler, httpx |
| Database | SQLite (local file, synced from Langfuse) |
| Infrastructure | Docker Compose, Caddy reverse proxy |

---

## Project Structure

```
dashboards/cupid/
├── docker-compose.yml          # 3 services: backend, frontend, caddy
├── Caddyfile                   # Reverse proxy routing
├── .env.example                # Environment template
├── .env                        # Actual env vars (gitignored)
├── README.md                   # Setup and usage docs
│
├── backend/
│   ├── Dockerfile
│   ├── pyproject.toml          # Python dependencies (uv)
│   └── app/
│       ├── __init__.py
│       ├── main.py             # FastAPI app + lifespan (scheduler init)
│       ├── config.py           # Pydantic Settings for env vars
│       │
│       ├── database/
│       │   ├── __init__.py
│       │   ├── connection.py   # aiosqlite connection manager
│       │   └── schema.py       # CREATE TABLE statements + migrations
│       │
│       ├── services/
│       │   ├── __init__.py
│       │   ├── langfuse_client.py   # Async Langfuse API client
│       │   ├── sync_service.py      # Background sync job
│       │   └── analytics_service.py # Aggregation queries
│       │
│       ├── models/
│       │   ├── __init__.py
│       │   ├── session.py      # Session Pydantic models
│       │   ├── trace.py        # Trace Pydantic models
│       │   ├── observation.py  # Observation Pydantic models
│       │   ├── agent.py        # AgentStats Pydantic models
│       │   └── metrics.py      # Dashboard metrics models
│       │
│       └── routers/
│           ├── __init__.py
│           ├── sessions.py     # /api/sessions endpoints
│           ├── agents.py       # /api/agents endpoints
│           ├── metrics.py      # /api/metrics endpoints
│           └── sync.py         # /api/sync endpoints
│
├── frontend/
│   ├── Dockerfile              # Multi-stage: node build -> nginx
│   ├── nginx.conf              # SPA routing config
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   ├── postcss.config.js
│   ├── components.json         # shadcn/ui config
│   ├── index.html
│   │
│   └── src/
│       ├── main.tsx
│       ├── App.tsx             # Router setup
│       ├── index.css           # Tailwind imports + dark theme vars
│       │
│       ├── components/
│       │   ├── ui/             # shadcn/ui components
│       │   │   ├── button.tsx
│       │   │   ├── card.tsx
│       │   │   ├── table.tsx
│       │   │   ├── badge.tsx
│       │   │   └── ...
│       │   │
│       │   ├── layout/
│       │   │   ├── Sidebar.tsx
│       │   │   ├── Layout.tsx
│       │   │   └── PageHeader.tsx
│       │   │
│       │   ├── shared/
│       │   │   ├── KPICard.tsx
│       │   │   ├── TimeRangeSelector.tsx
│       │   │   └── ChartCard.tsx
│       │   │
│       │   ├── sessions/
│       │   │   ├── SessionsTable.tsx
│       │   │   ├── SessionRow.tsx
│       │   │   └── SessionFilters.tsx
│       │   │
│       │   ├── conversation/
│       │   │   ├── ConversationHeader.tsx
│       │   │   ├── MessageCard.tsx
│       │   │   ├── ChapterDivider.tsx
│       │   │   └── MessageList.tsx
│       │   │
│       │   ├── agents/
│       │   │   ├── AgentCard.tsx
│       │   │   ├── AgentGrid.tsx
│       │   │   ├── AgentDetail.tsx
│       │   │   └── AgentCharts.tsx
│       │   │
│       │   └── metrics/
│       │       ├── MetricsKPIs.tsx
│       │       ├── CostByChapterChart.tsx
│       │       └── TracesPerDayChart.tsx
│       │
│       ├── pages/
│       │   ├── HomePage.tsx
│       │   ├── SessionsPage.tsx
│       │   ├── ConversationPage.tsx
│       │   ├── AgentsPage.tsx
│       │   └── MetricsPage.tsx
│       │
│       ├── store/
│       │   └── useDashboardStore.ts
│       │
│       ├── api/
│       │   ├── client.ts       # Fetch wrapper
│       │   ├── sessions.ts     # Session API hooks
│       │   ├── agents.ts       # Agent API hooks
│       │   └── metrics.ts      # Metrics API hooks
│       │
│       ├── lib/
│       │   ├── utils.ts        # cn() helper for shadcn
│       │   ├── format.ts       # formatCost, formatLatency, etc.
│       │   └── constants.ts    # Agent order, chapter names
│       │
│       └── types/
│           ├── session.ts
│           ├── trace.ts
│           ├── observation.ts
│           └── metrics.ts
│
└── data/
    └── cupid.db                # SQLite database (gitignored)
```

---

## SQLite Database Schema

```sql
-- =========================================
-- SYNC METADATA
-- =========================================
CREATE TABLE IF NOT EXISTS sync_metadata (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    last_sync_at TEXT,
    last_trace_timestamp TEXT,
    sync_status TEXT DEFAULT 'idle',  -- 'idle' | 'running' | 'error'
    error_message TEXT,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- =========================================
-- SESSIONS
-- =========================================
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,                    -- e.g., 'thr_561d0a67'
    created_at TEXT NOT NULL,
    environment TEXT,

    -- Computed/cached fields (updated by sync)
    trace_count INTEGER DEFAULT 0,
    total_cost REAL DEFAULT 0,
    avg_latency REAL DEFAULT 0,
    first_trace_at TEXT,
    last_trace_at TEXT,

    -- Cupid-specific metadata
    mortal_name TEXT,
    match_name TEXT,
    max_chapter INTEGER DEFAULT -1,
    is_complete INTEGER DEFAULT 0,          -- 0=incomplete, 1=complete
    tags_json TEXT,                         -- JSON array of all tags

    -- Sync tracking
    synced_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_is_complete ON sessions(is_complete);

-- =========================================
-- TRACES
-- =========================================
CREATE TABLE IF NOT EXISTS traces (
    id TEXT PRIMARY KEY,
    session_id TEXT,
    user_id TEXT,
    name TEXT,                              -- Always 'Agent workflow'
    timestamp TEXT NOT NULL,

    -- Metrics
    total_cost REAL,
    latency REAL,                           -- in seconds

    -- Content (JSON)
    input_json TEXT,
    output_json TEXT,
    metadata_json TEXT,
    tags_json TEXT,

    -- Extracted fields for querying
    chapter TEXT,                           -- e.g., 'chapter_1'
    mortal_name TEXT,
    match_name TEXT,

    -- Sync tracking
    synced_at TEXT DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (session_id) REFERENCES sessions(id)
);

CREATE INDEX IF NOT EXISTS idx_traces_session_id ON traces(session_id);
CREATE INDEX IF NOT EXISTS idx_traces_timestamp ON traces(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_traces_chapter ON traces(chapter);

-- =========================================
-- OBSERVATIONS
-- =========================================
CREATE TABLE IF NOT EXISTS observations (
    id TEXT PRIMARY KEY,
    trace_id TEXT NOT NULL,
    parent_observation_id TEXT,

    type TEXT NOT NULL,                     -- 'AGENT' | 'GENERATION' | 'TOOL' | 'SPAN'
    name TEXT,                              -- Agent name or 'response'

    -- Timing
    start_time TEXT,
    end_time TEXT,
    latency_ms REAL,

    -- Generation-specific fields
    model TEXT,
    total_tokens INTEGER,
    prompt_tokens INTEGER,
    completion_tokens INTEGER,
    calculated_total_cost REAL,

    -- Content (JSON)
    input_json TEXT,
    output_json TEXT,
    metadata_json TEXT,
    level TEXT,                             -- 'DEFAULT' | 'ERROR' etc.

    -- Sync tracking
    synced_at TEXT DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (trace_id) REFERENCES traces(id),
    FOREIGN KEY (parent_observation_id) REFERENCES observations(id)
);

CREATE INDEX IF NOT EXISTS idx_observations_trace_id ON observations(trace_id);
CREATE INDEX IF NOT EXISTS idx_observations_type ON observations(type);
CREATE INDEX IF NOT EXISTS idx_observations_name ON observations(name);
CREATE INDEX IF NOT EXISTS idx_observations_parent ON observations(parent_observation_id);

-- =========================================
-- AGENT STATS CACHE
-- =========================================
CREATE TABLE IF NOT EXISTS agent_stats_cache (
    agent_name TEXT PRIMARY KEY,
    execution_count INTEGER DEFAULT 0,
    total_latency_ms REAL DEFAULT 0,
    avg_latency_ms REAL DEFAULT 0,
    total_cost REAL DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    success_rate REAL DEFAULT 100,
    last_execution_at TEXT,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- =========================================
-- DAILY METRICS CACHE
-- =========================================
CREATE TABLE IF NOT EXISTS daily_metrics (
    date TEXT PRIMARY KEY,                  -- 'YYYY-MM-DD'
    session_count INTEGER DEFAULT 0,
    trace_count INTEGER DEFAULT 0,
    total_cost REAL DEFAULT 0,
    avg_latency REAL DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_daily_metrics_date ON daily_metrics(date DESC);
```

---

## Backend API Specification

### Health Check

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Docker health check |

**Response:**
```json
{ "status": "healthy" }
```

---

### Sessions Router (`/api/sessions`)

#### List Sessions

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/sessions` | List sessions with filters |

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `time_range` | string | `all` | `24h`, `7d`, `30d`, `all` |
| `status` | string | `all` | `complete`, `incomplete`, `all` |
| `search` | string | - | Search by session ID, mortal, or match name |
| `page` | int | 1 | Page number |
| `limit` | int | 50 | Items per page |

**Response:**
```json
{
  "data": [
    {
      "id": "thr_561d0a67",
      "created_at": "2025-12-13T04:19:02.844Z",
      "trace_count": 8,
      "total_cost": 0.045,
      "avg_latency": 7.2,
      "mortal_name": "Maya Brooks",
      "match_name": "Ethan Murphy",
      "max_chapter": 3,
      "is_complete": false,
      "first_trace_at": "2025-12-13T04:19:14.715Z",
      "last_trace_at": "2025-12-13T04:20:11.745Z",
      "duration_seconds": 57
    }
  ],
  "meta": {
    "total": 13,
    "page": 1,
    "limit": 50,
    "pages": 1
  }
}
```

#### Get Session Stats

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/sessions/stats` | Aggregate session statistics |

**Query Parameters:** Same time_range filter as list

**Response:**
```json
{
  "total_sessions": 13,
  "total_cost": 0.58,
  "avg_duration_seconds": 145,
  "avg_latency_seconds": 6.8,
  "complete_sessions": 4,
  "incomplete_sessions": 9
}
```

#### Get Session Conversation

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/sessions/{session_id}/conversation` | Full conversation transcript |

**Response:**
```json
{
  "session": {
    "id": "thr_561d0a67",
    "mortal_name": "Maya Brooks",
    "match_name": "Ethan Murphy",
    "max_chapter": 3,
    "is_complete": false,
    "total_cost": 0.045,
    "duration_seconds": 57
  },
  "messages": [
    {
      "type": "agent",
      "timestamp": "2025-12-13T04:19:25.298Z",
      "chapter": "chapter_1",
      "agent": "Mortal",
      "content": "## THE MORTAL\n\n### Maya Brooks ♉️\n...",
      "metadata": {
        "latency_ms": 10584,
        "cost": 0.0093325,
        "total_tokens": 3231,
        "prompt_tokens": 2100,
        "completion_tokens": 1131,
        "model": "gpt-5.1-2025-11-13"
      }
    },
    {
      "type": "user",
      "timestamp": "2025-12-13T04:19:31.000Z",
      "chapter": "chapter_2",
      "content": "Continue"
    }
  ]
}
```

---

### Agents Router (`/api/agents`)

#### List Agents

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/agents` | All agents with stats |

**Response:**
```json
{
  "data": [
    {
      "name": "HasEnded",
      "category": "routing",
      "execution_count": 106,
      "avg_latency_ms": 120,
      "total_cost": 0.02,
      "total_tokens": 8500,
      "success_rate": 100
    },
    {
      "name": "Mortal",
      "category": "content",
      "execution_count": 13,
      "avg_latency_ms": 10600,
      "total_cost": 0.12,
      "total_tokens": 42000,
      "success_rate": 100
    }
  ]
}
```

#### Get Agent Detail

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/agents/{agent_name}` | Agent detail with recent executions |

**Response:**
```json
{
  "name": "Mortal",
  "category": "content",
  "stats": {
    "execution_count": 13,
    "avg_latency_ms": 10600,
    "total_cost": 0.12,
    "total_tokens": 42000,
    "success_rate": 100
  },
  "recent_executions": [
    {
      "trace_id": "c958038a4e36c45f",
      "timestamp": "2025-12-13T04:19:14.715Z",
      "latency_ms": 10584,
      "tokens": 3231,
      "cost": 0.0093325,
      "status": "success"
    }
  ]
}
```

#### Get Agent Charts

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/agents/{agent_name}/charts` | Chart data for agent |

**Response:**
```json
{
  "latency_over_time": [
    { "timestamp": "2025-12-13T04:19:14.715Z", "latency_ms": 10584 },
    { "timestamp": "2025-12-13T03:45:22.123Z", "latency_ms": 9800 }
  ],
  "executions_by_hour": [
    { "hour": 0, "count": 2 },
    { "hour": 1, "count": 0 },
    { "hour": 4, "count": 5 }
  ]
}
```

---

### Metrics Router (`/api/metrics`)

#### Dashboard Metrics

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/metrics/dashboard` | KPIs and chart data |

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `time_range` | string | `all` | `24h`, `7d`, `30d`, `all` |

**Response:**
```json
{
  "kpis": {
    "unique_sessions": 13,
    "total_traces": 106,
    "total_cost": 0.58,
    "avg_latency_seconds": 6.8,
    "cost_per_session": 0.045
  },
  "cost_by_chapter": [
    { "chapter": "Introduction", "cost": 0.05 },
    { "chapter": "Mortal", "cost": 0.12 },
    { "chapter": "Match", "cost": 0.10 },
    { "chapter": "Compatibility", "cost": 0.15 },
    { "chapter": "Story", "cost": 0.08 },
    { "chapter": "Evaluation", "cost": 0.08 }
  ],
  "traces_per_day": [
    { "date": "2025-12-07", "count": 12 },
    { "date": "2025-12-08", "count": 18 },
    { "date": "2025-12-09", "count": 15 }
  ]
}
```

---

### Sync Router (`/api/sync`)

#### Get Sync Status

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/sync/status` | Current sync status |

**Response:**
```json
{
  "status": "idle",
  "last_sync_at": "2025-12-13T04:25:00.000Z",
  "next_sync_at": "2025-12-13T04:30:00.000Z",
  "error_message": null
}
```

#### Trigger Sync

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/sync/trigger` | Manually trigger sync |

**Response:**
```json
{
  "status": "started",
  "message": "Sync job started"
}
```

---

## Background Sync Service

### Sync Strategy

```python
class LangfuseSyncService:
    """
    Incremental sync from Langfuse to SQLite.

    Runs every 5 minutes via APScheduler.
    Handles Langfuse rate limits with exponential backoff.
    """

    SYNC_INTERVAL_SECONDS = 300  # 5 minutes
    MAX_REQUESTS_PER_SYNC = 20
    ITEMS_PER_PAGE = 100

    async def sync(self):
        """Main sync entry point."""
        try:
            await self.update_status("running")

            # 1. Sync sessions
            await self.sync_sessions()

            # 2. Sync traces (newest first)
            await self.sync_traces()

            # 3. For new traces, fetch observations
            await self.sync_observations_for_new_traces()

            # 4. Refresh cached statistics
            await self.refresh_agent_stats_cache()
            await self.refresh_session_stats()
            await self.refresh_daily_metrics()

            await self.update_status("idle")

        except RateLimitError as e:
            await self.update_status("rate_limited", error=str(e))
            # Scheduler will retry next cycle

        except Exception as e:
            await self.update_status("error", error=str(e))
            raise
```

### Rate Limit Handling

```python
async def fetch_with_backoff(self, endpoint: str, max_retries: int = 5):
    """Fetch with exponential backoff on 429."""
    for attempt in range(max_retries):
        response = await self.client.get(endpoint)

        if response.status_code == 429:
            wait_time = (2 ** attempt) * 2  # 2s, 4s, 8s, 16s, 32s
            await asyncio.sleep(wait_time)
            continue

        response.raise_for_status()
        return response.json()

    raise RateLimitError(f"Rate limited after {max_retries} retries")
```

---

## Frontend Routes

| Path | Component | Description |
|------|-----------|-------------|
| `/` | HomePage | Navigation hub with quick stats |
| `/sessions` | SessionsPage | Session list with filters |
| `/sessions/:id` | ConversationPage | Full conversation transcript |
| `/agents` | AgentsPage | Agent cards + detail panel |
| `/metrics` | MetricsPage | KPIs + charts |

---

## Frontend Components

### Layout

```
Layout
├── Sidebar (fixed 240px)
│   ├── Logo ("Cupid Dashboard")
│   ├── NavSection "Observability"
│   │   ├── NavLink -> /sessions
│   │   ├── NavLink -> /agents
│   │   └── NavLink -> /metrics
│   ├── NavSection "External"
│   │   └── NavLink -> Langfuse Console (external)
│   └── SyncStatusIndicator
│
└── Main (flex-1)
    └── Outlet
```

### HomePage

```
HomePage
├── Hero
│   ├── Icon (heart with arrows)
│   ├── Title ("Cupid Observability")
│   └── Subtitle
├── QuickStats (4 cards)
│   ├── Sessions
│   ├── Traces
│   ├── Total Cost
│   └── Avg Latency
└── NavigationCards (3 cards)
    ├── Sessions -> /sessions
    ├── Agents -> /agents
    └── Metrics -> /metrics
```

### SessionsPage

```
SessionsPage
├── PageHeader
├── FiltersBar
│   ├── TimeRangeSelector
│   ├── StatusFilter
│   ├── SearchInput
│   └── RefreshButton
├── KPIGrid (4 cards)
└── SessionsTable
    └── SessionRow (expandable)
        ├── ID (monospace)
        ├── Status (badge: Complete / Made it to: X)
        ├── Characters (mortal + match)
        ├── Duration
        └── ViewButton -> /sessions/:id

        Expanded:
        ├── Total Cost
        ├── Avg Latency
        ├── First Seen
        ├── Last Active
        └── Trace Count
```

### ConversationPage

```
ConversationPage
├── BackLink -> /sessions
├── ConversationHeader
│   ├── SessionID
│   ├── ProgressBadge
│   └── MetaRow (characters, chapters, cost, duration)
└── MessageList
    ├── ChapterDivider
    ├── UserMessage (light purple bg)
    │   ├── UserIcon
    │   ├── Content
    │   └── Timestamp
    └── AgentMessage (dark bg)
        ├── AgentIcon + Name
        ├── Metrics (latency, cost)
        ├── Content (markdown rendered)
        └── ExpandableDetails
            ├── Total Tokens
            ├── Prompt Tokens
            ├── Completion Tokens
            └── Model
```

### AgentsPage

```
AgentsPage
├── PageHeader
├── AgentGrid (responsive grid)
│   └── AgentCard (clickable)
│       ├── Icon + Name
│       ├── Executions Badge
│       └── StatsGrid
│           ├── Avg Latency
│           ├── Total Cost
│           ├── Total Tokens
│           └── Success Rate
└── AgentDetail (shown when agent selected)
    ├── LatencyOverTimeChart (line)
    ├── ExecutionsByHourChart (bar)
    └── RecentExecutionsTable
```

### MetricsPage

```
MetricsPage
├── PageHeader + TimeRangeSelector
├── KPIGrid (5 cards)
│   ├── Unique Sessions
│   ├── Total Traces
│   ├── Total Cost
│   ├── Avg Latency
│   └── Cost per Session
└── ChartsGrid
    ├── CostByChapterChart (doughnut)
    └── TracesPerDayChart (bar)
```

---

## Zustand Store

```typescript
interface DashboardState {
  // Global time range filter
  timeRange: '24h' | '7d' | '30d' | 'all';
  setTimeRange: (range: TimeRange) => void;

  // Sessions
  sessions: Session[];
  sessionsLoading: boolean;
  fetchSessions: () => Promise<void>;

  // Selected session conversation
  conversation: ConversationData | null;
  conversationLoading: boolean;
  fetchConversation: (sessionId: string) => Promise<void>;

  // Agents
  agents: AgentStats[];
  selectedAgent: string | null;
  agentDetail: AgentDetail | null;
  setSelectedAgent: (name: string | null) => void;
  fetchAgents: () => Promise<void>;
  fetchAgentDetail: (name: string) => Promise<void>;

  // Metrics
  dashboardMetrics: DashboardMetrics | null;
  fetchDashboardMetrics: () => Promise<void>;

  // Sync status
  syncStatus: SyncStatus | null;
  fetchSyncStatus: () => Promise<void>;
  triggerSync: () => Promise<void>;
}
```

---

## Docker Configuration

### docker-compose.yml

```yaml
version: '3.8'

services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: cupid-dashboard-backend
    environment:
      - LANGFUSE_PUBLIC_KEY=${LANGFUSE_PUBLIC_KEY}
      - LANGFUSE_SECRET_KEY=${LANGFUSE_SECRET_KEY}
      - LANGFUSE_BASE_URL=${LANGFUSE_BASE_URL:-https://us.cloud.langfuse.com}
      - DATABASE_PATH=/app/data/cupid.db
      - SYNC_INTERVAL_SECONDS=${SYNC_INTERVAL_SECONDS:-300}
    volumes:
      - ./data:/app/data
    expose:
      - "8080"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    networks:
      - dashboard-network
    restart: unless-stopped

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: cupid-dashboard-frontend
    expose:
      - "80"
    depends_on:
      backend:
        condition: service_healthy
    networks:
      - dashboard-network
    restart: unless-stopped

  caddy:
    image: caddy:2-alpine
    container_name: cupid-dashboard-caddy
    ports:
      - "3000:80"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
      - caddy_config:/config
    depends_on:
      - frontend
    networks:
      - dashboard-network
    restart: unless-stopped

volumes:
  caddy_data:
  caddy_config:

networks:
  dashboard-network:
    driver: bridge
```

### Caddyfile

```
:80 {
    handle /api/* {
        reverse_proxy backend:8080
    }
    handle /health {
        reverse_proxy backend:8080
    }
    handle {
        reverse_proxy frontend:80
    }
}
```

---

## Environment Variables

```bash
# .env.example

# Langfuse API credentials
LANGFUSE_PUBLIC_KEY=pk-lf-b957e40e-94f5-4654-a74d-97d190b18e12
LANGFUSE_SECRET_KEY=sk-lf-c4956a16-4229-4146-af77-b5311b7eb253
LANGFUSE_BASE_URL=https://us.cloud.langfuse.com

# Sync configuration
SYNC_INTERVAL_SECONDS=300    # 5 minutes

# Database
DATABASE_PATH=/app/data/cupid.db
```

---

## Implementation Order

### Phase 1: Project Setup

1. **Create directory structure** at `dashboards/cupid/`
2. **Initialize backend**
   - Create `pyproject.toml` with dependencies
   - Create `Dockerfile`
   - Create `app/main.py` with basic FastAPI app
   - Create `app/config.py` with Pydantic Settings
3. **Initialize frontend**
   - `npm create vite@latest frontend -- --template react-ts`
   - Install dependencies: `tailwindcss`, `zustand`, `recharts`, `react-router-dom`, `react-markdown`, `lucide-react`
   - Configure Tailwind with dark theme
   - Set up shadcn/ui
4. **Create docker-compose.yml and Caddyfile**
5. **Create .env.example**

### Phase 2: Backend Database

6. **SQLite connection manager** (`database/connection.py`)
   - Async SQLite via aiosqlite
   - Connection pooling
7. **Schema definitions** (`database/schema.py`)
   - CREATE TABLE statements
   - Migration function to initialize schema

### Phase 3: Backend Services

8. **Langfuse client** (`services/langfuse_client.py`)
   - Async HTTP client with httpx
   - Basic Auth
   - Rate limit handling with exponential backoff
   - Methods: get_sessions, get_traces, get_trace_detail, get_observations
9. **Sync service** (`services/sync_service.py`)
   - Incremental sync logic
   - Session, trace, observation upserts
   - Cache refresh functions
10. **Analytics service** (`services/analytics_service.py`)
    - Query helpers for aggregations
    - Session stats, agent stats, daily metrics

### Phase 4: Backend APIs

11. **Sessions router** (`routers/sessions.py`)
    - GET /api/sessions (list with filters)
    - GET /api/sessions/stats
    - GET /api/sessions/{id}/conversation
12. **Agents router** (`routers/agents.py`)
    - GET /api/agents
    - GET /api/agents/{name}
    - GET /api/agents/{name}/charts
13. **Metrics router** (`routers/metrics.py`)
    - GET /api/metrics/dashboard
14. **Sync router** (`routers/sync.py`)
    - GET /api/sync/status
    - POST /api/sync/trigger
15. **Wire up in main.py**
    - Add routers
    - Add lifespan with APScheduler
    - Run initial sync on startup

### Phase 5: Frontend Core

16. **Layout components**
    - Sidebar with navigation
    - Layout wrapper with Outlet
    - PageHeader component
17. **Shared components**
    - KPICard
    - TimeRangeSelector
    - ChartCard wrapper
18. **API client layer**
    - Fetch wrapper with base URL
    - API functions for each endpoint
19. **Zustand store**
    - State definitions
    - Actions for fetching data
20. **Router setup**
    - react-router-dom configuration
    - Route definitions

### Phase 6: Frontend Pages

21. **HomePage**
    - Hero section
    - Quick stats (from /api/sessions/stats)
    - Navigation cards
22. **SessionsPage**
    - Filters bar
    - KPI cards
    - Sessions table with expandable rows
    - Search functionality
23. **ConversationPage**
    - Header with session info
    - Message list with chapter dividers
    - Markdown rendering
    - Message metadata (latency, cost, tokens)
24. **AgentsPage**
    - Agent grid
    - Agent selection
    - Detail panel with charts
    - Recharts: line chart (latency), bar chart (hourly)
25. **MetricsPage**
    - KPI grid
    - Recharts: doughnut (cost by chapter), bar (traces per day)

### Phase 7: Polish

26. **Loading states** - Skeleton loaders
27. **Error handling** - Error boundaries, toast notifications
28. **Sync status indicator** - In sidebar
29. **Responsive design** - Mobile sidebar collapse
30. **README documentation** - Setup, usage, commands

---

## Key Files to Reference During Implementation

| File | Purpose |
|------|---------|
| `specs/cupid/dashboard/api.js` | Langfuse API patterns, data extraction helpers |
| `specs/cupid/dashboard/styles.css` | Dark theme CSS variables to port to Tailwind |
| `specs/cupid/dashboard/index.html` | Home page UI reference |
| `specs/cupid/dashboard/sessions.html` | Sessions page UI reference |
| `specs/cupid/dashboard/conversation.html` | Conversation page UI reference |
| `specs/cupid/dashboard/agent.html` | Agents page UI reference |
| `specs/cupid/dashboard/metrics.html` | Metrics page UI reference |
| `apps/cupid/docker-compose.yml` | Docker pattern to follow |
| `apps/cupid/frontend/src/store/useAppStore.ts` | Zustand store pattern |
| `apps/cupid/backend/app/main.py` | FastAPI lifespan pattern |

---

## Cupid Agent Reference

For categorization and display order:

| Agent | Category | Display Order |
|-------|----------|---------------|
| HasEnded | routing | 1 |
| StartCupidGame | control | 2 |
| Introduction | content | 3 |
| DisplayMortal | ui | 4 |
| Mortal | content | 5 |
| DisplayMatch | ui | 6 |
| Match | content | 7 |
| DisplayCompatibilityCard | ui | 8 |
| CompatibilityAnalysis | content | 9 |
| DisplayChoices | ui | 10 |
| CupidEvaluation | content | 11 |
| End | control | 12 |

---

## Chapter Reference

| Chapter | Name | Description |
|---------|------|-------------|
| 0 | Introduction | Game introduction |
| 1 | Meet the Mortal | Display mortal character |
| 2 | Meet the Match | Display match character |
| 3 | Compatibility | Show compatibility analysis |
| 4 | The Story | Date scenes with choices |
| 5 | Evaluation | Cupid's final evaluation |
| 6 | End | Game conclusion |

---

## Commands

```bash
# Development
cd dashboards/cupid
docker compose up -d --build    # Start (http://localhost:3000)
docker compose down             # Stop
docker compose logs -f          # View logs
docker compose logs -f backend  # View backend logs only

# Manual sync trigger
curl -X POST http://localhost:3000/api/sync/trigger
```
