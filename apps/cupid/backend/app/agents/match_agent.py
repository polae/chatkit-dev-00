"""Match agent - narrative about the second character."""

from pathlib import Path
from typing import TYPE_CHECKING

from agents import Agent, ModelSettings, RunContextWrapper
from openai.types.shared.reasoning import Reasoning

if TYPE_CHECKING:
    from typing import Any

# Load instructions from file
INSTRUCTIONS_PATH = Path(__file__).parent.parent / "instructions" / "cupid-agent-match.md"
with open(INSTRUCTIONS_PATH, "r", encoding="utf-8") as f:
    MATCH_INSTRUCTIONS = f.read()


class MatchContext:
    """Context for the Match agent with match data."""
    def __init__(self, state_match: str):
        self.state_match = state_match


def match_instructions(run_context: RunContextWrapper[MatchContext], _agent: Agent[MatchContext]) -> str:
    """Dynamic instructions that include match state."""
    state_match = run_context.context.state_match
    # Replace template variable in instructions
    return MATCH_INSTRUCTIONS.replace("{{state.match}}", state_match)


match_agent = Agent[MatchContext](
    name="Match",
    instructions=match_instructions,
    model="gpt-5.1",
    model_settings=ModelSettings(
        store=True,
        reasoning=Reasoning(effort="low", summary="auto")
    )
)
