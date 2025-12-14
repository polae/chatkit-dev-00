# Cupid Observability Dashboard

A Langfuse-powered observability dashboard for the Cupid AI matchmaking game.

## Features

- **Sessions View** - Browse conversation sessions with expandable details
- **Conversation View** - Full transcript with markdown rendering and chapter dividers
- **Agents View** - Performance analytics for all 12 Cupid agents with charts
- **Metrics View** - Aggregate KPIs, cost breakdowns, and trace volume

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite, TailwindCSS, Zustand, Recharts
- **Backend**: Python FastAPI, aiosqlite, APScheduler
- **Database**: SQLite with background sync from Langfuse
- **Infrastructure**: Docker Compose, Caddy reverse proxy

## Quick Start

```bash
cd dashboards/cupid

# Copy environment file and add your Langfuse credentials
cp .env.example .env

# Start all services
docker compose up -d --build

# Open http://localhost:3000
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `LANGFUSE_PUBLIC_KEY` | Langfuse public key (pk-lf-...) | - |
| `LANGFUSE_SECRET_KEY` | Langfuse secret key (sk-lf-...) | - |
| `LANGFUSE_BASE_URL` | Langfuse API URL | https://us.cloud.langfuse.com |
| `SYNC_INTERVAL_SECONDS` | Background sync interval | 300 (5 min) |

## Commands

```bash
# Start dashboard
docker compose up -d --build

# Stop dashboard
docker compose down

# View logs
docker compose logs -f

# View backend logs only
docker compose logs -f backend

# Manual sync trigger
curl -X POST http://localhost:3000/api/sync/trigger
```

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/sessions` | List sessions with filters |
| `GET /api/sessions/{id}/conversation` | Full conversation transcript |
| `GET /api/agents` | All agents with stats |
| `GET /api/agents/{name}` | Agent detail + executions |
| `GET /api/metrics/dashboard` | KPIs + chart data |
| `GET /api/sync/status` | Sync status |
| `POST /api/sync/trigger` | Manual sync |
| `GET /health` | Health check |

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Browser   │────▶│    Caddy     │────▶│  Frontend   │
│             │     │   (proxy)    │     │   (Nginx)   │
└─────────────┘     └──────────────┘     └─────────────┘
                           │
                           ▼
                    ┌──────────────┐     ┌─────────────┐
                    │   Backend    │────▶│   SQLite    │
                    │  (FastAPI)   │     │   (local)   │
                    └──────────────┘     └─────────────┘
                           │
                           ▼ (background sync every 5 min)
                    ┌──────────────┐
                    │   Langfuse   │
                    │     API      │
                    └──────────────┘
```

## Data Model

The dashboard syncs from Langfuse and stores data locally:

- **Sessions** - Conversation threads (1 user = 1 session)
- **Traces** - Agent workflow executions with metadata
- **Observations** - Nested AGENT and GENERATION spans

## Cupid Agents

| Agent | Category | Purpose |
|-------|----------|---------|
| HasEnded | routing | Check if game ended |
| StartCupidGame | control | Initialize game |
| Introduction | content | Game intro narrative |
| DisplayMortal | ui | Show mortal card |
| Mortal | content | Generate mortal profile |
| DisplayMatch | ui | Show match card |
| Match | content | Generate match profile |
| DisplayCompatibilityCard | ui | Show compatibility |
| CompatibilityAnalysis | content | Analyze compatibility |
| DisplayChoices | ui | Show player choices |
| CupidEvaluation | content | Final evaluation |
| End | control | Game conclusion |

## Development

For local development without Docker:

```bash
# Backend
cd backend
uv sync
uv run uvicorn app.main:app --reload --port 8080

# Frontend (in another terminal)
cd frontend
npm install
npm run dev
```

## Rate Limiting

Langfuse API has aggressive rate limits. The dashboard uses:
- Background sync (every 5 min) instead of real-time queries
- Local SQLite cache for fast dashboard queries
- Exponential backoff on 429 errors

## Known Issues

### Streaming Usage Data

**Issue:** https://github.com/Arize-ai/openinference/issues/2530

The `openinference-instrumentation-openai-agents` library doesn't automatically capture token usage for streaming responses. This affects:
- **CupidEvaluation** agent (Chapter 5)
- **End** agent (Chapter 6)

**Workaround Applied:** The Cupid backend (`apps/cupid/backend/app/server.py`) manually captures usage data from `result.raw_responses` after streaming completes using the Langfuse SDK v3 API. Look for `_log_streaming_usage_to_langfuse` method.

In Langfuse/dashboard, the workaround creates standalone GENERATION observations with:
- Name matching the agent (`CupidEvaluation`, `End`)
- Proper model name (`gpt-5.1`) for cost calculation
- `metadata.workaround: "streaming_usage_capture"` marker
- Token counts and calculated costs
- Streamed text content in `output.text` for conversation view display

The dashboard's `sync_service.py` aggregates these workaround generations when calculating agent stats, so token counts and costs are properly attributed to the agents.

**When to remove:** Once the upstream issue is fixed, the workaround in `apps/cupid/backend/app/server.py` can be removed. Search for references to issue #2530.
