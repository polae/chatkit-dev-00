"""CompatibilityAnalysis agent - presents The Big Four compatibility analysis."""

from pathlib import Path

from agents import Agent, ModelSettings
from openai.types.shared.reasoning import Reasoning

# Load instructions from file
INSTRUCTIONS_PATH = Path(__file__).parent.parent / "instructions" / "cupid-agent-compatibility-analysis.md"
with open(INSTRUCTIONS_PATH, "r", encoding="utf-8") as f:
    COMPATIBILITY_ANALYSIS_INSTRUCTIONS = f.read()


compatibility_analysis_agent = Agent(
    name="CompatibilityAnalysis",
    instructions=COMPATIBILITY_ANALYSIS_INSTRUCTIONS,
    model="gpt-5.1",
    model_settings=ModelSettings(
        store=True,
        reasoning=Reasoning(effort="low", summary="auto")
    )
)
