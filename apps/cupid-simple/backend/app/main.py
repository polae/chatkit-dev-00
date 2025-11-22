"""FastAPI entrypoint wiring the ChatKit server."""

from __future__ import annotations

import os
from dotenv import load_dotenv
load_dotenv()

from chatkit.server import StreamingResult
from fastapi import Depends, FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, StreamingResponse
from starlette.responses import JSONResponse

from .server import CupidServer, create_chatkit_server

app = FastAPI(title="Cupid Game API")

# CORS configuration for production
FRONTEND_URLS = os.getenv("FRONTEND_URLS", "http://localhost:5173,http://localhost").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=FRONTEND_URLS + [
        "http://localhost:5173",  # Local dev
        "http://localhost:80",    # Docker local
        "https://*.vercel.app",   # Vercel deployments
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_chatkit_server: CupidServer | None = create_chatkit_server()


def get_chatkit_server() -> CupidServer:
    if _chatkit_server is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="ChatKit server unavailable.",
        )
    return _chatkit_server


@app.get("/health")
async def health_check():
    """Health check endpoint for Docker and load balancers."""
    return {"status": "healthy", "service": "cupid-backend"}


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
