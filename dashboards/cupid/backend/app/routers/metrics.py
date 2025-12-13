from fastapi import APIRouter
from typing import Literal

from app.services import AnalyticsService

router = APIRouter(prefix="/api/metrics", tags=["metrics"])
analytics = AnalyticsService()


@router.get("/dashboard")
async def get_dashboard_metrics(
    time_range: Literal["24h", "7d", "30d", "all"] = "all",
):
    """Get dashboard KPIs and chart data."""
    return await analytics.get_dashboard_metrics(time_range=time_range)
