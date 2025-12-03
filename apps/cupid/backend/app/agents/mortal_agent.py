"""Mortal agent - narrative about the first character."""

from pathlib import Path
from typing import TYPE_CHECKING

from agents import Agent, ModelSettings, RunContextWrapper
from openai.types.shared.reasoning import Reasoning

if TYPE_CHECKING:
    from typing import Any

# Load instructions from file
INSTRUCTIONS_PATH = Path(__file__).parent.parent / "instructions" / "cupid-agent-mortal.md"
with open(INSTRUCTIONS_PATH, "r", encoding="utf-8") as f:
    MORTAL_INSTRUCTIONS = f.read()


class MortalContext:
    """Context for the Mortal agent with mortal data."""
    def __init__(self, state_mortal: str):
        self.state_mortal = state_mortal


def mortal_instructions(run_context: RunContextWrapper[MortalContext], _agent: Agent[MortalContext]) -> str:
    """Dynamic instructions that include mortal state."""
    state_mortal = run_context.context.state_mortal
    # Replace template variable in instructions
    return MORTAL_INSTRUCTIONS.replace("{{state.mortal}}", state_mortal)


mortal_agent = Agent[MortalContext](
    name="Mortal",
    instructions=mortal_instructions,
    model="gpt-5.1",
    model_settings=ModelSettings(
        store=True,
        reasoning=Reasoning(effort="low", summary="auto")
    )
)
