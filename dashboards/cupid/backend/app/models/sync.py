from pydantic import BaseModel
from typing import Optional


class SyncStatus(BaseModel):
    status: str  # 'idle', 'running', 'error'
    last_sync_at: Optional[str] = None
    next_sync_at: Optional[str] = None
    error_message: Optional[str] = None


class SyncTriggerResponse(BaseModel):
    status: str
    message: str
