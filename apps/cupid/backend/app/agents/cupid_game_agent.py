"""CupidGame agent - narrative game scenes with choices."""

from pathlib import Path

from agents import Agent, ModelSettings
from openai.types.shared.reasoning import Reasoning

# Load instructions from file
INSTRUCTIONS_PATH = Path(__file__).parent.parent / "instructions" / "cupid-agent-cupid-game.md"
with open(INSTRUCTIONS_PATH, "r", encoding="utf-8") as f:
    INSTRUCTIONS = f.read()

cupid_game_agent = Agent(
    name="CupidGame",
    instructions=INSTRUCTIONS,
    model="gpt-5.1",
    model_settings=ModelSettings(
        store=True,
        reasoning=Reasoning(effort="low")
    )
)
