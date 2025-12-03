"""EvaluateSceneScore agent - evaluates compatibility score changes."""

from pathlib import Path

from agents import Agent, ModelSettings
from openai.types.shared.reasoning import Reasoning

from .schemas import SceneScoreOutput

# Load instructions from file
INSTRUCTIONS_PATH = Path(__file__).parent.parent / "instructions" / "cupid-agent-compatibility-analysis.md"
with open(INSTRUCTIONS_PATH, "r", encoding="utf-8") as f:
    INSTRUCTIONS = f.read()


evaluate_scene_score_agent = Agent(
    name="EvaluateSceneScore",
    instructions=INSTRUCTIONS,
    model="gpt-5.1",
    output_type=SceneScoreOutput,
    model_settings=ModelSettings(
        store=True,
        reasoning=Reasoning(effort="none")
    )
)
