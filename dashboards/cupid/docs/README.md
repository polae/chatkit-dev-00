# Cupid Dashboard Documentation

Complete documentation for the Cupid Observability Dashboard - a Langfuse-powered analytics platform for the Cupid AI matchmaking game.

## Overview

The Cupid Dashboard provides visibility into AI conversation sessions, agent performance, and cost analytics for the Cupid game. It syncs data from Langfuse and presents it through an intuitive web interface.

### Features

- **Sessions View** - Browse game sessions with filtering and search
- **Conversation View** - Full transcript with chapter dividers and message details
- **Agents View** - Performance analytics for all 12 Cupid agents
- **Metrics View** - Aggregate KPIs, cost breakdown, and trend charts

### Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, TypeScript, Tailwind CSS, Recharts, Zustand |
| Backend | Python FastAPI, aiosqlite, APScheduler |
| Database | SQLite |
| Infrastructure | Docker Compose, Caddy reverse proxy |
| Data Source | Langfuse API |

---

## Quick Start

```bash
# 1. Navigate to dashboard directory
cd dashboards/cupid

# 2. Configure environment
cp .env.example .env
# Edit .env with your Langfuse credentials

# 3. Start services
docker compose up -d --build

# 4. Open dashboard
open http://localhost:3000
```

---

## Documentation Index

### Getting Started

| Document | Description |
|----------|-------------|
| [Deployment Guide](deployment.md) | Docker setup, configuration, and commands |
| [Architecture](architecture.md) | System overview and component interactions |

### Domain Knowledge

| Document | Description |
|----------|-------------|
| [Cupid Domain](cupid-domain.md) | Game agents, chapters, and data structures |
| [Langfuse Integration](langfuse-integration.md) | API endpoints, sync process, and data freshness |

### Technical Reference

| Document | Description |
|----------|-------------|
| [API Reference](api-reference.md) | REST API endpoints with examples |
| [Database Schema](database-schema.md) | Tables, fields, and refresh logic |
| [Backend Guide](backend-guide.md) | Python services and configuration |
| [Frontend Guide](frontend-guide.md) | React pages, components, and state |

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `LANGFUSE_PUBLIC_KEY` | Yes | - | Langfuse API public key |
| `LANGFUSE_SECRET_KEY` | Yes | - | Langfuse API secret key |
| `LANGFUSE_BASE_URL` | No | `https://us.cloud.langfuse.com` | Langfuse API URL |
| `SYNC_INTERVAL_SECONDS` | No | `300` | Background sync interval (seconds) |

---

## Common Commands

```bash
# Start dashboard
docker compose up -d --build

# Stop dashboard
docker compose down

# View logs
docker compose logs -f backend

# Manual sync trigger (UI auto-refreshes when done)
curl -X POST http://localhost:3000/api/sync/trigger

# Check sync status
curl http://localhost:3000/api/sync/status

# Health check
curl http://localhost:3000/health
```

---

## Dashboard Pages

### Home (`/`)

Overview dashboard with key metrics:
- Total Sessions
- Total Traces
- Total Cost
- Average Latency

### Sessions (`/sessions`)

Browse game sessions with:
- Expandable session rows
- Search by ID or character name
- Filter by status (complete/incomplete)
- Time range filtering (24h/7d/30d/all)

### Conversation (`/sessions/:id`)

Full session transcript showing:
- Session summary header
- Chapter dividers
- User and agent messages
- Token counts and costs per message

### Agents (`/agents`)

Performance analytics for all 12 agents:
- Execution counts
- Average latency
- Total cost
- Success rates
- Latency charts
- Hourly distribution

### Metrics (`/metrics`)

Aggregate analytics:
- KPI cards
- Cost by chapter (pie chart)
- Traces per day (bar chart)

---

## Data Flow

```
Langfuse Cloud
      │
      ▼ (Background sync every 5 min)
   Backend (incremental sync)
      │
      ▼
   SQLite
      │
      ▼ (REST API)
   Frontend
      │
      ▼
   Browser
```

The dashboard never queries Langfuse directly from the browser. All data is synced to a local SQLite database and served via the backend API.

**Sync Features:**
- **Incremental sync**: Only fetches new traces since last sync (using `fromTimestamp`)
- **Full pagination**: No arbitrary limits, fetches all data
- **Rate limit protection**: 300ms delays between requests + exponential backoff
- **Verification**: Logs local counts vs Langfuse reported totals

---

## Troubleshooting

### No Data Showing

1. Check sync status: `curl http://localhost:3000/api/sync/status`
2. Verify Langfuse credentials in `.env`
3. Check backend logs: `docker compose logs backend`
4. Trigger manual sync: `curl -X POST http://localhost:3000/api/sync/trigger`

### Rate Limited

Langfuse has aggressive rate limits. The dashboard uses exponential backoff and will automatically retry.

To reduce rate limit issues:
- Increase `SYNC_INTERVAL_SECONDS` (e.g., 600 for 10 minutes)
- Restart backend after changing: `docker compose restart backend`

### Connection Issues

1. Verify containers are running: `docker compose ps`
2. Check health: `curl http://localhost:3000/health`
3. Check Caddy logs: `docker compose logs caddy`

See [Deployment Guide](deployment.md#troubleshooting) for more details.

---

## External Resources

- [Langfuse Documentation](https://langfuse.com/docs)
- [Langfuse Console](https://us.cloud.langfuse.com)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [React Documentation](https://react.dev/)
