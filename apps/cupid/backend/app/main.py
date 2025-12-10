"""FastAPI entrypoint wiring the ChatKit server."""

from __future__ import annotations

import uuid
import yaml
from pathlib import Path
from typing import Any, Dict

from dotenv import load_dotenv
load_dotenv()

from chatkit.server import StreamingResult
from fastapi import Depends, FastAPI, HTTPException, Request, status
from fastapi.responses import Response, StreamingResponse
from pydantic import BaseModel
from starlette.responses import JSONResponse

from .server import CupidServer, create_chatkit_server

app = FastAPI(title="Cupid Deluxe API")

# In-memory store for pending match selections (session_id -> selection data)
# This allows the frontend to store match selection before starting chat
_pending_selections: Dict[str, Dict[str, Any]] = {}


class MatchSelectionRequest(BaseModel):
    """Request body for storing a match selection."""
    mortal_data: Dict[str, Any]
    match_data: Dict[str, Any]
    compatibility_data: Dict[str, Any]
    selected_match_id: str


def load_today_data() -> dict:
    """Load today's mortal, matches, and compatibility data from YAML files."""
    data_dir = Path(__file__).parent / "data" / "today"

    # Load mortal (single file in mortal directory)
    mortal_dir = data_dir / "mortal"
    mortal_files = list(mortal_dir.glob("*.yaml"))
    if not mortal_files:
        raise HTTPException(status_code=500, detail="No mortal data found")
    with open(mortal_files[0], "r", encoding="utf-8") as f:
        mortal_data = yaml.safe_load(f)

    # Load matches (all files in matches directory)
    matches_dir = data_dir / "matches"
    matches = []
    for match_file in sorted(matches_dir.glob("*.yaml")):
        with open(match_file, "r", encoding="utf-8") as f:
            match_data = yaml.safe_load(f)
        # Extract ID from filename (e.g., ethan_murphy_person.yaml -> ethan_murphy)
        match_id = match_file.stem.replace("_person", "")
        matches.append({"id": match_id, "data": match_data})

    # Load compatibility (all files in compatibility directory)
    compat_dir = data_dir / "compatibility"
    compatibility = {}
    for compat_file in compat_dir.glob("*.yaml"):
        with open(compat_file, "r", encoding="utf-8") as f:
            compat_data = yaml.safe_load(f)
        # Extract match ID from filename (e.g., maya_brooks_ethan_murphy_compatibility.yaml)
        # Parse: {mortal}_{match}_compatibility.yaml
        stem = compat_file.stem.replace("_compatibility", "")
        parts = stem.split("_")
        # Find where the mortal name ends (we know mortal is maya_brooks)
        mortal_name = f"{mortal_data['name'].lower().replace(' ', '_')}"
        if stem.startswith(mortal_name):
            match_id = stem[len(mortal_name) + 1:]  # +1 for underscore
            compatibility[match_id] = compat_data

    return {
        "mortal": mortal_data,
        "matches": matches,
        "compatibility": compatibility,
    }

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
    return load_today_data()


@app.post("/api/match-selection")
def store_match_selection(selection: MatchSelectionRequest):
    """Store a match selection and return a session ID.

    The frontend calls this before starting the chat. The returned session_id
    is then sent as the first message (e.g., "Play|{session_id}") so the backend
    can retrieve the selection data without exposing it in the chat.
    """
    session_id = str(uuid.uuid4())
    _pending_selections[session_id] = {
        "mortal_data": selection.mortal_data,
        "match_data": selection.match_data,
        "compatibility_data": selection.compatibility_data,
        "selected_match_id": selection.selected_match_id,
    }
    return {"session_id": session_id}


def get_pending_selection(session_id: str) -> Dict[str, Any] | None:
    """Retrieve and remove a pending match selection by session ID."""
    return _pending_selections.pop(session_id, None)


# Export for server.py to use
def get_pending_selections_store():
    """Get reference to the pending selections store."""
    return _pending_selections


@app.post("/chatkit")
async def chatkit_endpoint(
    request: Request,
    server: CupidServer = Depends(get_chatkit_server),
) -> Response:
    payload = await request.body()
    result = await server.process(payload, {"request": request})
    if isinstance(result, StreamingResult):
        return StreamingResponse(result, media_type="text/event-stream")
    if hasattr(result, "json"):
        return Response(content=result.json, media_type="application/json")
    return JSONResponse(result)
