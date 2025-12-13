import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.asyncio import AsyncIOScheduler

from app.config import settings
from app.database import init_db
from app.services import SyncService
from app.routers import sessions_router, agents_router, metrics_router, sync_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

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
        logger.info("Initial sync completed successfully")
    except Exception as e:
        logger.error(f"Initial sync failed: {e}")

    yield

    # Cleanup
    scheduler.shutdown()


app = FastAPI(
    title="Cupid Dashboard API",
    description="Observability dashboard for Cupid AI matchmaking game",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS middleware - restricted to localhost for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost",
        "http://localhost:80",
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1",
        "http://127.0.0.1:80",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
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
