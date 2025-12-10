"""Match session store for Cupid Deluxe.

Manages temporary storage of match selections before chat sessions begin.
Following the pattern from customer-support/airline_state.py.
"""

from __future__ import annotations

import logging
import uuid
from typing import Any, Dict

logger = logging.getLogger(__name__)


class MatchSessionStore:
    """In-memory store for pending match selections.

    When a user completes the match selection flow, the frontend stores the
    selection data here and receives a session_id. The session_id is then
    passed via the x-match-session-id header when starting the chat, allowing
    the backend to retrieve the selection without exposing it in the chat.
    """

    def __init__(self) -> None:
        self._sessions: Dict[str, Dict[str, Any]] = {}

    def store(self, data: Dict[str, Any]) -> str:
        """Store match selection data and return a new session ID."""
        session_id = str(uuid.uuid4())
        self._sessions[session_id] = data
        logger.info(f"Stored match session: {session_id}")
        return session_id

    def retrieve(self, session_id: str) -> Dict[str, Any] | None:
        """Retrieve and remove match selection by session ID.

        Returns None if session_id not found or already consumed.
        """
        data = self._sessions.pop(session_id, None)
        if data:
            logger.info(f"Retrieved match session: {session_id}")
        else:
            logger.warning(f"Match session not found or expired: {session_id}")
        return data

    def peek(self, session_id: str) -> Dict[str, Any] | None:
        """Retrieve match selection without removing it."""
        return self._sessions.get(session_id)


# Singleton instance
match_session_store = MatchSessionStore()
