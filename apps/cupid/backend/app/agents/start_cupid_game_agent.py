"""StartCupidGame agent - narrative to start the game."""

from pathlib import Path

from agents import Agent, ModelSettings
from openai.types.shared.reasoning import Reasoning

# Load instructions from file
INSTRUCTIONS_PATH = Path(__file__).parent.parent / "instructions" / "cupid-agent-start-cupid-game.md"
with open(INSTRUCTIONS_PATH, "r", encoding="utf-8") as f:
    INSTRUCTIONS = f.read()

start_cupid_game_agent = Agent(
    name="StartCupidGame",
    instructions=INSTRUCTIONS,
    model="gpt-5.1",
    model_settings=ModelSettings(
        store=True,
        reasoning=Reasoning(effort="low")
    )
)
