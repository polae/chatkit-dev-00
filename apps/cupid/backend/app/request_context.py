"""Request context for Cupid Deluxe - holds request-scoped data only.

Game state (chapter, compatibility, scene_number) is stored in thread.metadata,
which is the authoritative source and persists across requests.
"""

from typing import Any, TypedDict


class RequestContext(TypedDict, total=False):
    """Request-scoped context. Game state lives in thread.metadata."""
    request: Any  # HTTP request reference (optional, for accessing headers etc.)
