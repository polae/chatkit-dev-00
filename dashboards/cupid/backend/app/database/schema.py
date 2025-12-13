SCHEMA = """
-- Sync metadata
CREATE TABLE IF NOT EXISTS sync_metadata (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    last_sync_at TEXT,
    last_trace_timestamp TEXT,
    sync_status TEXT DEFAULT 'idle',
    error_message TEXT,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Sessions
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    environment TEXT,
    trace_count INTEGER DEFAULT 0,
    total_cost REAL DEFAULT 0,
    avg_latency REAL DEFAULT 0,
    first_trace_at TEXT,
    last_trace_at TEXT,
    mortal_name TEXT,
    match_name TEXT,
    max_chapter INTEGER DEFAULT -1,
    is_complete INTEGER DEFAULT 0,
    tags_json TEXT,
    synced_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_is_complete ON sessions(is_complete);

-- Traces
CREATE TABLE IF NOT EXISTS traces (
    id TEXT PRIMARY KEY,
    session_id TEXT,
    user_id TEXT,
    name TEXT,
    timestamp TEXT NOT NULL,
    total_cost REAL,
    latency REAL,
    input_json TEXT,
    output_json TEXT,
    metadata_json TEXT,
    tags_json TEXT,
    chapter TEXT,
    mortal_name TEXT,
    match_name TEXT,
    synced_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES sessions(id)
);

CREATE INDEX IF NOT EXISTS idx_traces_session_id ON traces(session_id);
CREATE INDEX IF NOT EXISTS idx_traces_timestamp ON traces(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_traces_chapter ON traces(chapter);

-- Observations
CREATE TABLE IF NOT EXISTS observations (
    id TEXT PRIMARY KEY,
    trace_id TEXT NOT NULL,
    parent_observation_id TEXT,
    type TEXT NOT NULL,
    name TEXT,
    start_time TEXT,
    end_time TEXT,
    latency_ms REAL,
    model TEXT,
    total_tokens INTEGER,
    prompt_tokens INTEGER,
    completion_tokens INTEGER,
    calculated_total_cost REAL,
    input_json TEXT,
    output_json TEXT,
    metadata_json TEXT,
    level TEXT,
    synced_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (trace_id) REFERENCES traces(id),
    FOREIGN KEY (parent_observation_id) REFERENCES observations(id)
);

CREATE INDEX IF NOT EXISTS idx_observations_trace_id ON observations(trace_id);
CREATE INDEX IF NOT EXISTS idx_observations_type ON observations(type);
CREATE INDEX IF NOT EXISTS idx_observations_name ON observations(name);
CREATE INDEX IF NOT EXISTS idx_observations_parent ON observations(parent_observation_id);

-- Agent stats cache
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

-- Daily metrics cache
CREATE TABLE IF NOT EXISTS daily_metrics (
    date TEXT PRIMARY KEY,
    session_count INTEGER DEFAULT 0,
    trace_count INTEGER DEFAULT 0,
    total_cost REAL DEFAULT 0,
    avg_latency REAL DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_daily_metrics_date ON daily_metrics(date DESC);

-- Initialize sync metadata
INSERT OR IGNORE INTO sync_metadata (id, sync_status) VALUES (1, 'idle');
"""
