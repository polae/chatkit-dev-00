"""GameDashboard agent - generates Compatibility Snapshot widget data."""

from pathlib import Path
from typing import TYPE_CHECKING

from agents import Agent, ModelSettings, RunContextWrapper
from openai.types.shared.reasoning import Reasoning

from .schemas import GameDashboardOutput

if TYPE_CHECKING:
    from typing import Any

# Load instructions from file
INSTRUCTIONS_PATH = Path(__file__).parent.parent / "instructions" / "cupid-agent-game-dashboard.md"
with open(INSTRUCTIONS_PATH, "r", encoding="utf-8") as f:
    GAME_DASHBOARD_INSTRUCTIONS = f.read()


class GameDashboardContext:
    """Context for the GameDashboard agent with compatibility and score data."""
    def __init__(self, state_compatibility: str, input_output_parsed_score: str):
        self.state_compatibility = state_compatibility
        self.input_output_parsed_score = input_output_parsed_score


def gamedashboard_instructions(run_context: RunContextWrapper[GameDashboardContext], _agent: Agent[GameDashboardContext]) -> str:
    """Dynamic instructions that include compatibility and score state."""
    state_compatibility = run_context.context.state_compatibility
    score = run_context.context.input_output_parsed_score
    # Replace template variables in instructions
    instructions = GAME_DASHBOARD_INSTRUCTIONS.replace("{{state.compatibility}}", state_compatibility)
    instructions = instructions.replace("{{input.output_parsed.score}}", score)
    return instructions


game_dashboard_agent = Agent[GameDashboardContext](
    name="GameDashboard",
    instructions=gamedashboard_instructions,
    model="gpt-5.1",
    output_type=GameDashboardOutput,
    model_settings=ModelSettings(
        store=True,
        reasoning=Reasoning(effort="low", summary="auto")
    )
)
