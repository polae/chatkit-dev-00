# Architecture

This document describes the Cupid Dashboard system architecture, component interactions, and data flow.

## System Overview

```
                                    Internet
                                       │
                                       ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                              Docker Network                               │
│                                                                          │
│   ┌─────────────┐                                                        │
│   │   Browser   │                                                        │
│   │  (Client)   │                                                        │
│   └──────┬──────┘                                                        │
│          │ :3000                                                         │
│          ▼                                                               │
│   ┌──────────────┐      /api/*      ┌──────────────┐                    │
│   │    Caddy     │─────────────────▶│   Backend    │                    │
│   │   (Proxy)    │                  │  (FastAPI)   │                    │
│   │   :80/:3000  │                  │    :8080     │                    │
│   └──────┬───────┘                  └──────┬───────┘                    │
│          │ /*                              │                             │
│          ▼                                 │                             │
│   ┌──────────────┐                         │                             │
│   │   Frontend   │                         │                             │
│   │   (Nginx)    │                         ▼                             │
│   │     :80      │                  ┌──────────────┐                    │
│   └──────────────┘                  │   SQLite     │                    │
│                                     │  (Volume)    │                    │
│                                     └──────────────┘                    │
│                                            │                             │
└────────────────────────────────────────────┼─────────────────────────────┘
                                             │
                                             ▼ (Background Sync)
                                      ┌──────────────┐
                                      │   Langfuse   │
                                      │     API      │
                                      └──────────────┘
```

## Components

### Caddy (Reverse Proxy)

**Container:** `cupid-dashboard-caddy`
**Image:** `caddy:2-alpine`
**Port:** 3000 (external) → 80 (internal)

**Responsibilities:**
- Entry point for all HTTP traffic
- Route `/api/*` requests to backend
- Route all other requests to frontend
- TLS termination (if configured)

**Routing Rules:**
```
/api/*   → backend:8080
/health  → backend:8080
/*       → frontend:80
```

### Frontend (React + Nginx)

**Container:** `cupid-dashboard-frontend`
**Port:** 80 (internal only)

**Responsibilities:**
- Serve static React application
- Handle client-side routing
- Make API requests via Caddy proxy

**Stack:**
- React 19 + TypeScript
- Vite build
- Nginx serving
- Tailwind CSS
- Zustand state
- Recharts visualization

### Backend (FastAPI)

**Container:** `cupid-dashboard-backend`
**Port:** 8080 (internal only)

**Responsibilities:**
- REST API for dashboard data
- Background data synchronization
- SQLite database management
- Langfuse API integration

**Stack:**
- Python 3.11+
- FastAPI + Uvicorn
- aiosqlite
- APScheduler
- httpx

### SQLite (Database)

**Location:** `/app/data/cupid.db` (container) → `./data/cupid.db` (host)

**Responsibilities:**
- Persistent data storage
- Synced Langfuse data
- Pre-computed analytics caches

**Volume Mount:** `./data:/app/data`

### Langfuse (External)

**URL:** `https://us.cloud.langfuse.com`

**Responsibilities:**
- Source of truth for tracing data
- Sessions, traces, observations storage
- Cost and token tracking

---

## Data Flow

### 1. User Request Flow

```
Browser → Caddy(:3000) → Frontend(:80)
                       ↓
                   React App loads
                       ↓
                   API request to /api/*
                       ↓
Caddy(:3000) → Backend(:8080) → SQLite
                       ↓
                   JSON response
                       ↓
                   React renders
```

### 2. Background Sync Flow

```
APScheduler (every 5 min)
         ↓
    SyncService.sync()
         ↓
    LangfuseClient
         ↓
    Langfuse API
         ↓
    Parse response
         ↓
    SQLite INSERT/UPDATE
         ↓
    Refresh caches
```

### 3. Data Refresh Flow

```
Raw Data Sync
    ↓
sessions, traces, observations tables
    ↓
Session Stats Refresh
    ↓
sessions table (aggregates)
    ↓
Agent Stats Refresh
    ↓
agent_stats_cache table
    ↓
Daily Metrics Refresh
    ↓
daily_metrics table
```

---

## Request Routing

### Caddy Configuration

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

### Route Examples

| Request | Destination |
|---------|-------------|
| `GET /` | Frontend (React) |
| `GET /sessions` | Frontend (React SPA route) |
| `GET /api/sessions` | Backend (FastAPI) |
| `GET /api/sync/status` | Backend (FastAPI) |
| `GET /health` | Backend (FastAPI) |

---

## Sync Architecture

### Background Scheduler

