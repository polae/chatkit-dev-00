"""Request context for Cupid Deluxe - holds request-scoped data only.

Game state (chapter, compatibility, scene_number) is stored in thread.metadata,
which is the authoritative source and persists across requests.

Following the pattern from OpenAI's news-guide/request_context.py.
"""

from __future__ import annotations

from typing import Annotated

from fastapi import Request
from pydantic import BaseModel, ConfigDict, Field


class RequestContext(BaseModel):
    """Typed request context shared across ChatKit handlers.

    Game state lives in thread.metadata; this holds only request-scoped data.
    """

    model_config = ConfigDict(arbitrary_types_allowed=True)

    request: Annotated[Request | None, Field(default=None, exclude=True)]
    match_session_id: str | None = None
