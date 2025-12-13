# Backend Guide

The Cupid Dashboard backend is a Python FastAPI application that syncs data from Langfuse and serves analytics via REST API.

## Tech Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| Framework | FastAPI | Async REST API framework |
| Database | aiosqlite | Async SQLite driver |
| HTTP Client | httpx | Async HTTP requests to Langfuse |
| Scheduler | APScheduler | Background sync jobs |
| Config | pydantic-settings | Environment variable management |

## Project Structure

```
backend/
├── Dockerfile
├── pyproject.toml
└── app/
    ├── __init__.py
    ├── main.py              # FastAPI application entry point
    ├── config.py            # Configuration settings
    ├── constants.py         # Shared constants (agents, chapters)
    ├── database/
    │   ├── __init__.py
    │   ├── connection.py    # Database connection context manager
    │   └── schema.py        # Table definitions and init
    ├── services/
    │   ├── __init__.py
    │   ├── langfuse_client.py   # Langfuse API client
    │   ├── sync_service.py      # Data synchronization
    │   └── analytics_service.py # Query service
    └── routers/
        ├── __init__.py
        ├── sessions.py      # /api/sessions endpoints
        ├── agents.py        # /api/agents endpoints
        ├── metrics.py       # /api/metrics endpoints
        └── sync.py          # /api/sync endpoints
```

---

## Configuration

### Settings (`app/config.py`)

```python
class Settings(BaseSettings):
    langfuse_public_key: str
    langfuse_secret_key: str
    langfuse_base_url: str = "https://us.cloud.langfuse.com"
    database_path: str = "/app/data/cupid.db"
    sync_interval_seconds: int = 300

    model_config = SettingsConfigDict(env_file=".env")
```

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `LANGFUSE_PUBLIC_KEY` | Yes | - | Langfuse API public key |
| `LANGFUSE_SECRET_KEY` | Yes | - | Langfuse API secret key |
| `LANGFUSE_BASE_URL` | No | `https://us.cloud.langfuse.com` | Langfuse API URL |
| `DATABASE_PATH` | No | `/app/data/cupid.db` | SQLite database path |
| `SYNC_INTERVAL_SECONDS` | No | `300` | Background sync interval |

---

## Main Application (`app/main.py`)

### Lifespan Management

```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await init_db()                    # Initialize database schema
    scheduler.add_job(...)             # Register sync job
    scheduler.start()                  # Start APScheduler
    await sync_service.sync()          # Initial sync

    yield

    # Shutdown
    scheduler.shutdown()
```

### CORS Configuration

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost",
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)
```

### Router Registration

```python
app.include_router(sessions_router)  # /api/sessions
app.include_router(agents_router)    # /api/agents
app.include_router(metrics_router)   # /api/metrics
app.include_router(sync_router)      # /api/sync
```

---

## Services

### LangfuseClient (`app/services/langfuse_client.py`)

Async HTTP client for Langfuse API with rate limiting.

```python
class LangfuseClient:
    async def get_sessions(limit=100, page=1) -> dict
    async def get_traces(limit=100, page=1, session_id=None,
                        from_timestamp=None, order_by=None) -> dict
    async def get_trace(trace_id: str) -> dict
    async def get_observations(limit=100, page=1, trace_id=None) -> dict
    async def check_connection() -> bool
```

**Features:**
- Basic Auth authentication
- Exponential backoff for rate limits (429)
- 30-second timeout
- Max 5 retries
- Supports incremental sync via `from_timestamp` parameter

### SyncService (`app/services/sync_service.py`)

Orchestrates data synchronization from Langfuse with incremental sync support.

```python
class SyncService:
    async def sync() -> None              # Main sync entry point
    async def get_status() -> dict        # Get sync status

    # Internal methods
    async def _sync_sessions() -> int           # Full sync, returns count
    async def _sync_traces() -> int             # Incremental sync, returns count
    async def _sync_observations() -> int       # Full sync, returns count
    async def _refresh_session_stats() -> None
    async def _refresh_agent_stats() -> None
    async def _refresh_daily_metrics() -> None
    async def _verify_sync() -> None            # Log sync verification
    async def _update_status(status, error=None) -> None
    async def _get_last_trace_timestamp() -> str | None
    async def _set_last_trace_timestamp(timestamp) -> None
```

**Sync Flow:**
1. Fetch sessions (full pagination, no limit)
2. Fetch traces (incremental using `fromTimestamp`)
3. Fetch observations (full pagination, no limit)
4. Refresh session aggregates
5. Rebuild agent stats cache
6. Rebuild daily metrics cache
7. Verify sync completeness

**Key Features:**
- **Incremental sync**: Only fetches new traces since last sync
- **Full pagination**: No arbitrary page limits
- **Rate limit protection**: 300ms delay between paginated requests
- **Verification logging**: Compares local counts vs synced counts

### AnalyticsService (`app/services/analytics_service.py`)

Query service for dashboard analytics.

```python
class AnalyticsService:
    # Sessions
    async def get_sessions(time_range, status, search, page, limit) -> dict
    async def get_session_stats(time_range) -> dict
    async def get_conversation(session_id) -> dict | None

    # Agents
    async def get_agents() -> list
    async def get_agent_detail(agent_name) -> dict | None
    async def get_agent_charts(agent_name) -> dict

    # Metrics
    async def get_dashboard_metrics(time_range) -> dict
