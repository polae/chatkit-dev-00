from pydantic import BaseModel
from typing import Optional


class Session(BaseModel):
    id: str
    created_at: str
    trace_count: int = 0
    total_cost: float = 0
    avg_latency: float = 0
    mortal_name: Optional[str] = None
    match_name: Optional[str] = None
    max_chapter: int = -1
    is_complete: bool = False
    first_trace_at: Optional[str] = None
    last_trace_at: Optional[str] = None
    duration_seconds: Optional[float] = None


class SessionStats(BaseModel):
    total_sessions: int
    total_cost: float
    avg_duration_seconds: float
    avg_latency_seconds: float
    complete_sessions: int
    incomplete_sessions: int


class MessageMetadata(BaseModel):
    latency_ms: float = 0
    cost: float = 0
    total_tokens: int = 0
    prompt_tokens: int = 0
    completion_tokens: int = 0
    model: Optional[str] = None


class ConversationMessage(BaseModel):
    type: str  # 'user' or 'agent'
    timestamp: str
    chapter: Optional[str] = None
    agent: Optional[str] = None
    content: str
    metadata: Optional[MessageMetadata] = None


class SessionDetail(BaseModel):
    id: str
    mortal_name: Optional[str] = None
    match_name: Optional[str] = None
    max_chapter: int = -1
    is_complete: bool = False
    total_cost: float = 0
    duration_seconds: Optional[float] = None


class ConversationResponse(BaseModel):
    session: SessionDetail
    messages: list[ConversationMessage]
