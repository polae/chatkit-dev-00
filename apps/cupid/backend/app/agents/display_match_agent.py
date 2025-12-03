"""DisplayMatch agent - generates ProfileCard widget data for the match."""

from typing import TYPE_CHECKING

from agents import Agent, ModelSettings, RunContextWrapper
from openai.types.shared.reasoning import Reasoning

from .schemas import ProfileCardOutput

if TYPE_CHECKING:
    from typing import Any


class DisplayMatchContext:
    """Context for the DisplayMatch agent with match data."""
    def __init__(self, state_match: str):
        self.state_match = state_match


def displaymatch_instructions(run_context: RunContextWrapper[DisplayMatchContext], _agent: Agent[DisplayMatchContext]) -> str:
    """Dynamic instructions that include match state."""
    state_match = run_context.context.state_match
    return f"""Generate a ProfileCard widget from the data below.

Return ONLY a valid ProfileCard widget.

Here is the data:

{state_match}"""


display_match_agent = Agent[DisplayMatchContext](
    name="DisplayMatch",
    instructions=displaymatch_instructions,
    model="gpt-5.1",
    output_type=ProfileCardOutput,
    model_settings=ModelSettings(
        store=True,
        reasoning=Reasoning(effort="none")
    )
)
