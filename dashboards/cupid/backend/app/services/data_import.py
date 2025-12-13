"""Import data from JSON files (downloaded from Langfuse)."""

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from app.database import get_db


async def import_from_json(json_path: str) -> dict[str, Any]:
    """Import data from a langfuse-data.json file."""
    path = Path(json_path)
    if not path.exists():
        return {"error": f"File not found: {json_path}"}

    with open(path) as f:
        data = json.load(f)

    sessions_imported = 0
    traces_imported = 0
    observations_imported = 0

    async with get_db() as db:
        now = datetime.now(timezone.utc).isoformat()

        # Import sessions
        for session in data.get("sessions", []):
            await db.execute(
                """
                INSERT OR REPLACE INTO sessions (id, created_at, environment, synced_at)
                VALUES (?, ?, ?, ?)
                """,
                (
                    session["id"],
                    session.get("createdAt", ""),
                    session.get("environment", ""),
                    now,
                ),
            )
            sessions_imported += 1

        # Import traces
        for trace in data.get("traces", []):
            metadata = trace.get("metadata", {}) or {}
            tags = trace.get("tags", []) or []
            chapter = next((t for t in tags if t.startswith("chapter_")), None)

            await db.execute(
                """
                INSERT OR REPLACE INTO traces
                (id, session_id, user_id, name, timestamp, total_cost, latency,
                 metadata_json, tags_json, chapter, mortal_name, match_name, synced_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    trace["id"],
                    trace.get("sessionId"),
                    trace.get("userId"),
                    trace.get("name"),
                    trace.get("timestamp"),
                    trace.get("totalCost", 0),
                    trace.get("latency", 0),
                    json.dumps(metadata),
                    json.dumps(tags),
                    chapter,
                    metadata.get("mortal"),
                    metadata.get("match"),
                    now,
                ),
            )
            traces_imported += 1

        # Import observations
        for obs in data.get("observations", []):
            start_time = obs.get("startTime")
            end_time = obs.get("endTime")
            latency_ms = None
            if start_time and end_time:
                try:
                    start = datetime.fromisoformat(start_time.replace("Z", "+00:00"))
                    end = datetime.fromisoformat(end_time.replace("Z", "+00:00"))
                    latency_ms = (end - start).total_seconds() * 1000
                except Exception:
                    pass

            await db.execute(
                """
                INSERT OR REPLACE INTO observations
                (id, trace_id, parent_observation_id, type, name, start_time, end_time,
                 latency_ms, model, total_tokens, prompt_tokens, completion_tokens,
                 calculated_total_cost, input_json, output_json, metadata_json, level, synced_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    obs["id"],
                    obs.get("traceId"),
                    obs.get("parentObservationId"),
                    obs.get("type"),
                    obs.get("name"),
                    start_time,
                    end_time,
                    latency_ms,
                    obs.get("model"),
                    obs.get("totalTokens"),
                    obs.get("promptTokens"),
                    obs.get("completionTokens"),
                    obs.get("calculatedTotalCost"),
                    json.dumps(obs.get("input")) if obs.get("input") else None,
                    json.dumps(obs.get("output")) if obs.get("output") else None,
                    json.dumps(obs.get("metadata")) if obs.get("metadata") else None,
                    obs.get("level"),
                    now,
                ),
            )
            observations_imported += 1

        await db.commit()

        # Refresh session stats
        await _refresh_session_stats(db)
        await _refresh_agent_stats(db)
        await _refresh_daily_metrics(db)

        # Update sync status
        await db.execute(
            """
            UPDATE sync_metadata
            SET sync_status = 'idle', last_sync_at = ?, error_message = NULL
            WHERE id = 1
            """,
            (now,),
        )
        await db.commit()

    return {
        "sessions_imported": sessions_imported,
        "traces_imported": traces_imported,
        "observations_imported": observations_imported,
    }


