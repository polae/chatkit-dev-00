from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.asyncio import AsyncIOScheduler

from app.config import settings
from app.database import init_db
from app.services import SyncService
from app.routers import sessions_router, agents_router, metrics_router, sync_router

scheduler = AsyncIOScheduler()
sync_service = SyncService()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database
    await init_db()

    # Schedule background sync
    scheduler.add_job(
        sync_service.sync,
        "interval",
        seconds=settings.sync_interval_seconds,
        id="langfuse_sync",
    )
    scheduler.start()

    # Run initial sync
    try:
        await sync_service.sync()
    except Exception as e:
        print(f"Initial sync failed: {e}")

    yield

    # Cleanup
    scheduler.shutdown()


app = FastAPI(
    title="Cupid Dashboard API",
    description="Observability dashboard for Cupid AI matchmaking game",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(sessions_router)
app.include_router(agents_router)
app.include_router(metrics_router)
app.include_router(sync_router)


@app.get("/health")
async def health_check():
    """Health check endpoint for Docker."""
    return {"status": "healthy"}
