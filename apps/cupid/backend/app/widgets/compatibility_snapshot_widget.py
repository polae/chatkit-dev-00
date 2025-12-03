"""Compatibility Snapshot widget builder for game dashboard."""

from __future__ import annotations

from pathlib import Path
from typing import Any, List

from chatkit.widgets import WidgetRoot

from .widget_template import WidgetTemplate

# Locate the widget file relative to this file
WIDGET_PATH = Path(__file__).parent / "Compatibility Snapshot.widget"

# Load the Compatibility Snapshot widget template
compatibility_snapshot_template = WidgetTemplate.from_file(str(WIDGET_PATH))


def build_compatibility_snapshot_widget(
    scene: dict[str, Any],
    compatibility: int,
    delta: dict[str, Any],
    bars: List[dict[str, Any]],
    pills: List[dict[str, Any]]
) -> WidgetRoot:
    """Build a Compatibility Snapshot widget for the game dashboard.

    Args:
        scene: Scene info with:
            - number: Scene number
            - name: Scene name
        compatibility: Current compatibility score
        delta: Change indicator with:
            - value: Change amount
            - direction: "up" or "down"
        bars: Progress bars list, each with:
            - label: Bar label
            - percent: 0-100
            - color: "blue-500" or "orange-500"
        pills: Metric badges list, each with:
            - id: Identifier
            - icon: Emoji
            - value: Number

    Returns:
        WidgetRoot ready to be streamed to the frontend
    """
    return compatibility_snapshot_template.build({
        "scene": scene,
        "compatibility": compatibility,
        "delta": delta,
        "bars": bars,
        "pills": pills
    })
