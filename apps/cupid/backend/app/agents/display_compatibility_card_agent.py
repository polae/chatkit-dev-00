"""DisplayCompatibilityCard agent - generates CompatibilityAnalysis widget data."""

from pathlib import Path
from typing import TYPE_CHECKING

from agents import Agent, ModelSettings, RunContextWrapper
from openai.types.shared.reasoning import Reasoning

from .schemas import CompatibilityCardOutput

if TYPE_CHECKING:
    from typing import Any

# Load instructions from file
INSTRUCTIONS_PATH = Path(__file__).parent.parent / "instructions" / "cupid-agent-display-compatibility-card.md"
with open(INSTRUCTIONS_PATH, "r", encoding="utf-8") as f:
    DISPLAY_COMPATIBILITY_CARD_INSTRUCTIONS = f.read()


class DisplayCompatibilityCardContext:
    """Context for the DisplayCompatibilityCard agent with compatibility data."""
    def __init__(self, state_compatibility: str):
        self.state_compatibility = state_compatibility


def displaycompatibilitycard_instructions(run_context: RunContextWrapper[DisplayCompatibilityCardContext], _agent: Agent[DisplayCompatibilityCardContext]) -> str:
    """Dynamic instructions that include compatibility state."""
    state_compatibility = run_context.context.state_compatibility
    # Replace template variable in instructions
    return DISPLAY_COMPATIBILITY_CARD_INSTRUCTIONS.replace("{{state.compatibility}}", state_compatibility)


display_compatibility_card_agent = Agent[DisplayCompatibilityCardContext](
    name="DisplayCompatibilityCard",
    instructions=displaycompatibilitycard_instructions,
    model="gpt-5.1",
    output_type=CompatibilityCardOutput,
    model_settings=ModelSettings(
        store=True,
        reasoning=Reasoning(effort="low", summary="auto")
    )
)
