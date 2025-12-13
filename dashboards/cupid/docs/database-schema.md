# Database Schema

The Cupid Dashboard uses SQLite for local data storage. Data is synced from Langfuse and stored locally for fast queries without hitting API rate limits.

## Database Location

```
/app/data/cupid.db        # Inside Docker container
./data/cupid.db           # Host mount (persistent)
```

## Tables Overview

| Table | Purpose | Row Count |
|-------|---------|-----------|
| `sync_metadata` | Sync state tracking | 1 (singleton) |
| `sessions` | Game sessions | ~10-100 |
| `traces` | Agent executions | ~100-1000 |
| `observations` | LLM operations | ~300-3000 |
| `agent_stats_cache` | Pre-computed agent stats | 12 (one per agent) |
| `daily_metrics` | Pre-computed daily aggregates | ~30 (last 30 days) |

---

## Table: `sync_metadata`

Tracks synchronization state with Langfuse. Single-row singleton table.

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER PRIMARY KEY | Always 1 (singleton) |
| `last_sync_at` | TEXT | ISO timestamp of last successful sync |
| `last_trace_timestamp` | TEXT | Latest trace timestamp synced |
| `sync_status` | TEXT | Current status: `idle`, `running`, `rate_limited`, `error` |
| `error_message` | TEXT | Last error message (if any) |
| `updated_at` | TEXT | Auto-updated timestamp |

**Constraint:** `CHECK (id = 1)` ensures single row.

---

## Table: `sessions`

Game sessions (one per player conversation thread).

| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT PRIMARY KEY | Langfuse session ID (e.g., `thr_xxx`) |
| `created_at` | TEXT NOT NULL | Session creation timestamp |
| `environment` | TEXT | Environment name |
| `trace_count` | INTEGER | Total traces in session |
| `total_cost` | REAL | Cumulative LLM costs (USD) |
| `avg_latency` | REAL | Average latency across traces |
| `first_trace_at` | TEXT | First trace timestamp |
| `last_trace_at` | TEXT | Last trace timestamp |
| `mortal_name` | TEXT | Player character name |
| `match_name` | TEXT | Match character name |
| `max_chapter` | INTEGER | Highest chapter reached (0-6) |
| `is_complete` | INTEGER | 1=completed, 0=incomplete |
| `tags_json` | TEXT | JSON array of trace tags |
| `synced_at` | TEXT | Last sync timestamp |

**Indexes:**
- `idx_sessions_created_at` on `created_at`
- `idx_sessions_is_complete` on `is_complete`

---

## Table: `traces`

Individual execution traces (one per agent workflow run).

| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT PRIMARY KEY | Unique trace ID |
| `session_id` | TEXT | Foreign key → `sessions.id` |
| `user_id` | TEXT | User identifier |
| `name` | TEXT | Trace name (usually "Agent workflow") |
| `timestamp` | TEXT NOT NULL | Execution timestamp |
| `total_cost` | REAL | LLM cost for this trace (USD) |
| `latency` | REAL | Execution latency (seconds) |
| `input_json` | TEXT | Serialized input data |
| `output_json` | TEXT | Serialized output data |
| `metadata_json` | TEXT | Custom metadata JSON |
| `tags_json` | TEXT | JSON array of tags |
| `chapter` | TEXT | Chapter tag (e.g., `chapter_1`) |
| `mortal_name` | TEXT | Extracted from metadata |
| `match_name` | TEXT | Extracted from metadata |
| `synced_at` | TEXT | Last sync timestamp |

**Indexes:**
- `idx_traces_session_id` on `session_id`
- `idx_traces_timestamp` on `timestamp`
- `idx_traces_chapter` on `chapter`

---

## Table: `observations`

Fine-grained operation records (agents, LLM generations, tool calls).

| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT PRIMARY KEY | Unique observation ID |
| `trace_id` | TEXT | Foreign key → `traces.id` |
| `parent_observation_id` | TEXT | Self-referential for nesting |
| `type` | TEXT NOT NULL | `AGENT`, `GENERATION`, `TOOL_CALL`, etc. |
| `name` | TEXT | Agent or operation name |
| `start_time` | TEXT | ISO timestamp start |
| `end_time` | TEXT | ISO timestamp end |
| `latency_ms` | REAL | Calculated latency (milliseconds) |
| `model` | TEXT | Model name (e.g., `gpt-4.1-mini`) |
| `total_tokens` | INTEGER | Total tokens consumed |
| `prompt_tokens` | INTEGER | Input tokens |
| `completion_tokens` | INTEGER | Output tokens |
| `calculated_total_cost` | REAL | Calculated LLM cost (USD) |
| `input_json` | TEXT | Serialized input |
| `output_json` | TEXT | Serialized output |
| `metadata_json` | TEXT | Custom metadata |
| `level` | TEXT | Log level: `INFO`, `ERROR`, `WARNING` |
| `synced_at` | TEXT | Last sync timestamp |

