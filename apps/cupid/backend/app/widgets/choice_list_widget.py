"""Choice list widget builder for multiple choice selections."""

from __future__ import annotations

from pathlib import Path
from typing import Any, List

from chatkit.widgets import WidgetRoot

from .widget_template import WidgetTemplate

# Locate the widget file relative to this file
WIDGET_PATH = Path(__file__).parent / "Choice list.widget"

# Load the Choice list widget template
choice_list_template = WidgetTemplate.from_file(str(WIDGET_PATH))


def build_choice_list_widget(items: List[dict[str, str]]) -> WidgetRoot:
    """Build a Choice list widget with selectable items.

    Args:
        items: List of choice items, each with:
            - key: Choice identifier (A, B, C, D)
            - title: Choice text/description

    Returns:
        WidgetRoot ready to be streamed to the frontend
    """
    return choice_list_template.build({"items": items})
