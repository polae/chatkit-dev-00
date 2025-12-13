import asyncio
import json
import logging
from datetime import datetime, timezone
from typing import Any

from app.database import get_db
from app.config import settings
from .langfuse_client import LangfuseClient, RateLimitError

logger = logging.getLogger(__name__)

# Delay between paginated API requests to avoid rate limits
REQUEST_DELAY_MS = 300


class SyncService:
    """Background sync service for Langfuse data."""

    def __init__(self):
        self.client = LangfuseClient()
        self._last_sync_counts: dict[str, int] = {}

    async def sync(self) -> None:
        """Main sync entry point."""
        try:
            logger.info("Starting Langfuse sync...")
            await self._update_status("running")

            # 1. Sync sessions
            session_count = await self._sync_sessions()
            logger.info(f"Synced {session_count} sessions")

            # 2. Sync traces
            trace_count = await self._sync_traces()
            logger.info(f"Synced {trace_count} traces")

            # 3. Sync observations for traces
            obs_count = await self._sync_observations()
            logger.info(f"Synced {obs_count} observations")

            # 4. Refresh caches
            await self._refresh_session_stats()
            await self._refresh_agent_stats()
            await self._refresh_daily_metrics()
            logger.info("Refreshed stats caches")

            # 5. Verify sync completeness
            await self._verify_sync()

            await self._update_status("idle")
            logger.info("Sync completed successfully")

        except RateLimitError as e:
            logger.warning(f"Rate limited during sync: {e}")
            await self._update_status("rate_limited", str(e))
            # Will retry next cycle

        except Exception as e:
            logger.error(f"Sync failed: {e}")
            await self._update_status("error", str(e))
            raise

    async def _update_status(
        self, status: str, error: str | None = None
    ) -> None:
        """Update sync status in database."""
        async with get_db() as db:
            now = datetime.now(timezone.utc).isoformat()
            await db.execute(
                """
                UPDATE sync_metadata
                SET sync_status = ?, error_message = ?, updated_at = ?,
                    last_sync_at = CASE WHEN ? = 'idle' THEN ? ELSE last_sync_at END
                WHERE id = 1
                """,
                (status, error, now, status, now),
            )
            await db.commit()

    async def _get_last_trace_timestamp(self) -> str | None:
        """Get last synced trace timestamp for incremental sync."""
        async with get_db() as db:
            cursor = await db.execute(
                "SELECT last_trace_timestamp FROM sync_metadata WHERE id = 1"
            )
            row = await cursor.fetchone()
            return row["last_trace_timestamp"] if row else None

    async def _set_last_trace_timestamp(self, timestamp: str) -> None:
        """Update last synced trace timestamp."""
        async with get_db() as db:
            await db.execute(
                "UPDATE sync_metadata SET last_trace_timestamp = ? WHERE id = 1",
                (timestamp,),
            )
            await db.commit()

    async def _sync_sessions(self) -> int:
        """Sync ALL sessions from Langfuse with full pagination."""
        sessions = []
        page = 1
        total_items = None

        while True:
            result = await self.client.get_sessions(limit=100, page=page)
            batch = result.get("data", [])
            meta = result.get("meta", {})

            if total_items is None:
                total_items = meta.get("totalItems", 0)
                logger.info(f"Langfuse reports {total_items} total sessions")

            if not batch:
                break
            sessions.extend(batch)

            # Check if we've fetched all pages
            total_pages = meta.get("totalPages", 1)
            if page >= total_pages:
                break
            page += 1
            # Delay between requests to avoid rate limits
            await asyncio.sleep(REQUEST_DELAY_MS / 1000)

        # Verify we got all items
        if total_items and len(sessions) < total_items:
            logger.warning(
                f"Session sync incomplete: got {len(sessions)} of {total_items}"
            )

        async with get_db() as db:
            for session in sessions:
                await db.execute(
                    """
                    INSERT OR REPLACE INTO sessions (id, created_at, environment, synced_at)
                    VALUES (?, ?, ?, ?)
                    """,
                    (
                        session["id"],
                        session.get("createdAt", ""),
                        session.get("environment", ""),
                        datetime.now(timezone.utc).isoformat(),
                    ),
                )
            await db.commit()

        self._last_sync_counts["sessions"] = len(sessions)
        return len(sessions)

    async def _sync_traces(self) -> int:
        """Sync traces from Langfuse with incremental sync and full pagination."""
        # Get last sync timestamp for incremental sync
        last_timestamp = await self._get_last_trace_timestamp()
        is_incremental = last_timestamp is not None

        if is_incremental:
            logger.info(f"Incremental trace sync from {last_timestamp}")
        else:
            logger.info("Full trace sync (initial)")

        traces = []
        page = 1
        total_items = None
        latest_timestamp = last_timestamp  # Track newest timestamp seen

        while True:
            result = await self.client.get_traces(
                limit=100,
                page=page,
                from_timestamp=last_timestamp,
                order_by="timestamp.asc",  # Oldest first for resume support
            )
            batch = result.get("data", [])
            meta = result.get("meta", {})

            if total_items is None:
                total_items = meta.get("totalItems", 0)
                logger.info(f"Langfuse reports {total_items} traces to sync")

            if not batch:
                break

            traces.extend(batch)

            # Track the latest timestamp for next incremental sync
            for trace in batch:
                ts = trace.get("timestamp")
                if ts and (latest_timestamp is None or ts > latest_timestamp):
                    latest_timestamp = ts

            # Check if we've fetched all pages
            total_pages = meta.get("totalPages", 1)
            if page >= total_pages:
                break
            page += 1
            # Delay between requests to avoid rate limits
            await asyncio.sleep(REQUEST_DELAY_MS / 1000)

        # Verify we got all items
        if total_items and len(traces) < total_items:
            logger.warning(
                f"Trace sync incomplete: got {len(traces)} of {total_items}"
            )

        async with get_db() as db:
            for trace in traces:
                metadata = trace.get("metadata", {}) or {}
                tags = trace.get("tags", []) or []
                chapter = next(
                    (t for t in tags if t.startswith("chapter_")), None
                )

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
                        datetime.now(timezone.utc).isoformat(),
                    ),
                )
            await db.commit()

        # Update last trace timestamp for next incremental sync
        if latest_timestamp:
            await self._set_last_trace_timestamp(latest_timestamp)
            logger.info(f"Updated last_trace_timestamp to {latest_timestamp}")

        self._last_sync_counts["traces"] = len(traces)
        return len(traces)

    async def _sync_observations(self) -> int:
        """Sync ALL observations from Langfuse with full pagination."""
        observations = []
        page = 1
        total_items = None

        while True:
            result = await self.client.get_observations(limit=100, page=page)
            batch = result.get("data", [])
            meta = result.get("meta", {})

            if total_items is None:
                total_items = meta.get("totalItems", 0)
                logger.info(f"Langfuse reports {total_items} total observations")

            if not batch:
                break
            observations.extend(batch)

            # Check if we've fetched all pages
            total_pages = meta.get("totalPages", 1)
            if page >= total_pages:
                break
            page += 1
            # Delay between requests to avoid rate limits
            await asyncio.sleep(REQUEST_DELAY_MS / 1000)

        # Verify we got all items
        if total_items and len(observations) < total_items:
            logger.warning(
                f"Observation sync incomplete: got {len(observations)} of {total_items}"
            )

        async with get_db() as db:
            for obs in observations:
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
                        datetime.now(timezone.utc).isoformat(),
                    ),
                )
            await db.commit()

        self._last_sync_counts["observations"] = len(observations)
        return len(observations)

    async def _refresh_session_stats(self) -> None:
        """Refresh session statistics from traces."""
        async with get_db() as db:
            # Update session stats from traces
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

            # Update is_complete based on max_chapter or End agent
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

    async def _refresh_agent_stats(self) -> None:
        """Refresh agent stats cache."""
        async with get_db() as db:
            # Clear and rebuild agent stats
            await db.execute("DELETE FROM agent_stats_cache")

            # Get stats for each agent from observations
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

    async def _refresh_daily_metrics(self) -> None:
        """Refresh daily metrics cache."""
        async with get_db() as db:
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

    async def _verify_sync(self) -> None:
        """Verify sync completeness by comparing local counts vs synced counts."""
        async with get_db() as db:
            # Get local counts
            cursor = await db.execute("SELECT COUNT(*) as cnt FROM sessions")
            local_sessions = (await cursor.fetchone())["cnt"]

            cursor = await db.execute("SELECT COUNT(*) as cnt FROM traces")
            local_traces = (await cursor.fetchone())["cnt"]

            cursor = await db.execute("SELECT COUNT(*) as cnt FROM observations")
            local_observations = (await cursor.fetchone())["cnt"]

        # Compare with what we synced this cycle
        synced_sessions = self._last_sync_counts.get("sessions", 0)
        synced_traces = self._last_sync_counts.get("traces", 0)
        synced_observations = self._last_sync_counts.get("observations", 0)

        logger.info(
            f"Sync verification - Local DB: {local_sessions} sessions, "
            f"{local_traces} traces, {local_observations} observations"
        )
        logger.info(
            f"Sync verification - This cycle: {synced_sessions} sessions, "
            f"{synced_traces} traces, {synced_observations} observations"
        )

        # Note: Local counts may be higher than synced counts for incremental sync
        # This is expected since we only fetch new data each cycle

    async def get_status(self) -> dict[str, Any]:
        """Get current sync status."""
        async with get_db() as db:
            cursor = await db.execute(
                "SELECT sync_status, last_sync_at, error_message FROM sync_metadata WHERE id = 1"
            )
            row = await cursor.fetchone()

            if row:
                next_sync = None
                if row["last_sync_at"]:
                    try:
                        last = datetime.fromisoformat(row["last_sync_at"].replace("Z", "+00:00"))
                        from datetime import timedelta
                        next_sync = (last + timedelta(seconds=settings.sync_interval_seconds)).isoformat()
                    except Exception:
                        pass

                return {
                    "status": row["sync_status"],
                    "last_sync_at": row["last_sync_at"],
                    "next_sync_at": next_sync,
                    "error_message": row["error_message"],
                }

            return {"status": "unknown", "last_sync_at": None, "next_sync_at": None, "error_message": None}