**Indexes:**
- `idx_observations_trace_id` on `trace_id`
- `idx_observations_type` on `type`
- `idx_observations_name` on `name`
- `idx_observations_parent` on `parent_observation_id`

---

## Table: `agent_stats_cache`

Pre-computed agent performance statistics. Refreshed during sync.

| Column | Type | Description |
|--------|------|-------------|
| `agent_name` | TEXT PRIMARY KEY | Agent identifier |
| `execution_count` | INTEGER | Total executions |
| `total_latency_ms` | REAL | Sum of all latencies |
| `avg_latency_ms` | REAL | Average latency |
| `total_cost` | REAL | Cumulative cost (USD) |
| `total_tokens` | INTEGER | Total tokens used |
| `error_count` | INTEGER | Number of errors |
| `success_rate` | REAL | Percentage (0-100) |
| `last_execution_at` | TEXT | Latest execution timestamp |
| `updated_at` | TEXT | Cache refresh timestamp |

**Note:** Cost and tokens are aggregated from child `GENERATION` observations, not the `AGENT` observation itself.

---

## Table: `daily_metrics`

Pre-computed daily aggregates. Refreshed during sync (last 30 days).

| Column | Type | Description |
|--------|------|-------------|
| `date` | TEXT PRIMARY KEY | Date string (YYYY-MM-DD) |
| `session_count` | INTEGER | Unique sessions that day |
| `trace_count` | INTEGER | Total traces that day |
| `total_cost` | REAL | Daily LLM costs (USD) |
| `avg_latency` | REAL | Daily average latency |
| `updated_at` | TEXT | Cache update timestamp |

**Index:** `idx_daily_metrics_date` on `date`

---

## Data Refresh Logic

### Session Stats Refresh

After syncing raw data, session statistics are computed:

```sql
UPDATE sessions SET
    trace_count = (SELECT COUNT(*) FROM traces WHERE traces.session_id = sessions.id),
    total_cost = (SELECT COALESCE(SUM(total_cost), 0) FROM traces ...),
    avg_latency = (SELECT COALESCE(AVG(latency), 0) FROM traces ...),
    first_trace_at = (SELECT MIN(timestamp) FROM traces ...),
    last_trace_at = (SELECT MAX(timestamp) FROM traces ...),
    mortal_name = (SELECT mortal_name FROM traces ... LIMIT 1),
    match_name = (SELECT match_name FROM traces ... LIMIT 1),
    max_chapter = (SELECT MAX(CAST(REPLACE(chapter, 'chapter_', '') AS INTEGER)) ...)
```

### Completion Detection

```sql
UPDATE sessions SET is_complete = CASE
    WHEN max_chapter >= 5 THEN 1
    WHEN EXISTS (
        SELECT 1 FROM observations o
        JOIN traces t ON o.trace_id = t.id
        WHERE t.session_id = sessions.id
        AND o.name = 'End' AND o.type = 'AGENT'
    ) THEN 1
    ELSE 0
END
```

### Agent Stats Refresh

Agent statistics are computed by joining `AGENT` observations with their child `GENERATION` observations:

```sql
SELECT
    a.name,
    COUNT(DISTINCT a.id) as execution_count,
    COALESCE(SUM(g.calculated_total_cost), 0) as total_cost,
    COALESCE(SUM(g.total_tokens), 0) as total_tokens,
    ...
FROM observations a
LEFT JOIN observations g
    ON g.parent_observation_id = a.id
    AND g.type = 'GENERATION'
WHERE a.type = 'AGENT' AND a.name != 'Agent workflow'
GROUP BY a.name
```

### Daily Metrics Refresh

```sql
SELECT
    DATE(timestamp) as date,
    COUNT(DISTINCT session_id) as session_count,
    COUNT(*) as trace_count,
    COALESCE(SUM(total_cost), 0) as total_cost,
    COALESCE(AVG(latency), 0) as avg_latency
FROM traces
WHERE timestamp IS NOT NULL
GROUP BY DATE(timestamp)
ORDER BY date DESC
LIMIT 30
```

---

## Schema Initialization

The database schema is created on application startup via `init_db()` in `/backend/app/database/schema.py`. Tables are created with `IF NOT EXISTS` to ensure idempotent initialization.
