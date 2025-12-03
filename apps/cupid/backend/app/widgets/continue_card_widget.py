"""Continue Card widget builder."""

from __future__ import annotations

from pathlib import Path
from typing import Any

from chatkit.widgets import WidgetRoot

from .widget_template import WidgetTemplate

# Locate the widget file relative to this file
WIDGET_PATH = Path(__file__).parent / "Continue Card.widget"

# Load the Continue Card widget template
continue_card_template = WidgetTemplate.from_file(str(WIDGET_PATH))


def build_continue_card_widget(confirmation_message: str) -> WidgetRoot:
    """Build a Continue Card widget with a confirmation message.

    Args:
        confirmation_message: Markdown message to display

    Returns:
        WidgetRoot ready to be streamed to the frontend
    """
    return continue_card_template.build({"confirmation_message": confirmation_message})
