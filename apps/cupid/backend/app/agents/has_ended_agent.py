"""HasEnded agent - determines if the game has concluded."""

from agents import Agent, ModelSettings, RunContextWrapper
from openai.types.shared.reasoning import Reasoning

from .schemas import HasEndedOutput


class HasEndedContext:
    """Context for the HasEnded agent with narrative to analyze."""
    def __init__(self, narrative_content: str):
        self.narrative_content = narrative_content


def hasended_instructions(run_context: RunContextWrapper[HasEndedContext], _agent: Agent[HasEndedContext]) -> str:
    """Dynamic instructions with the narrative content to analyze."""
    content = run_context.context.narrative_content
    return f"""Determine if this date narrative has concluded.

## Return has_ended: true if ANY of these are present:
- The characters have parted ways (one goes home, leaves, they say goodbye, etc.)
- There's a wrap-up/epilogue paragraph describing what happens after the date
- The narrative describes them falling asleep or the night ending
- Phone numbers have been exchanged AND they've said goodbye
- The scene has a clear "the end" feeling with no more real-time interaction
- The narrative describes future events (e.g., "later that night", "the next day")
- Characters are physically separated and reflecting on the date

## Return has_ended: false ONLY if:
- The date is actively happening with real-time dialogue/action
- Characters are still together and interacting in the present moment
- There are OPTION prompts waiting for a player choice

## Important:
If the narrative reads like a story conclusion with no ongoing action, return true.

## Narrative to Analyze:

{content}
"""


has_ended_agent = Agent[HasEndedContext](
    name="HasEnded",
    instructions=hasended_instructions,
    model="gpt-5.1",
    output_type=HasEndedOutput,
    model_settings=ModelSettings(
        store=True,
        reasoning=Reasoning(effort="low", summary="auto")
    )
)
