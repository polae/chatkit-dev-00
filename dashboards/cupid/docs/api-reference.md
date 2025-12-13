# API Reference

The Cupid Dashboard backend exposes a REST API for the frontend to consume. All endpoints are prefixed with `/api`.

## Base URL

```
http://localhost:3000/api   # Via Caddy proxy
http://localhost:8080/api   # Direct backend access
```

## Response Format

All responses are JSON. Successful responses return data directly or with pagination metadata.

---

## Sessions API

### List Sessions

```
GET /api/sessions
```

Returns paginated list of sessions with aggregate statistics.

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `time_range` | string | `"all"` | Filter: `"24h"`, `"7d"`, `"30d"`, `"all"` |
| `status` | string | `"all"` | Filter: `"complete"`, `"incomplete"`, `"all"` |
| `search` | string | - | Search session ID, mortal name, or match name |
| `page` | int | 1 | Page number (1-indexed) |
| `limit` | int | 50 | Results per page (1-100) |

**Response:**

```json
{
  "data": [
    {
      "id": "thr_abc123",
      "created_at": "2025-12-10T10:00:00Z",
      "trace_count": 15,
      "total_cost": 0.45,
      "avg_latency": 8.5,
      "mortal_name": "Alice",
      "match_name": "Bob",
      "max_chapter": 5,
      "is_complete": true,
      "first_trace_at": "2025-12-10T10:00:00Z",
      "last_trace_at": "2025-12-10T10:45:00Z",
      "duration_seconds": 2700
    }
  ],
  "meta": {
    "total": 150,
    "page": 1,
    "limit": 50,
    "pages": 3
  }
}
```

---

### Get Session Stats

```
GET /api/sessions/stats
```

Returns aggregate statistics across all sessions.

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `time_range` | string | `"all"` | Filter: `"24h"`, `"7d"`, `"30d"`, `"all"` |

**Response:**

```json
{
  "total_sessions": 150,
  "total_cost": 67.50,
  "avg_duration_seconds": 2400,
  "avg_latency_seconds": 8.13,
  "complete_sessions": 120,
  "incomplete_sessions": 30
}
```

---

### Get Conversation

```
GET /api/sessions/{session_id}/conversation
```

Returns full conversation transcript for a session.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `session_id` | string | Session ID (e.g., `thr_abc123`) |

**Response:**

```json
{
  "session": {
    "id": "thr_abc123",
    "mortal_name": "Alice",
    "match_name": "Bob",
    "max_chapter": 5,
    "is_complete": true,
    "total_cost": 0.45,
    "duration_seconds": 2700
  },
  "messages": [
    {
      "type": "user",
      "timestamp": "2025-12-10T10:00:00Z",
      "chapter": "chapter_0",
      "agent": null,
      "content": "Start the game",
      "metadata": null
    },
    {
      "type": "agent",
      "timestamp": "2025-12-10T10:00:05Z",
      "chapter": "chapter_0",
      "agent": "Introduction",
      "content": "Welcome to Cupid's matchmaking game...",
      "metadata": {
        "latency_ms": 5000,
        "cost": 0.015,
        "total_tokens": 450,
        "prompt_tokens": 200,
        "completion_tokens": 250,
        "model": "gpt-4.1-mini"
      }
    }
  ]
}
```

**Message Types:**
- `user`: Player input
- `agent`: AI agent response

---

## Agents API

### List Agents

```
GET /api/agents
```

Returns all agents with their performance statistics.

**Response:**

```json
{
  "data": [
    {
      "name": "Mortal",
      "category": "content",
      "execution_count": 150,
      "avg_latency_ms": 10600,
      "total_cost": 15.00,
      "total_tokens": 75000,
      "success_rate": 98.5
    },
    {
      "name": "HasEnded",
      "category": "routing",
      "execution_count": 300,
      "avg_latency_ms": 120,
      "total_cost": 0.50,
      "total_tokens": 5000,
      "success_rate": 100.0
    }
  ]
}
```

**Agent Categories:**
- `routing`: Fast decision agents (HasEnded)
- `control`: Lifecycle agents (StartCupidGame, End)
- `content`: LLM content generation (Introduction, Mortal, Match, etc.)
- `ui`: Widget display agents (Display*)

---

### Get Agent Detail

```
GET /api/agents/{agent_name}
```

Returns detailed statistics and recent executions for an agent.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `agent_name` | string | Agent name (e.g., `Mortal`, `HasEnded`) |

