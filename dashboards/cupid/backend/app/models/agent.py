from pydantic import BaseModel
from typing import Optional


class AgentStats(BaseModel):
    name: str
    category: str
    execution_count: int = 0
    avg_latency_ms: float = 0
    total_cost: float = 0
    total_tokens: int = 0
    success_rate: float = 100


class AgentExecution(BaseModel):
    trace_id: str
    timestamp: str
    latency_ms: float
    tokens: int
    cost: float
    status: str  # 'success' or 'error'


class AgentDetailStats(BaseModel):
    execution_count: int = 0
    avg_latency_ms: float = 0
    total_cost: float = 0
    total_tokens: int = 0
    success_rate: float = 100


class AgentDetail(BaseModel):
    name: str
    category: str
    stats: AgentDetailStats
    recent_executions: list[AgentExecution]


class LatencyPoint(BaseModel):
    timestamp: str
    latency_ms: float


class HourlyCount(BaseModel):
    hour: int
    count: int


class AgentChartData(BaseModel):
    latency_over_time: list[LatencyPoint]
    executions_by_hour: list[HourlyCount]
