"""FastAPI entrypoint wiring the ChatKit server.

Following the pattern from OpenAI's news-guide/main.py and customer-support/main.py.
"""

from __future__ import annotations

import logging
from dotenv import load_dotenv
load_dotenv()

# Initialize Langfuse instrumentation for OpenAI Agents SDK tracing
# Must be done before importing agents/server modules
from openinference.instrumentation.openai_agents import OpenAIAgentsInstrumentor
from langfuse import get_client

OpenAIAgentsInstrumentor().instrument()

# Verify Langfuse connection
_langfuse = get_client()
_logger = logging.getLogger(__name__)
if _langfuse.auth_check():
    _logger.info("Langfuse connected successfully")
else:
    _logger.warning("Langfuse authentication failed - traces will not be recorded")

from chatkit.server import StreamingResult
from fastapi import Depends, FastAPI, HTTPException, Request, status
from fastapi.responses import Response, StreamingResponse
from pydantic import BaseModel
from starlette.responses import JSONResponse
from typing import Any, Dict

from .data.today_store import today_store
from .match_session_store import match_session_store
from .request_context import RequestContext
from .server import CupidServer, create_chatkit_server

app = FastAPI(title="Cupid Deluxe API")


class MatchSelectionRequest(BaseModel):
    """Request body for storing a match selection."""
    mortal_data: Dict[str, Any]
    match_data: Dict[str, Any]
    compatibility_data: Dict[str, Any]
    selected_match_id: str


_chatkit_server: CupidServer | None = create_chatkit_server()


def get_chatkit_server() -> CupidServer:
    if _chatkit_server is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="ChatKit server unavailable.",
        )
    return _chatkit_server


@app.get("/health")
def health_check():
    """Health check endpoint for Docker healthcheck."""
    return {"status": "healthy"}


@app.get("/api/today")
def get_today_data():
    """Return today's mortal, matches, and compatibility data for the selection flow."""
    try:
        return today_store.load()
    except FileNotFoundError as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/match-selection")
def store_match_selection(selection: MatchSelectionRequest):
    """Store a match selection and return a session ID.

    The frontend calls this before starting the chat. The returned session_id
    is then passed via the x-match-session-id header so the backend
    can retrieve the selection data without exposing it in the chat.
    """
    session_id = match_session_store.store({
        "mortal_data": selection.mortal_data,
        "match_data": selection.match_data,
        "compatibility_data": selection.compatibility_data,
        "selected_match_id": selection.selected_match_id,
    })
    return {"session_id": session_id}


@app.post("/chatkit")
async def chatkit_endpoint(
    request: Request,
    server: CupidServer = Depends(get_chatkit_server),
) -> Response:
    """ChatKit protocol endpoint.

    Extracts x-match-session-id header and passes it via RequestContext.
    Following the pattern from news-guide where article-id is extracted from headers.
    """
    payload = await request.body()
    match_session_id = request.headers.get("x-match-session-id")
    context = RequestContext(request=request, match_session_id=match_session_id)
    result = await server.process(payload, context)
    if isinstance(result, StreamingResult):
        return StreamingResponse(result, media_type="text/event-stream")
    if hasattr(result, "json"):
        return Response(content=result.json, media_type="application/json")
    return JSONResponse(result)
