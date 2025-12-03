"""Request context for Cupid Deluxe with chapter-based state tracking."""

from typing import Any, TypedDict


class RequestContext(TypedDict):
    """State tracked across turns in the Cupid game."""
    chapter: int  # 0-6+ (0=intro, 1=mortal, 2=match, 3=compatibility, 4=game start, 5=game loop, 6+=evaluation)
    mortal_data: dict[str, Any]  # Character data for the mortal
    match_data: dict[str, Any]  # Character data for the match
    compatibility_data: dict[str, Any]  # Astrological compatibility data
    current_compatibility: int  # Tracks running compatibility score during game
    scene_number: int  # Current scene number in the game loop