async def _refresh_session_stats(db) -> None:
    """Refresh session statistics from traces."""
    await db.execute(
        """
        UPDATE sessions SET
            trace_count = (
                SELECT COUNT(*) FROM traces WHERE traces.session_id = sessions.id
            ),
            total_cost = (
                SELECT COALESCE(SUM(total_cost), 0) FROM traces WHERE traces.session_id = sessions.id
            ),
            avg_latency = (
                SELECT COALESCE(AVG(latency), 0) FROM traces WHERE traces.session_id = sessions.id
            ),
            first_trace_at = (
                SELECT MIN(timestamp) FROM traces WHERE traces.session_id = sessions.id
            ),
            last_trace_at = (
                SELECT MAX(timestamp) FROM traces WHERE traces.session_id = sessions.id
            ),
            mortal_name = (
                SELECT mortal_name FROM traces WHERE traces.session_id = sessions.id AND mortal_name IS NOT NULL LIMIT 1
            ),
            match_name = (
                SELECT match_name FROM traces WHERE traces.session_id = sessions.id AND match_name IS NOT NULL LIMIT 1
            ),
            max_chapter = (
                SELECT COALESCE(MAX(CAST(REPLACE(chapter, 'chapter_', '') AS INTEGER)), -1)
                FROM traces WHERE traces.session_id = sessions.id AND chapter IS NOT NULL
            )
        """
    )

    await db.execute(
        """
        UPDATE sessions SET is_complete = CASE
            WHEN max_chapter >= 5 THEN 1
            WHEN EXISTS (
                SELECT 1 FROM observations o
                JOIN traces t ON o.trace_id = t.id
                WHERE t.session_id = sessions.id AND o.name = 'End' AND o.type = 'AGENT'
            ) THEN 1
            ELSE 0
        END
        """
    )
    await db.commit()


async def _refresh_agent_stats(db) -> None:
    """Refresh agent stats cache."""
    await db.execute("DELETE FROM agent_stats_cache")

    # Cost and tokens are on child GENERATION observations, so we join to get them
    cursor = await db.execute(
        """
        SELECT
            a.name,
            COUNT(DISTINCT a.id) as execution_count,
            COALESCE(SUM(a.latency_ms), 0) as total_latency_ms,
            COALESCE(AVG(a.latency_ms), 0) as avg_latency_ms,
            COALESCE(SUM(g.calculated_total_cost), 0) as total_cost,
            COALESCE(SUM(g.total_tokens), 0) as total_tokens,
            SUM(CASE WHEN a.level = 'ERROR' THEN 1 ELSE 0 END) as error_count,
            MAX(a.start_time) as last_execution_at
        FROM observations a
        LEFT JOIN observations g ON g.parent_observation_id = a.id AND g.type = 'GENERATION'
        WHERE a.type = 'AGENT' AND a.name != 'Agent workflow' AND a.name IS NOT NULL
        GROUP BY a.name
        """
    )
    rows = await cursor.fetchall()

    now = datetime.now(timezone.utc).isoformat()
    for row in rows:
        execution_count = row["execution_count"]
        error_count = row["error_count"] or 0
        success_rate = (
            ((execution_count - error_count) / execution_count * 100)
            if execution_count > 0
            else 100
        )

        await db.execute(
            """
            INSERT INTO agent_stats_cache
            (agent_name, execution_count, total_latency_ms, avg_latency_ms,
             total_cost, total_tokens, error_count, success_rate, last_execution_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                row["name"],
                execution_count,
                row["total_latency_ms"],
                row["avg_latency_ms"],
                row["total_cost"],
                row["total_tokens"],
                error_count,
                success_rate,
                row["last_execution_at"],
                now,
            ),
        )

    await db.commit()


async def _refresh_daily_metrics(db) -> None:
    """Refresh daily metrics cache."""
    await db.execute("DELETE FROM daily_metrics")

    cursor = await db.execute(
        """
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
        """
    )
    rows = await cursor.fetchall()

    now = datetime.now(timezone.utc).isoformat()
    for row in rows:
        await db.execute(
            """
            INSERT INTO daily_metrics (date, session_count, trace_count, total_cost, avg_latency, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                row["date"],
                row["session_count"],
                row["trace_count"],
                row["total_cost"],
                row["avg_latency"],
                now,
            ),
        )

    await db.commit()
