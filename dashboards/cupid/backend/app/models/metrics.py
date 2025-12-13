from pydantic import BaseModel


class KPIs(BaseModel):
    unique_sessions: int
    total_traces: int
    total_cost: float
    avg_latency_seconds: float
    cost_per_session: float


class ChapterCost(BaseModel):
    chapter: str
    cost: float


class DailyTraces(BaseModel):
    date: str
    count: int


class DashboardMetrics(BaseModel):
    kpis: KPIs
    cost_by_chapter: list[ChapterCost]
    traces_per_day: list[DailyTraces]
