# Langfuse Integration

This document explains how the Cupid Dashboard integrates with Langfuse for tracing data, including API endpoints, authentication, synchronization, and data freshness.

## What is Langfuse?

[Langfuse](https://langfuse.com) is an open-source LLM observability platform that provides:

- **Tracing**: Track LLM calls, agent executions, and tool usage
- **Sessions**: Group related traces into conversation threads
- **Analytics**: Cost tracking, latency monitoring, and usage metrics
- **Debugging**: Inspect inputs, outputs, and errors

The Cupid game uses Langfuse to trace all AI agent interactions. The dashboard reads this tracing data to provide observability.

**Langfuse Documentation**: https://langfuse.com/docs

---

## Authentication

### API Credentials

Langfuse uses Basic Authentication with a public/secret key pair:

| Variable | Description | Example |
|----------|-------------|---------|
| `LANGFUSE_PUBLIC_KEY` | API public key | `pk-lf-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` |
| `LANGFUSE_SECRET_KEY` | API secret key | `sk-lf-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` |
| `LANGFUSE_BASE_URL` | API base URL | `https://us.cloud.langfuse.com` |

### Authentication Header

```python
credentials = f"{public_key}:{secret_key}"
auth_header = base64.b64encode(credentials.encode()).decode()
headers = {"Authorization": f"Basic {auth_header}"}
```

---

## Langfuse API Endpoints

The dashboard calls these Langfuse REST API endpoints:

### List Sessions

```
GET /api/public/sessions
```

**Parameters:**
- `limit` (int): Max results per page (default: 100)
- `page` (int): Page number (1-indexed)

**Response:**
```json
{
  "data": [
    {
      "id": "thr_xxx",
      "createdAt": "2025-12-10T10:00:00Z",
      "environment": "production"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 100,
    "totalPages": 2,
    "totalItems": 150
  }
}
```

### List Traces

```
GET /api/public/traces
```

**Parameters:**
- `limit` (int): Max results per page
- `page` (int): Page number
- `sessionId` (string, optional): Filter by session
- `fromTimestamp` (string, optional): ISO 8601 datetime, filter traces >= timestamp
- `orderBy` (string, optional): Sort order, e.g., `timestamp.asc` or `timestamp.desc`

**Response:**
```json
{
  "data": [
    {
      "id": "trace_xxx",
      "sessionId": "thr_xxx",
      "name": "Agent workflow",
      "timestamp": "2025-12-10T10:05:00Z",
      "totalCost": 0.0045,
      "latency": 2500,
      "metadata": {"mortal": "Alice", "match": "Bob"},
      "tags": ["chapter_1", "cupid"]
    }
  ],
  "meta": {...}
}
```

### Get Single Trace

```
GET /api/public/traces/{traceId}
```

Returns trace with nested observations.

### List Observations

```
GET /api/public/observations
```

**Parameters:**
- `limit` (int): Max results per page (max 100)
- `page` (int): Page number
- `traceId` (string, optional): Filter by trace

**Response:**
```json
{
  "data": [
    {
      "id": "obs_xxx",
      "traceId": "trace_xxx",
      "parentObservationId": "obs_parent",
      "type": "GENERATION",
      "name": "response",
      "startTime": "2025-12-10T10:05:00Z",
      "endTime": "2025-12-10T10:05:02Z",
      "model": "gpt-4.1-mini",
      "promptTokens": 500,
      "completionTokens": 150,
      "totalTokens": 650,
      "calculatedTotalCost": 0.002,
      "input": {...},
      "output": {...}
    }
  ],
  "meta": {...}
}
```

---

## Data Synchronization

### Sync Architecture

```
┌─────────────┐     Scheduled      ┌──────────────┐
│ APScheduler │────(every 5 min)──▶│  SyncService │
└─────────────┘                    └──────────────┘
                                          │
                                          ▼
                                   ┌──────────────┐
                                   │LangfuseClient│
                                   └──────────────┘
                                          │
                    Paginated requests    │
                    with rate limiting    ▼
                                   ┌──────────────┐
                                   │ Langfuse API │
                                   └──────────────┘
                                          │
                                          ▼
                                   ┌──────────────┐
                                   │   SQLite     │
                                   └──────────────┘
```

### Sync Process

The `SyncService.sync()` method orchestrates the full sync:

1. **Update status** → `running`
2. **Sync sessions** → Fetch all sessions (full pagination, no limit)
3. **Sync traces** → Incremental sync using `fromTimestamp` (only new traces)
4. **Sync observations** → Fetch all observations (full pagination)
5. **Refresh session stats** → Compute aggregates (cost, latency, completion)
6. **Refresh agent stats** → Rebuild `agent_stats_cache`
7. **Refresh daily metrics** → Rebuild `daily_metrics` (last 30 days)
8. **Verify sync** → Log local counts vs synced counts
9. **Update status** → `idle`

### Incremental Sync

The dashboard uses **incremental sync** for traces to minimize API calls:

| Sync Type | When | What Happens |
|-----------|------|--------------|
| **Initial sync** | First run (no `last_trace_timestamp`) | Fetch ALL historical traces |
| **Incremental sync** | Subsequent runs | Fetch only traces since `last_trace_timestamp` |

**How it works:**

1. On first sync, all traces are fetched and stored
2. The latest trace timestamp is saved to `sync_metadata.last_trace_timestamp`
3. On subsequent syncs, only traces with `timestamp >= last_trace_timestamp` are fetched
4. Traces are ordered by `timestamp.asc` (oldest first) for resume support

**Edge Case: Mid-Session Data**

If a user is mid-session when sync runs:
- Traces created so far are fetched and stored
- `last_trace_timestamp` is set to the latest trace time
- When the user finishes and more traces are created...
- Next sync fetches ALL new traces (timestamp > last sync)
- **Result: Complete data, no gaps**

### Sync Schedule

| Setting | Default | Description |
|---------|---------|-------------|
| `SYNC_INTERVAL_SECONDS` | 300 | Background sync interval (5 minutes) |

The scheduler runs using APScheduler's `AsyncIOScheduler`:

```python
scheduler.add_job(
    sync_service.sync,
    "interval",
    seconds=settings.sync_interval_seconds,
    id="langfuse_sync",
)
```

### Initial Sync

On application startup, an initial sync runs immediately:

```python
async with lifespan(app):
    await init_db()
    scheduler.start()
    await sync_service.sync()  # Initial sync
```

---

## Rate Limiting

### Langfuse Rate Limits

Langfuse has aggressive rate limits:
- ~429 errors after 20-50 sequential requests
- Recovery time: 30-60 seconds

### Request Delays

To avoid hitting rate limits, the sync service adds a **300ms delay** between paginated API requests:

```python
# In sync_service.py
REQUEST_DELAY_MS = 300

# Between each page fetch
await asyncio.sleep(REQUEST_DELAY_MS / 1000)
```

### Exponential Backoff

The `LangfuseClient` implements exponential backoff for 429 errors:

```python
for attempt in range(max_retries):  # max_retries = 5
    response = await client.get(url, headers=headers, params=params)

    if response.status_code == 429:
        wait_time = (2 ** attempt) * 2  # 2s, 4s, 8s, 16s, 32s
        await asyncio.sleep(wait_time)
        continue
```

| Attempt | Wait Time |
|---------|-----------|
| 1 | 2 seconds |
| 2 | 4 seconds |
| 3 | 8 seconds |
| 4 | 16 seconds |
| 5 | 32 seconds |

After 5 failed attempts, a `RateLimitError` is raised.

### Rate Limit Handling

When rate limited:
1. Sync status set to `rate_limited`
2. Error message stored in `sync_metadata`
3. Sync retries on next scheduled interval

---

## Data Freshness

### Freshness Guarantees

| Metric | Value |
|--------|-------|
| Default sync interval | 5 minutes |
| Maximum staleness | ~5-10 minutes |
| Manual sync | Available via API |

### Checking Sync Status

**API Endpoint:**
```
GET /api/sync/status
```

**Response:**
```json
{
  "status": "idle",
  "last_sync_at": "2025-12-13T10:00:00+00:00",
  "next_sync_at": "2025-12-13T10:05:00+00:00",
  "error_message": null
}
```

**Status Values:**
| Status | Description |
|--------|-------------|
| `idle` | Ready, last sync successful |
| `running` | Sync in progress |
| `rate_limited` | Hit API rate limits, will retry |
| `error` | Sync failed with error |

### Manual Sync Trigger

**API Endpoint:**
```
POST /api/sync/trigger
```

**Response:**
```json
{
  "status": "started",
  "message": "Sync job started - fetching from Langfuse API"
}
```

### UI Indicator

The dashboard sidebar shows:
- Last sync time (e.g., "2 min ago")
- Refresh button to trigger manual sync
- Status indicator (green = idle, yellow = running/syncing)

### Auto-Refresh After Manual Sync

When you click the refresh button in the sidebar:

1. Backend sync is triggered
2. UI shows "Syncing..." with spinning icon
3. Frontend polls for sync completion (every 2 seconds)
4. When sync completes, **all data is automatically refreshed**
5. Sessions, agents, metrics update without browser refresh

This ensures you always see the latest data after a manual sync.

---

## Data Extraction

### Metadata Extraction

The sync service extracts structured data from Langfuse:

**From Traces:**
- `chapter` tag: Extracted from tags array (e.g., `chapter_1`)
- `mortal_name`: From `metadata.mortal`
- `match_name`: From `metadata.match`

**From Observations:**
- `latency_ms`: Calculated from `endTime - startTime`
- Cost/tokens: Aggregated from child `GENERATION` observations

### Parent-Child Relationships

Observations form a hierarchy:
```
AGENT: "Agent workflow" (root)
└── AGENT: "Mortal" (sub-agent)
    └── GENERATION: "response" (LLM call)
```

The dashboard uses `parent_observation_id` to:
- Build conversation messages (link response to agent)
- Calculate per-agent costs (sum child GENERATION costs)

---

## Configuration

### Environment Variables

```bash
# Required
LANGFUSE_PUBLIC_KEY=pk-lf-...
LANGFUSE_SECRET_KEY=sk-lf-...

# Optional
LANGFUSE_BASE_URL=https://us.cloud.langfuse.com  # Default
SYNC_INTERVAL_SECONDS=300                          # Default: 5 min
```

### Regional URLs

| Region | Base URL |
|--------|----------|
| US | `https://us.cloud.langfuse.com` |
| EU | `https://cloud.langfuse.com` |
| Self-hosted | Your deployment URL |

---

## Troubleshooting

### Common Issues

**Rate Limited (429 errors)**
- Check sync status: `GET /api/sync/status`
- Wait for automatic retry or reduce sync frequency
- Increase `SYNC_INTERVAL_SECONDS`

**No Data Appearing**
- Verify credentials are correct
- Check Langfuse console for data
- Check backend logs: `docker compose logs -f backend`

**Stale Data**
- Trigger manual sync: `POST /api/sync/trigger`
- Check if sync is stuck in `running` status
- Restart backend container

**Connection Errors**
- Verify `LANGFUSE_BASE_URL` is correct
- Check network connectivity to Langfuse
- Verify API keys are active in Langfuse console
