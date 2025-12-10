"""End agent - final message after game evaluation."""

from agents import Agent, ModelSettings
from openai.types.shared.reasoning import Reasoning

INSTRUCTIONS = """The game has ended. Please thank Cupid for playing, and advise the Cupid to start over with a new story ... but this is the end. That's the only way to do it."""

end_agent = Agent(
    name="End",
    instructions=INSTRUCTIONS,
    model="gpt-5.1",
    model_settings=ModelSettings(
        store=True,
        reasoning=Reasoning(effort="low", summary="auto")
    )
)
