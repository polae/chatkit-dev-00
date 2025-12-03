"""HasEnded agent - determines if the game has concluded."""

from agents import Agent, ModelSettings
from openai.types.shared.reasoning import Reasoning

from .schemas import HasEndedOutput


has_ended_agent = Agent(
    name="HasEnded",
    instructions="""Have we concluded the date and are we ready for Cupid's Evaluation?

We should never change this to true until after the entire date (a kiss, a parting of ways has fully happened). And the story is completely concluded with a wrap up. ONLY THEN, should we change has_ended to true.
""",
    model="gpt-5.1",
    output_type=HasEndedOutput,
    model_settings=ModelSettings(
        store=True,
        reasoning=Reasoning(effort="none")
    )
)
