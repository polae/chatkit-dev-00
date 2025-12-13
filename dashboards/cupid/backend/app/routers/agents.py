from fastapi import APIRouter, HTTPException

from app.services import AnalyticsService

router = APIRouter(prefix="/api/agents", tags=["agents"])
analytics = AnalyticsService()


@router.get("")
async def list_agents():
    """List all agents with stats."""
    agents = await analytics.get_agents()
    return {"data": agents}


@router.get("/{agent_name}")
async def get_agent_detail(agent_name: str):
    """Get agent detail with recent executions."""
    result = await analytics.get_agent_detail(agent_name)
    if not result:
        raise HTTPException(status_code=404, detail="Agent not found")
    return result


@router.get("/{agent_name}/charts")
async def get_agent_charts(agent_name: str):
    """Get chart data for an agent."""
    return await analytics.get_agent_charts(agent_name)
