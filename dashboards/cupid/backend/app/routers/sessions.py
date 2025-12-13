from fastapi import APIRouter, HTTPException, Query
from typing import Literal

from app.services import AnalyticsService

router = APIRouter(prefix="/api/sessions", tags=["sessions"])
analytics = AnalyticsService()


@router.get("")
async def list_sessions(
    time_range: Literal["24h", "7d", "30d", "all"] = "all",
    status: Literal["complete", "incomplete", "all"] = "all",
    search: str | None = None,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
):
    """List sessions with filters."""
    return await analytics.get_sessions(
        time_range=time_range,
        status=status,
        search=search,
        page=page,
        limit=limit,
    )


@router.get("/stats")
async def get_session_stats(
    time_range: Literal["24h", "7d", "30d", "all"] = "all",
):
    """Get aggregate session statistics."""
    return await analytics.get_session_stats(time_range=time_range)


@router.get("/{session_id}/conversation")
async def get_conversation(session_id: str):
    """Get full conversation for a session."""
    result = await analytics.get_conversation(session_id)
    if not result.get("session"):
        raise HTTPException(status_code=404, detail="Session not found")
    return result
