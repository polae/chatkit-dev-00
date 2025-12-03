"""DisplayMortal agent - generates ProfileCard widget data for the mortal."""

from typing import TYPE_CHECKING

from agents import Agent, ModelSettings, RunContextWrapper
from openai.types.shared.reasoning import Reasoning

from .schemas import ProfileCardOutput

if TYPE_CHECKING:
    from typing import Any


class DisplayMortalContext:
    """Context for the DisplayMortal agent with mortal data."""
    def __init__(self, state_mortal: str):
        self.state_mortal = state_mortal


def displaymortal_instructions(run_context: RunContextWrapper[DisplayMortalContext], _agent: Agent[DisplayMortalContext]) -> str:
    """Dynamic instructions that include mortal state."""
    state_mortal = run_context.context.state_mortal
    return f"""Generate a ProfileCard from the data below.

Return ONLY a valid ProfileCard widget.

Here is the data:

{state_mortal}"""


display_mortal_agent = Agent[DisplayMortalContext](
    name="DisplayMortal",
    instructions=displaymortal_instructions,
    model="gpt-5.1",
    output_type=ProfileCardOutput,
    model_settings=ModelSettings(
        store=True,
        reasoning=Reasoning(effort="none")
    )
)
