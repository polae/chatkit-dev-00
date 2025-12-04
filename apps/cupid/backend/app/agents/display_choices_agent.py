"""DisplayChoices agent - generates Choice list widget data."""

from agents import Agent, ModelSettings, RunContextWrapper
from openai.types.shared.reasoning import Reasoning

from .schemas import ChoicesOutput


class DisplayChoicesContext:
    """Context for the DisplayChoices agent with message to parse."""
    def __init__(self, message_content: str):
        self.message_content = message_content


def displaychoices_instructions(run_context: RunContextWrapper[DisplayChoicesContext], _agent: Agent[DisplayChoicesContext]) -> str:
    """Dynamic instructions with the message content to parse."""
    content = run_context.context.message_content
    return f"""Extract player choices from the message below.

## Option Format
Options appear as:
**OPTION A: "TITLE" — Description**
or
**OPTION A: TITLE — Description**

## What to Extract
- key: The letter (A, B, C, D)
- title: The text between the colon and the em-dash (—), removing quotes if present

## If No Options Found
Return: {{"items": []}}

## Message to Parse:

{content}
"""


display_choices_agent = Agent[DisplayChoicesContext](
    name="DisplayChoices",
    instructions=displaychoices_instructions,
    model="gpt-5.1",
    output_type=ChoicesOutput,
    model_settings=ModelSettings(
        store=True,
        reasoning=Reasoning(effort="low", summary="auto")
    )
)
