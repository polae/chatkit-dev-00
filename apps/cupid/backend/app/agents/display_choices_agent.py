"""DisplayChoices agent - generates Choice list widget data."""

from agents import Agent, ModelSettings
from openai.types.shared.reasoning import Reasoning

from .schemas import ChoicesOutput


display_choices_agent = Agent(
    name="DisplayChoices",
    instructions="""Please from the last response, if there are multiple choices please simply output the choice letters and "titles" of the choices in the WIDGET.""",
    model="gpt-5.1",
    output_type=ChoicesOutput,
    model_settings=ModelSettings(
        store=True,
        reasoning=Reasoning(effort="low", summary="auto")
    )
)
