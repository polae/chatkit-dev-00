import json
from datetime import datetime, timedelta, timezone
from typing import Any

from app.database import get_db


# Agent categories for Cupid
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

CHAPTER_NAMES = {
    0: "Introduction",
    1: "Mortal",
    2: "Match",
    3: "Compatibility",
    4: "Story",
    5: "Evaluation",
    6: "End",
}


def _get_time_filter(time_range: str) -> str | None:
    """Get SQL timestamp filter for time range."""
    now = datetime.now(timezone.utc)
    if time_range == "24h":
        cutoff = now - timedelta(hours=24)
    elif time_range == "7d":
        cutoff = now - timedelta(days=7)
    elif time_range == "30d":
        cutoff = now - timedelta(days=30)
    else:
        return None
    return cutoff.isoformat()


class AnalyticsService:
    """Query service for dashboard analytics."""

    async def get_sessions(
        self,
        time_range: str = "all",
        status: str = "all",
        search: str | None = None,
        page: int = 1,
        limit: int = 50,
    ) -> dict[str, Any]:
        """Get sessions with filters."""
        conditions = []
        params: list[Any] = []

        time_filter = _get_time_filter(time_range)
        if time_filter:
            conditions.append("created_at >= ?")
            params.append(time_filter)

        if status == "complete":
            conditions.append("is_complete = 1")
        elif status == "incomplete":
            conditions.append("is_complete = 0")

        if search:
            conditions.append(
                "(id LIKE ? OR mortal_name LIKE ? OR match_name LIKE ?)"
            )
            search_pattern = f"%{search}%"
            params.extend([search_pattern, search_pattern, search_pattern])

        where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""

        async with get_db() as db:
            # Get total count
            cursor = await db.execute(
                f"SELECT COUNT(*) as count FROM sessions {where_clause}",
                params,
            )
            row = await cursor.fetchone()
            total = row["count"] if row else 0

            # Get paginated results
            offset = (page - 1) * limit
            cursor = await db.execute(
                f"""
                SELECT
                    id, created_at, trace_count, total_cost, avg_latency,
                    mortal_name, match_name, max_chapter, is_complete,
                    first_trace_at, last_trace_at
                FROM sessions
                {where_clause}
                ORDER BY created_at DESC
                LIMIT ? OFFSET ?
                """,
                params + [limit, offset],
            )
            rows = await cursor.fetchall()

            sessions = []
            for row in rows:
                duration = None
                if row["first_trace_at"] and row["last_trace_at"]:
                    try:
                        first = datetime.fromisoformat(row["first_trace_at"].replace("Z", "+00:00"))
                        last = datetime.fromisoformat(row["last_trace_at"].replace("Z", "+00:00"))
                        duration = (last - first).total_seconds()
                    except Exception:
                        pass

                sessions.append({
                    "id": row["id"],
                    "created_at": row["created_at"],
                    "trace_count": row["trace_count"],
                    "total_cost": row["total_cost"],
                    "avg_latency": row["avg_latency"],
                    "mortal_name": row["mortal_name"],
                    "match_name": row["match_name"],
                    "max_chapter": row["max_chapter"],
                    "is_complete": bool(row["is_complete"]),
                    "first_trace_at": row["first_trace_at"],
                    "last_trace_at": row["last_trace_at"],
                    "duration_seconds": duration,
                })

            return {
                "data": sessions,
                "meta": {
                    "total": total,
                    "page": page,
                    "limit": limit,
                    "pages": (total + limit - 1) // limit,
                },
            }

    async def get_session_stats(self, time_range: str = "all") -> dict[str, Any]:
        """Get aggregate session statistics."""
        conditions = []
        params: list[Any] = []

        time_filter = _get_time_filter(time_range)
        if time_filter:
            conditions.append("created_at >= ?")
            params.append(time_filter)

        where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""

        async with get_db() as db:
            cursor = await db.execute(
                f"""
                SELECT
                    COUNT(*) as total_sessions,
                    COALESCE(SUM(total_cost), 0) as total_cost,
                    COALESCE(AVG(avg_latency), 0) as avg_latency,
                    SUM(CASE WHEN is_complete = 1 THEN 1 ELSE 0 END) as complete_sessions,
                    SUM(CASE WHEN is_complete = 0 THEN 1 ELSE 0 END) as incomplete_sessions
                FROM sessions
                {where_clause}
                """,
                params,
            )
            row = await cursor.fetchone()

            # Calculate average duration
            duration_where = f"{where_clause} AND first_trace_at IS NOT NULL AND last_trace_at IS NOT NULL" if where_clause else "WHERE first_trace_at IS NOT NULL AND last_trace_at IS NOT NULL"
            cursor = await db.execute(
                f"""
                SELECT
                    AVG(
                        julianday(last_trace_at) - julianday(first_trace_at)
                    ) * 86400 as avg_duration
                FROM sessions
                {duration_where}
                """,
                params,
            )
            duration_row = await cursor.fetchone()

            return {
                "total_sessions": row["total_sessions"] if row else 0,
                "total_cost": row["total_cost"] if row else 0,
                "avg_duration_seconds": duration_row["avg_duration"] if duration_row and duration_row["avg_duration"] else 0,
                "avg_latency_seconds": row["avg_latency"] if row else 0,
                "complete_sessions": row["complete_sessions"] if row else 0,
                "incomplete_sessions": row["incomplete_sessions"] if row else 0,
            }

    async def get_conversation(self, session_id: str) -> dict[str, Any]:
        """Get full conversation for a session."""
        async with get_db() as db:
            # Get session info
            cursor = await db.execute(
                """
                SELECT id, mortal_name, match_name, max_chapter, is_complete, total_cost,
                       first_trace_at, last_trace_at
                FROM sessions WHERE id = ?
                """,
                (session_id,),
            )
            session_row = await cursor.fetchone()

            if not session_row:
                return {"session": None, "messages": []}

            duration = None
            if session_row["first_trace_at"] and session_row["last_trace_at"]:
                try:
                    first = datetime.fromisoformat(session_row["first_trace_at"].replace("Z", "+00:00"))
                    last = datetime.fromisoformat(session_row["last_trace_at"].replace("Z", "+00:00"))
                    duration = (last - first).total_seconds()
                except Exception:
                    pass

            session = {
                "id": session_row["id"],
                "mortal_name": session_row["mortal_name"],
                "match_name": session_row["match_name"],
                "max_chapter": session_row["max_chapter"],
                "is_complete": bool(session_row["is_complete"]),
                "total_cost": session_row["total_cost"],
                "duration_seconds": duration,
            }

            # Get traces for this session
            cursor = await db.execute(
                """
                SELECT id, chapter, timestamp FROM traces
                WHERE session_id = ?
                ORDER BY timestamp ASC
                """,
                (session_id,),
            )
            traces = await cursor.fetchall()
            trace_ids = [t["id"] for t in traces]
            trace_chapters = {t["id"]: t["chapter"] for t in traces}

            if not trace_ids:
                return {"session": session, "messages": []}

            # Get observations for these traces
            placeholders = ",".join("?" * len(trace_ids))
            cursor = await db.execute(
                f"""
                SELECT
                    o.id, o.trace_id, o.parent_observation_id, o.type, o.name,
                    o.start_time, o.end_time, o.latency_ms, o.model,
                    o.total_tokens, o.prompt_tokens, o.completion_tokens,
                    o.calculated_total_cost, o.input_json, o.output_json
                FROM observations o
                WHERE o.trace_id IN ({placeholders})
                ORDER BY o.start_time ASC
                """,
                trace_ids,
            )
            observations = await cursor.fetchall()

            # Build parent observation lookup for agent name resolution
            obs_map = {obs["id"]: obs for obs in observations}

            def get_parent_agent_name(obs: dict) -> str:
                """Find the agent name for an observation."""
                if obs["type"] == "AGENT" and obs["name"] != "Agent workflow":
                    return obs["name"]

                current = obs
                while current["parent_observation_id"]:
                    parent = obs_map.get(current["parent_observation_id"])
                    if not parent:
                        break
                    if parent["type"] == "AGENT" and parent["name"] != "Agent workflow":
                        return parent["name"]
                    current = parent

                return "Unknown"

            messages = []
            for obs in observations:
                if obs["type"] != "GENERATION":
                    continue

                agent_name = get_parent_agent_name(obs)
                chapter = trace_chapters.get(obs["trace_id"])

                # Extract user input
                if obs["input_json"]:
                    try:
                        input_data = json.loads(obs["input_json"])
                        user_input = self._extract_user_input(input_data)
                        if user_input:
                            messages.append({
                                "type": "user",
                                "timestamp": obs["start_time"],
                                "chapter": chapter,
                                "agent": None,
                                "content": user_input,
                                "metadata": None,
                            })
                    except Exception:
                        pass

                # Extract agent output
                if obs["output_json"]:
                    try:
                        output_data = json.loads(obs["output_json"])
                        agent_output = self._extract_agent_output(output_data)
                        if agent_output:
                            messages.append({
                                "type": "agent",
                                "timestamp": obs["end_time"] or obs["start_time"],
                                "chapter": chapter,
                                "agent": agent_name,
                                "content": agent_output,
                                "metadata": {
                                    "latency_ms": obs["latency_ms"] or 0,
                                    "cost": obs["calculated_total_cost"] or 0,
                                    "total_tokens": obs["total_tokens"] or 0,
                                    "prompt_tokens": obs["prompt_tokens"] or 0,
                                    "completion_tokens": obs["completion_tokens"] or 0,
                                    "model": obs["model"],
                                },
                            })
                    except Exception:
                        pass

            # Sort by timestamp
            messages.sort(key=lambda m: m["timestamp"] or "")

            return {"session": session, "messages": messages}

    def _extract_user_input(self, input_data: Any) -> str | None:
        """Extract user input from various formats."""
        if not input_data:
            return None

        if isinstance(input_data, list):
            user_messages = [m for m in input_data if isinstance(m, dict) and m.get("role") == "user"]
            if user_messages:
                last_msg = user_messages[-1]
                content = last_msg.get("content")
                if isinstance(content, str):
                    return content
                if isinstance(content, list):
                    texts = [c.get("text", "") for c in content if isinstance(c, dict) and c.get("text")]
                    return " ".join(texts) if texts else None

        if isinstance(input_data, str):
            return input_data

        if isinstance(input_data, dict) and input_data.get("content"):
            content = input_data["content"]
            return content if isinstance(content, str) else None

        return None

    def _extract_agent_output(self, output_data: Any) -> str:
        """Extract agent output from various formats."""
        if not output_data:
            return ""

        if isinstance(output_data, str):
            return output_data

        if isinstance(output_data, dict):
            # OpenAI Responses API format - check this first (most specific)
            if output_data.get("output") and isinstance(output_data["output"], list):
                texts = []
                for item in output_data["output"]:
                    if isinstance(item, dict) and item.get("type") == "message" and item.get("content"):
                        for c in item["content"]:
                            if isinstance(c, dict) and c.get("type") == "output_text" and c.get("text"):
                                texts.append(c["text"])
                if texts:
                    return "\n\n".join(texts)

            # Simple text field (only if it's a string, not schema metadata)
            if output_data.get("text") and isinstance(output_data["text"], str):
                return output_data["text"]

            if output_data.get("content"):
                content = output_data["content"]
                return content if isinstance(content, str) else json.dumps(content)

        return ""

    async def get_agents(self) -> list[dict[str, Any]]:
        """Get all agents with stats."""
        async with get_db() as db:
            cursor = await db.execute(
                """
                SELECT
                    agent_name, execution_count, avg_latency_ms,
                    total_cost, total_tokens, success_rate
                FROM agent_stats_cache
                ORDER BY execution_count DESC
                """
            )
            rows = await cursor.fetchall()

            return [
                {
                    "name": row["agent_name"],
                    "category": AGENT_CATEGORIES.get(row["agent_name"], "unknown"),
                    "execution_count": row["execution_count"],
                    "avg_latency_ms": row["avg_latency_ms"],
                    "total_cost": row["total_cost"],
                    "total_tokens": row["total_tokens"],
                    "success_rate": row["success_rate"],
                }
                for row in rows
            ]

    async def get_agent_detail(self, agent_name: str) -> dict[str, Any] | None:
        """Get agent detail with recent executions."""
        async with get_db() as db:
            # Get stats
            cursor = await db.execute(
                """
                SELECT
                    agent_name, execution_count, avg_latency_ms,
                    total_cost, total_tokens, success_rate
                FROM agent_stats_cache
                WHERE agent_name = ?
                """,
                (agent_name,),
            )
            row = await cursor.fetchone()

            if not row:
                return None

            # Get recent executions
            cursor = await db.execute(
                """
                SELECT
                    o.trace_id, o.start_time, o.latency_ms,
                    o.total_tokens, o.calculated_total_cost, o.level
                FROM observations o
                WHERE o.type = 'AGENT' AND o.name = ?
                ORDER BY o.start_time DESC
                LIMIT 20
                """,
                (agent_name,),
            )
            executions = await cursor.fetchall()

            return {
                "name": row["agent_name"],
                "category": AGENT_CATEGORIES.get(row["agent_name"], "unknown"),
                "stats": {
                    "execution_count": row["execution_count"],
                    "avg_latency_ms": row["avg_latency_ms"],
                    "total_cost": row["total_cost"],
                    "total_tokens": row["total_tokens"],
                    "success_rate": row["success_rate"],
                },
                "recent_executions": [
                    {
                        "trace_id": e["trace_id"],
                        "timestamp": e["start_time"],
                        "latency_ms": e["latency_ms"] or 0,
                        "tokens": e["total_tokens"] or 0,
                        "cost": e["calculated_total_cost"] or 0,
                        "status": "error" if e["level"] == "ERROR" else "success",
                    }
                    for e in executions
                ],
            }

    async def get_agent_charts(self, agent_name: str) -> dict[str, Any]:
        """Get chart data for an agent."""
        async with get_db() as db:
            # Latency over time (last 20 executions)
            cursor = await db.execute(
                """
                SELECT start_time, latency_ms
                FROM observations
                WHERE type = 'AGENT' AND name = ? AND latency_ms IS NOT NULL
                ORDER BY start_time DESC
                LIMIT 20
                """,
                (agent_name,),
            )
            latency_rows = await cursor.fetchall()

            # Executions by hour
            cursor = await db.execute(
                """
                SELECT
                    CAST(strftime('%H', start_time) AS INTEGER) as hour,
                    COUNT(*) as count
                FROM observations
                WHERE type = 'AGENT' AND name = ?
                GROUP BY hour
                ORDER BY hour
                """,
                (agent_name,),
            )
            hourly_rows = await cursor.fetchall()

            # Fill in missing hours
            hourly_map = {r["hour"]: r["count"] for r in hourly_rows}
            hourly_data = [{"hour": h, "count": hourly_map.get(h, 0)} for h in range(24)]

            return {
                "latency_over_time": [
                    {"timestamp": r["start_time"], "latency_ms": r["latency_ms"]}
                    for r in reversed(latency_rows)
                ],
                "executions_by_hour": hourly_data,
            }

    async def get_dashboard_metrics(self, time_range: str = "all") -> dict[str, Any]:
        """Get dashboard KPIs and chart data."""
        conditions = []
        params: list[Any] = []

        time_filter = _get_time_filter(time_range)
        if time_filter:
            conditions.append("timestamp >= ?")
            params.append(time_filter)

        trace_where = f"WHERE {' AND '.join(conditions)}" if conditions else ""

        session_conditions = []
        session_params: list[Any] = []
        if time_filter:
            session_conditions.append("created_at >= ?")
            session_params.append(time_filter)
        session_where = f"WHERE {' AND '.join(session_conditions)}" if session_conditions else ""

        async with get_db() as db:
            # KPIs from sessions
            cursor = await db.execute(
                f"""
                SELECT
                    COUNT(*) as unique_sessions,
                    COALESCE(SUM(total_cost), 0) as total_cost,
                    COALESCE(AVG(avg_latency), 0) as avg_latency
                FROM sessions
                {session_where}
                """,
                session_params,
            )
            session_row = await cursor.fetchone()

            # Trace count
            cursor = await db.execute(
                f"SELECT COUNT(*) as total_traces FROM traces {trace_where}",
                params,
            )
            trace_row = await cursor.fetchone()

            unique_sessions = session_row["unique_sessions"] if session_row else 0
            total_cost = session_row["total_cost"] if session_row else 0
            cost_per_session = total_cost / unique_sessions if unique_sessions > 0 else 0

            kpis = {
                "unique_sessions": unique_sessions,
                "total_traces": trace_row["total_traces"] if trace_row else 0,
                "total_cost": total_cost,
                "avg_latency_seconds": session_row["avg_latency"] if session_row else 0,
                "cost_per_session": cost_per_session,
            }

            # Cost by chapter
            chapter_where = f"{trace_where} AND chapter IS NOT NULL" if trace_where else "WHERE chapter IS NOT NULL"
            cursor = await db.execute(
                f"""
                SELECT chapter, COALESCE(SUM(total_cost), 0) as cost
                FROM traces
                {chapter_where}
                GROUP BY chapter
                ORDER BY chapter
                """,
                params,
            )
            chapter_rows = await cursor.fetchall()

            cost_by_chapter = []
            for row in chapter_rows:
                chapter_num = row["chapter"].replace("chapter_", "") if row["chapter"] else "0"
                try:
                    chapter_int = int(chapter_num)
                    chapter_name = CHAPTER_NAMES.get(chapter_int, f"Chapter {chapter_int}")
                except ValueError:
                    chapter_name = row["chapter"]
                cost_by_chapter.append({"chapter": chapter_name, "cost": row["cost"]})

            # Traces per day (last 7 days)
            cursor = await db.execute(
                """
                SELECT date, trace_count
                FROM daily_metrics
                ORDER BY date DESC
                LIMIT 7
                """
            )
            daily_rows = await cursor.fetchall()

            traces_per_day = [
                {"date": r["date"], "count": r["trace_count"]}
                for r in reversed(daily_rows)
            ]

            return {
                "kpis": kpis,
                "cost_by_chapter": cost_by_chapter,
                "traces_per_day": traces_per_day,
            }
