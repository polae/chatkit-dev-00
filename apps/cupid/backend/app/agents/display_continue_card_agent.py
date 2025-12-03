"""DisplayContinueCard agent - generates Continue Card widget data."""

from agents import Agent, ModelSettings
from openai.types.shared.reasoning import Reasoning

from .schemas import ContinueCardOutput

# Two variants as per workflow

display_continue_card_agent = Agent(
    name="DisplayContinueCard",
    instructions="""Please simply output the Continue Card Widget with the message, "Ready to see their compatibility?"

That is all.""",
    model="gpt-5.1",
    output_type=ContinueCardOutput,
    model_settings=ModelSettings(
        store=True,
        reasoning=Reasoning(effort="low", summary="auto")
    )
)

display_continue_card_agent_game = Agent(
    name="DisplayContinueCard",
    instructions="""Please simply output the Continue Card Widget with the message, "Ok, we can start the story. Ready for the meet-cute?"

That is all.""",
    model="gpt-5.1",
    output_type=ContinueCardOutput,
    model_settings=ModelSettings(
        store=True,
        reasoning=Reasoning(effort="low", summary="auto")
    )
)