**Response:**

```json
{
  "name": "Mortal",
  "category": "content",
  "stats": {
    "execution_count": 150,
    "avg_latency_ms": 10600,
    "total_cost": 15.00,
    "total_tokens": 75000,
    "success_rate": 98.5
  },
  "recent_executions": [
    {
      "trace_id": "trace_xxx",
      "timestamp": "2025-12-13T10:00:00Z",
      "latency_ms": 10500,
      "tokens": 520,
      "cost": 0.10,
      "status": "success"
    }
  ]
}
```

**Returns `404`** if agent not found.

---

### Get Agent Charts

```
GET /api/agents/{agent_name}/charts
```

Returns time-series data for agent charts.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `agent_name` | string | Agent name |

**Response:**

```json
{
  "latency_over_time": [
    {
      "timestamp": "2025-12-13T09:00:00Z",
      "latency_ms": 10200
    },
    {
      "timestamp": "2025-12-13T09:30:00Z",
      "latency_ms": 10800
    }
  ],
  "executions_by_hour": [
    {"hour": 0, "count": 5},
    {"hour": 1, "count": 8},
    {"hour": 2, "count": 3},
    {"hour": 9, "count": 25},
    {"hour": 10, "count": 30}
  ]
}
```

**Notes:**
- `latency_over_time`: Last 20 executions
- `executions_by_hour`: Distribution across 24 hours (0-23)

---

## Metrics API

### Get Dashboard Metrics

```
GET /api/metrics/dashboard
```

Returns KPIs and chart data for the metrics page.

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `time_range` | string | `"all"` | Filter: `"24h"`, `"7d"`, `"30d"`, `"all"` |

**Response:**

```json
{
  "kpis": {
    "unique_sessions": 150,
    "total_traces": 2300,
    "total_cost": 67.50,
    "avg_latency_seconds": 8.13,
    "cost_per_session": 0.45
  },
  "cost_by_chapter": [
    {"chapter": "Introduction", "cost": 5.00},
    {"chapter": "Mortal", "cost": 15.00},
    {"chapter": "Match", "cost": 12.00},
    {"chapter": "Compatibility", "cost": 10.00},
    {"chapter": "Story", "cost": 18.00},
    {"chapter": "Evaluation", "cost": 7.50}
  ],
  "traces_per_day": [
    {"date": "2025-12-07", "count": 300},
    {"date": "2025-12-08", "count": 350},
    {"date": "2025-12-09", "count": 280},
    {"date": "2025-12-10", "count": 420},
    {"date": "2025-12-11", "count": 390},
    {"date": "2025-12-12", "count": 310},
    {"date": "2025-12-13", "count": 250}
  ]
}
```

---

## Sync API

### Get Sync Status

```
GET /api/sync/status
```

Returns current synchronization status with Langfuse.

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
| `running` | Sync currently in progress |
| `rate_limited` | Hit Langfuse rate limits, will retry |
| `error` | Sync failed with error |

---

### Trigger Manual Sync

```
POST /api/sync/trigger
```

Manually triggers a data sync from Langfuse. Runs in background.

**Response:**

```json
{
  "status": "started",
  "message": "Sync job started - fetching from Langfuse API"
}
```

**Note:** The sync runs asynchronously. Poll `/api/sync/status` to monitor progress.

---

## Health Check

### Health Endpoint

```
GET /health
```

Returns service health status. Used by Docker health checks.

**Response:**

```json
{
  "status": "healthy"
}
```

---

## Error Responses

### Standard Error Format

```json
{
  "detail": "Error message describing what went wrong"
}
```

### HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 404 | Resource not found (e.g., session or agent) |
| 422 | Validation error (invalid parameters) |
| 500 | Internal server error |

---

## Pagination

List endpoints return paginated results with metadata:

```json
{
  "data": [...],
  "meta": {
    "total": 150,    // Total items across all pages
    "page": 1,       // Current page (1-indexed)
    "limit": 50,     // Items per page
    "pages": 3       // Total pages
  }
}
```

---

## Time Range Filtering

Many endpoints support `time_range` filtering:

| Value | Description |
|-------|-------------|
| `24h` | Last 24 hours |
| `7d` | Last 7 days |
| `30d` | Last 30 days |
| `all` | All time (no filter) |

Time filtering uses `created_at` or `timestamp` fields depending on the resource.