```
┌─────────────────────────────────────────────────────────────┐
│                    Backend Container                         │
│                                                             │
│  ┌─────────────┐     ┌──────────────┐     ┌─────────────┐  │
│  │ APScheduler │────▶│ SyncService  │────▶│LangfuseClient│  │
│  │  (asyncio)  │     │              │     │             │  │
│  └─────────────┘     └──────────────┘     └─────────────┘  │
│        │                    │                    │          │
│        │ every 5 min       │ sync()            │ API calls │
│        ▼                    ▼                    ▼          │
│  ┌─────────────┐     ┌──────────────┐     ┌─────────────┐  │
│  │  Job Queue  │     │   SQLite     │     │  Langfuse   │  │
│  │             │     │              │◀────│    API      │  │
│  └─────────────┘     └──────────────┘     └─────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Sync States

```
                    ┌─────────┐
        start ─────▶│  idle   │◀─── success
                    └────┬────┘
                         │
                         ▼
                    ┌─────────┐
                    │ running │
                    └────┬────┘
                         │
           ┌─────────────┼─────────────┐
           ▼             ▼             ▼
    ┌───────────┐  ┌───────────┐  ┌───────┐
    │rate_limited│  │   error   │  │success│
    └───────────┘  └───────────┘  └───────┘
           │             │             │
           └─────────────┴─────────────┘
                         │
                    next cycle
```

---

## Network Configuration

### Docker Network

All containers communicate via `dashboard-network` bridge:

```yaml
networks:
  dashboard-network:
    driver: bridge
```

### Service Discovery

Containers reference each other by service name:
- `backend:8080` - Backend API
- `frontend:80` - Frontend static files

### Port Mapping

| Service | Internal | External |
|---------|----------|----------|
| Caddy | 80 | 3000 |
| Frontend | 80 | - |
| Backend | 8080 | - |

Only Caddy exposes ports externally.

---

## Data Storage

### SQLite Database

**File:** `./data/cupid.db`

**Tables:**
| Table | Purpose | Update Frequency |
|-------|---------|------------------|
| sync_metadata | Sync state | Every sync |
| sessions | Game sessions | Every sync |
| traces | Execution traces | Every sync |
| observations | LLM operations | Every sync |
| agent_stats_cache | Agent analytics | Every sync |
| daily_metrics | Daily aggregates | Every sync |

### Volume Persistence

```yaml
volumes:
  - ./data:/app/data
```

Data persists across container restarts.

---

## Caching Strategy

### Why Cache?

1. **Rate Limits**: Langfuse has aggressive rate limits (~429 after 20-50 requests)
2. **Performance**: Dashboard queries should be fast (<100ms)
3. **Offline**: Dashboard works even if Langfuse is temporarily unavailable

### Cache Layers

```
┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│   Langfuse    │────▶│    SQLite     │────▶│   API Layer   │
│ (Source Data) │     │   (Cache)     │     │  (Queries)    │
└───────────────┘     └───────────────┘     └───────────────┘
                            │
              ┌─────────────┼─────────────┐
              ▼             ▼             ▼
        ┌──────────┐  ┌──────────┐  ┌──────────┐
        │ Raw Data │  │Pre-computed│  │Pre-computed│
        │ Tables   │  │Agent Stats│  │Daily Metrics│
        └──────────┘  └──────────┘  └──────────┘
```

### Cache Freshness

| Metric | Default |
|--------|---------|
| Sync interval | 5 minutes |
| Max staleness | ~10 minutes |
| Manual refresh | Available |

---

## Security Considerations

### CORS

Backend restricts origins to localhost:

```python
allow_origins=[
    "http://localhost",
    "http://localhost:3000",
    "http://localhost:5173",
]
```

### API Authentication

Currently no authentication on dashboard endpoints. For production:
- Add API key authentication
- Use Caddy basic auth
- Implement JWT tokens

### Secrets Management

Langfuse credentials via environment variables:
- Never committed to repository
- Passed via `.env` file or Docker secrets

---

## Scalability

### Current Design

- Single backend instance
- Single SQLite database
- Background sync every 5 minutes

### Scaling Options

For higher load:

1. **Read Replicas**: Switch SQLite to PostgreSQL with read replicas
2. **Caching Layer**: Add Redis for hot queries
3. **Async Workers**: Move sync to Celery workers
4. **Load Balancer**: Multiple backend instances behind Caddy

---

## Monitoring

### Health Checks

```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
  interval: 30s
  timeout: 10s
  retries: 3
```

### Sync Status

Sidebar displays:
- Last sync timestamp
- Sync status indicator
- Manual refresh button

### Logs

```bash
docker compose logs -f backend   # API and sync logs
docker compose logs -f caddy     # Request logs
```