```

**Key Features:**
- Time range filtering (24h, 7d, 30d, all)
- Full-text search on sessions
- Conversation message extraction
- Chart data aggregation

---

## Routers

### Sessions Router (`app/routers/sessions.py`)

```python
router = APIRouter(prefix="/api/sessions", tags=["sessions"])

@router.get("")
async def list_sessions(
    time_range: str = "all",
    status: str = "all",
    search: str | None = None,
    page: int = 1,
    limit: int = 50,
)

@router.get("/stats")
async def get_session_stats(time_range: str = "all")

@router.get("/{session_id}/conversation")
async def get_conversation(session_id: str)
```

### Agents Router (`app/routers/agents.py`)

```python
router = APIRouter(prefix="/api/agents", tags=["agents"])

@router.get("")
async def list_agents()

@router.get("/{agent_name}")
async def get_agent_detail(agent_name: str)

@router.get("/{agent_name}/charts")
async def get_agent_charts(agent_name: str)
```

### Metrics Router (`app/routers/metrics.py`)

```python
router = APIRouter(prefix="/api/metrics", tags=["metrics"])

@router.get("/dashboard")
async def get_dashboard_metrics(time_range: str = "all")
```

### Sync Router (`app/routers/sync.py`)

```python
router = APIRouter(prefix="/api/sync", tags=["sync"])

@router.get("/status")
async def get_sync_status()

@router.post("/trigger")
async def trigger_sync()
```

---

## Database

### Connection Management

```python
from app.database import get_db

async with get_db() as db:
    cursor = await db.execute("SELECT * FROM sessions")
    rows = await cursor.fetchall()
```

The `get_db()` context manager:
- Returns `aiosqlite.Connection` with Row factory
- Auto-commits on exit (unless error)
- Properly closes connection

### Schema Initialization

```python
from app.database import init_db

await init_db()  # Creates tables if not exist
```

---

## Constants (`app/constants.py`)

### Agent Categories

```python
AGENT_CATEGORIES = {
    "HasEnded": "routing",
    "StartCupidGame": "control",
    "Introduction": "content",
    "DisplayMortal": "ui",
    "Mortal": "content",
    "DisplayMatch": "ui",
    "Match": "content",
    "DisplayCompatibilityCard": "ui",
    "CompatibilityAnalysis": "content",
    "DisplayChoices": "ui",
    "CupidEvaluation": "content",
    "End": "control",
}
```

### Chapter Names

```python
CHAPTER_NAMES = {
    0: "Introduction",
    1: "Mortal",
    2: "Match",
    3: "Compatibility",
    4: "Story",
    5: "Evaluation",
    6: "End",
}
```

---

## Background Scheduling

### APScheduler Setup

```python
from apscheduler.schedulers.asyncio import AsyncIOScheduler

scheduler = AsyncIOScheduler()

scheduler.add_job(
    sync_service.sync,
    "interval",
    seconds=settings.sync_interval_seconds,  # Default: 300
    id="langfuse_sync",
)

scheduler.start()
```

### Job Characteristics
- **Interval**: Configurable (default 5 minutes)
- **Async**: Uses asyncio scheduler
- **Resilient**: Catches exceptions, updates status

---

## Error Handling

### Sync Errors

```python
try:
    await self.sync()
except RateLimitError as e:
    await self._update_status("rate_limited", str(e))
except Exception as e:
    await self._update_status("error", str(e))
    raise
```

### API Errors

Routers return appropriate HTTP status codes:
- `200`: Success
- `404`: Resource not found
- `422`: Validation error
- `500`: Internal error

---

## Local Development

### Without Docker

```bash
cd backend

# Install dependencies
uv sync

# Set environment variables
export LANGFUSE_PUBLIC_KEY=pk-lf-...
export LANGFUSE_SECRET_KEY=sk-lf-...

# Run server
uv run uvicorn app.main:app --reload --port 8080
```

### With Docker

```bash
cd dashboards/cupid
docker compose up -d backend
docker compose logs -f backend
```

---

## Dependencies

From `pyproject.toml`:

```toml
dependencies = [
    "fastapi>=0.114.1",
    "uvicorn[standard]>=0.30",
    "httpx>=0.27",
    "aiosqlite>=0.19",
    "pydantic>=2.0",
    "pydantic-settings>=2.0",
    "python-dotenv>=1.0",
    "apscheduler>=3.10",
]
```

Python version: `>=3.11`
