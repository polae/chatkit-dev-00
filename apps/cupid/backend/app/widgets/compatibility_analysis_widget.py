"""Compatibility Analysis widget builder."""

from __future__ import annotations

from pathlib import Path
from typing import Any, List

from chatkit.widgets import WidgetRoot

from .widget_template import WidgetTemplate

# Locate the widget file relative to this file
WIDGET_PATH = Path(__file__).parent / "CompatibilityAnalysis.widget"

# Load the CompatibilityAnalysis widget template
compatibility_analysis_template = WidgetTemplate.from_file(str(WIDGET_PATH))


def build_compatibility_analysis_widget(
    title: str,
    subtitle: str,
    overall: int,
    items: List[dict[str, Any]]
) -> WidgetRoot:
    """Build a Compatibility Analysis widget.

    Args:
        title: Header (e.g., "Zara & Sam")
        subtitle: Subheader (e.g., "Compatibility")
        overall: Overall match percentage (0-100)
        items: List of compatibility rows, each with:
            - id: Row identifier (sun, moon, venus, mars)
            - leftEmoji: Left side emoji
            - leftZodiac: Left person's zodiac symbol
            - rightZodiac: Right person's zodiac symbol
            - rightEmoji: Right side emoji
            - percent: Compatibility percentage (0-100)
            - color: Bar color

    Returns:
        WidgetRoot ready to be streamed to the frontend
    """
    return compatibility_analysis_template.build({
        "title": title,
        "subtitle": subtitle,
        "overall": overall,
        "items": items
    })
