"""DisplayChoices agent - generates Choice list widget data."""

from agents import Agent, ModelSettings
from openai.types.shared.reasoning import Reasoning

from .schemas import ChoicesOutput


DISPLAY_CHOICES_INSTRUCTIONS = """Parse the previous assistant response to extract player choices.

Look for options formatted as:
**OPTION A: "TITLE" — Description**
or
**OPTION A: TITLE — Description**

Extract:
- key: The letter (A, B, C, D)
- title: The text immediately after the colon (in quotes if present, before the em-dash)

Example input:
**OPTION A: "KISS HIM" — Romantic Escalation**
**OPTION B: "SWAP INSTAGRAMS" — Light approach**

Example output:
{
  "items": [
    {"key": "A", "title": "KISS HIM"},
    {"key": "B", "title": "SWAP INSTAGRAMS"}
  ]
}

Parse ALL options from the last assistant message. Return only the structured output."""


display_choices_agent = Agent(
    name="DisplayChoices",
    instructions=DISPLAY_CHOICES_INSTRUCTIONS,
    model="gpt-5.1",
    output_type=ChoicesOutput,
    model_settings=ModelSettings(
        store=True,
        reasoning=Reasoning(effort="low", summary="auto")
    )
)
