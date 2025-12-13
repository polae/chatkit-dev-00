import aiosqlite
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from app.config import settings
from .schema import SCHEMA

_db_path: str = settings.database_path


async def init_db() -> None:
    """Initialize database with schema."""
    async with aiosqlite.connect(_db_path) as db:
        await db.executescript(SCHEMA)
        await db.commit()


@asynccontextmanager
async def get_db() -> AsyncGenerator[aiosqlite.Connection, None]:
    """Get database connection."""
    db = await aiosqlite.connect(_db_path)
    db.row_factory = aiosqlite.Row
    try:
        yield db
    finally:
        await db.close()
