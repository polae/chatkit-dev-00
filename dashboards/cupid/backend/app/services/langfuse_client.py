import asyncio
import base64
import httpx
from typing import Any

from app.config import settings


class RateLimitError(Exception):
    pass


class LangfuseClient:
    """Async Langfuse API client with rate limit handling."""

    def __init__(self):
        self.base_url = f"{settings.langfuse_base_url}/api/public"
        credentials = f"{settings.langfuse_public_key}:{settings.langfuse_secret_key}"
        self.auth_header = base64.b64encode(credentials.encode()).decode()

    async def _request(
        self,
        endpoint: str,
        params: dict | None = None,
        max_retries: int = 5,
    ) -> dict[str, Any]:
        """Make authenticated request with exponential backoff."""
        url = f"{self.base_url}{endpoint}"
        headers = {
            "Authorization": f"Basic {self.auth_header}",
            "Content-Type": "application/json",
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            for attempt in range(max_retries):
                try:
                    response = await client.get(url, headers=headers, params=params)

                    if response.status_code == 429:
                        wait_time = (2**attempt) * 2
                        await asyncio.sleep(wait_time)
                        continue

                    response.raise_for_status()
                    return response.json()

                except httpx.HTTPStatusError as e:
                    if e.response.status_code == 429 and attempt < max_retries - 1:
                        wait_time = (2**attempt) * 2
                        await asyncio.sleep(wait_time)
                        continue
                    raise

        raise RateLimitError(f"Rate limited after {max_retries} retries")

    async def get_sessions(self, limit: int = 100, page: int = 1) -> dict[str, Any]:
        """Fetch sessions."""
        return await self._request("/sessions", {"limit": limit, "page": page})

    async def get_traces(
        self,
        limit: int = 100,
        page: int = 1,
        session_id: str | None = None,
        from_timestamp: str | None = None,
        order_by: str | None = None,
    ) -> dict[str, Any]:
        """Fetch traces with optional filters."""
        params = {"limit": limit, "page": page}
        if session_id:
            params["sessionId"] = session_id
        if from_timestamp:
            params["fromTimestamp"] = from_timestamp
        if order_by:
            params["orderBy"] = order_by
        return await self._request("/traces", params)

    async def get_trace(self, trace_id: str) -> dict[str, Any]:
        """Fetch single trace with observations."""
        return await self._request(f"/traces/{trace_id}")

    async def get_observations(
        self,
        limit: int = 500,
        page: int = 1,
        trace_id: str | None = None,
    ) -> dict[str, Any]:
        """Fetch observations."""
        params = {"limit": limit, "page": page}
        if trace_id:
            params["traceId"] = trace_id
        return await self._request("/observations", params)

    async def check_connection(self) -> bool:
        """Check if Langfuse connection is valid."""
        try:
            await self._request("/sessions", {"limit": 1})
            return True
        except Exception:
            return False
