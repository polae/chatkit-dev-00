from fastapi import APIRouter, BackgroundTasks

from app.services import SyncService

router = APIRouter(prefix="/api/sync", tags=["sync"])
sync_service = SyncService()


@router.get("/status")
async def get_sync_status():
    """Get current sync status."""
    return await sync_service.get_status()


@router.post("/trigger")
async def trigger_sync(background_tasks: BackgroundTasks):
    """Manually trigger a sync."""
    background_tasks.add_task(sync_service.sync)
    return {"status": "started", "message": "Sync job started"}
