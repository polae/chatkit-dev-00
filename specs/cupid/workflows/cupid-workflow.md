```python
from pydantic import BaseModel
from agents import RunContextWrapper, Agent, ModelSettings, TResponseInputItem, Runner, RunConfig, trace
from openai.types.shared.reasoning import Reasoning

# Load instructions from files
with open("specs/cupid/instructions/cupid-agent-cupid-game.md", "r", encoding="utf-8") as f:
    CUPID_GAME_INSTRUCTIONS = f.read()

with open("specs/cupid/instructions/cupid-agent-introduction.md", "r", encoding="utf-8") as f:
    INTRODUCTION_INSTRUCTIONS = f.read()

with open("specs/cupid/instructions/cupid-agent-start-cupid-game.md", "r", encoding="utf-8") as f:
    START_CUPID_GAME_INSTRUCTIONS = f.read()

with open("specs/cupid/instructions/cupid-agent-compatibility-analysis.md", "r", encoding="utf-8") as f:
    COMPATIBILITY_ANALYSIS_INSTRUCTIONS = f.read()

with open("specs/cupid/instructions/cupid-agent-cupid-evaluation.md", "r", encoding="utf-8") as f:
    CUPID_EVALUATION_INSTRUCTIONS = f.read()

with open("specs/cupid/instructions/cupid-agent-mortal.md", "r", encoding="utf-8") as f:
    MORTAL_INSTRUCTIONS = f.read()

with open("specs/cupid/instructions/cupid-agent-match.md", "r", encoding="utf-8") as f:
    MATCH_INSTRUCTIONS = f.read()

with open("specs/cupid/instructions/cupid-agent-game-dashboard.md", "r", encoding="utf-8") as f:
    GAME_DASHBOARD_INSTRUCTIONS = f.read()

with open("specs/cupid/instructions/cupid-agent-display-compatibility-card.md", "r", encoding="utf-8") as f:
    DISPLAY_COMPATIBILITY_CARD_INSTRUCTIONS = f.read()


class DisplaymortalSchema__Origin(BaseModel):
  city: str
  state: str
  country: str


class DisplaymortalSchema__AstrologicalNotes(BaseModel):
  sun_sign: str
  moon_sign: str
  venus_sign: str
  mars_sign: str


class DisplaymortalSchema(BaseModel):
  name: str
  age: float
  occupation: str
  location: str
  birthdate: str
  origin: DisplaymortalSchema__Origin
  astrological_notes: DisplaymortalSchema__AstrologicalNotes


class DisplaymatchSchema__Origin(BaseModel):
  city: str
  state: str
  country: str


class DisplaymatchSchema__AstrologicalNotes(BaseModel):
  sun_sign: str
  moon_sign: str
  venus_sign: str
  mars_sign: str


class DisplaymatchSchema(BaseModel):
  name: str
  age: float
  occupation: str
  location: str
  birthdate: str
  origin: DisplaymatchSchema__Origin
  astrological_notes: DisplaymatchSchema__AstrologicalNotes


class GamedashboardSchema__Scene(BaseModel):
  number: float
  name: str


class GamedashboardSchema__Delta(BaseModel):
  value: float
  direction: str


class GamedashboardSchema__BarsItem(BaseModel):
  label: str
  percent: float
  color: str


class GamedashboardSchema__PillsItem(BaseModel):
  id: str
  icon: str
  value: float


class GamedashboardSchema(BaseModel):
  scene: GamedashboardSchema__Scene
  compatibility: float
  delta: GamedashboardSchema__Delta
  bars: list[GamedashboardSchema__BarsItem]
  pills: list[GamedashboardSchema__PillsItem]


class EvaluatescenescoreSchema(BaseModel):
  score: str
  reasoning: str
  current-compatibility: str


class DisplaychoicesSchema__ItemsItem(BaseModel):
  key: str
  title: str


class DisplaychoicesSchema(BaseModel):
  items: list[DisplaychoicesSchema__ItemsItem]


class DisplaycompatibilitycardSchema__ItemsItem(BaseModel):
  id: str
  leftEmoji: str
  leftZodiac: str
  rightZodiac: str
  rightEmoji: str
  percent: float
  color: str


class DisplaycompatibilitycardSchema(BaseModel):
  title: str
  subtitle: str
  overall: float
  items: list[DisplaycompatibilitycardSchema__ItemsItem]


class DisplaychoicesSchema1__ItemsItem(BaseModel):
  key: str
  title: str


class DisplaychoicesSchema1(BaseModel):
  items: list[DisplaychoicesSchema1__ItemsItem]


class HasendedSchema(BaseModel):
  has_ended: bool


class DisplaycontinuecardSchema(BaseModel):
  confirmation_message: str


class DisplaycontinuecardSchema1(BaseModel):
  confirmation_message: str


class DisplaymortalContext:
  def __init__(self, state_mortal: str):
    self.state_mortal = state_mortal
def displaymortal_instructions(run_context: RunContextWrapper[DisplaymortalContext], _agent: Agent[DisplaymortalContext]):
  state_mortal = run_context.context.state_mortal
  return f"""Generate a ProfileCard from the data below.

Return ONLY a valid ProfileCard widget.

Here is the data:

 {state_mortal}"""
displaymortal = Agent(
  name="DisplayMortal",
  instructions=displaymortal_instructions,
  model="gpt-5.1",
  output_type=DisplaymortalSchema,
  model_settings=ModelSettings(
    store=True,
    reasoning=Reasoning(
      effort="none"
    )
  )
)


cupidgame = Agent(
  name="CupidGame",
  instructions=CUPID_GAME_INSTRUCTIONS,  # Loaded from file
  model="gpt-5.1",
  model_settings=ModelSettings(
    store=True,
    reasoning=Reasoning(
      effort="low"
    )
  )
)


class DisplaymatchContext:
  def __init__(self, state_match: str):
    self.state_match = state_match
def displaymatch_instructions(run_context: RunContextWrapper[DisplaymatchContext], _agent: Agent[DisplaymatchContext]):
  state_match = run_context.context.state_match
  return f"""Generate a ProfileCard widget from the data below.

Return ONLY a valid ProfileCard widget.

Here is the data:

 {state_match}"""
displaymatch = Agent(
  name="DisplayMatch",
  instructions=displaymatch_instructions,
  model="gpt-5.1",
  output_type=DisplaymatchSchema,
  model_settings=ModelSettings(
    store=True,
    reasoning=Reasoning(
      effort="none"
    )
  )
)


introduction = Agent(
  name="Introduction",
  instructions=INTRODUCTION_INSTRUCTIONS,  # Loaded from file
  model="gpt-5.1",
  model_settings=ModelSettings(
    store=True,
    reasoning=Reasoning(
      effort="low"
    )
  )
)


class MortalContext:
  def __init__(self, state_mortal: str):
    self.state_mortal = state_mortal
def mortal_instructions(run_context: RunContextWrapper[MortalContext], _agent: Agent[MortalContext]):
  # Instructions are loaded from file; {{state.mortal}} will be processed by agent system
  return MORTAL_INSTRUCTIONS

mortal = Agent(
  name="Mortal",
  instructions=mortal_instructions,
  model="gpt-5.1",
  model_settings=ModelSettings(
    store=True,
    reasoning=Reasoning(
      effort="low",
      summary="auto"
    )
  )
)


class MatchContext:
  def __init__(self, state_match: str):
    self.state_match = state_match
def match_instructions(run_context: RunContextWrapper[MatchContext], _agent: Agent[MatchContext]):
  # Instructions are loaded from file; {{state.match}} will be processed by agent system
  return MATCH_INSTRUCTIONS

match = Agent(
  name="Match",
  instructions=match_instructions,
  model="gpt-5.1",
  model_settings=ModelSettings(
    store=True,
    reasoning=Reasoning(
      effort="low",
      summary="auto"
    )
  )
)


class GamedashboardContext:
  def __init__(self, state_compatibility: str, input_output_parsed_score: str):
    self.state_compatibility = state_compatibility
    self.input_output_parsed_score = input_output_parsed_score
def gamedashboard_instructions(run_context: RunContextWrapper[GamedashboardContext], _agent: Agent[GamedashboardContext]):
  # Instructions are loaded from file; template variables will be processed by agent system
  return GAME_DASHBOARD_INSTRUCTIONS

gamedashboard = Agent(
name="GameDashboard",
instructions=gamedashboard_instructions,
model="gpt-5.1",
output_type=GamedashboardSchema,
model_settings=ModelSettings(
store=True,
reasoning=Reasoning(
effort="low",
summary="auto"
)
)
)

compatibilityanalysis = Agent(
  name="Compatibilityanalysis",
  instructions=COMPATIBILITY_ANALYSIS_INSTRUCTIONS,  # Loaded from file
  model="gpt-5.1",
  output_type=EvaluatescenescoreSchema,
  model_settings=ModelSettings(
    store=True,
    reasoning=Reasoning(
      effort="none"
    )
  )
)

startcupidgame = Agent(
  name="Startcupidgame",
  instructions=START_CUPID_GAME_INSTRUCTIONS,  # Loaded from file
  model="gpt-5.1",
  model_settings=ModelSettings(
    store=True,
    reasoning=Reasoning(
      effort="low"
    )
  )
)

displaychoices = Agent(
name="DisplayChoices",
instructions="Pleaese from the last response, if there are mutliple choice please simpley output the choice letters and \"titles\" of the choices in the WIDGET> ",
model="gpt-5.1",
output_type=DisplaychoicesSchema,
model_settings=ModelSettings(
store=True,
reasoning=Reasoning(
effort="low",
summary="auto"
)
)
)

class DisplaycompatibilitycardContext:
def **init**(self, state_compatibility: str):
self.state_compatibility = state_compatibility
def displaycompatibilitycard_instructions(run_context: RunContextWrapper[DisplaycompatibilitycardContext], _agent: Agent[DisplaycompatibilitycardContext]):
  # Instructions are loaded from file; template variables will be processed by agent system
  return DISPLAY_COMPATIBILITY_CARD_INSTRUCTIONS

displaycompatibilitycard = Agent(
name="DisplayCompatibilityCard",
instructions=displaycompatibilitycard_instructions,
model="gpt-5.1",
output_type=DisplaycompatibilitycardSchema,
model_settings=ModelSettings(
store=True,
reasoning=Reasoning(
effort="low",
summary="auto"
)
)
)

displaychoices1 = Agent(
name="DisplayChoices",
instructions="Pleaese from the last response, if there are mutliple choice please simpley output the choice letters and \"titles\" of the choices in the WIDGET> ",
model="gpt-5.1",
output_type=DisplaychoicesSchema1,
model_settings=ModelSettings(
store=True,
reasoning=Reasoning(
effort="low",
summary="auto"
)
)
)

hasended = Agent(
name="HasEnded",
instructions="""Have we concluded the date and are we ready for Cupid's Evaluation?

We should never change this to true until after teh entire date (a kiss, a parting of ways has fully happened). And the story is completely concluded with a wrap up. ONY THEN, shoudl we change has_ended to true.

""",
model="gpt-5.1",
output_type=HasendedSchema,
model_settings=ModelSettings(
store=True,
reasoning=Reasoning(
effort="none"
)
)
)

cupidevaluation = Agent(
  name="Cupidevaluation",
  instructions=CUPID_EVALUATION_INSTRUCTIONS,  # Loaded from file
  model="gpt-5.1",
  model_settings=ModelSettings(
    store=True,
    reasoning=Reasoning(
      effort="low"
    )
  )
)

displaycontinuecard = Agent(
name="DisplayContinueCard",
instructions="""Please simply output the Continue Card Widget with the message, \"Ready to see their compatibility?\"

That is all. """,
model="gpt-5.1",
output_type=DisplaycontinuecardSchema,
model_settings=ModelSettings(
store=True,
reasoning=Reasoning(
effort="low",
summary="auto"
)
)
)

displaycontinuecard1 = Agent(
name="DisplayContinueCard",
instructions="""Please simply output the Continue Card Widget with the message, \"Ok, we can start the story. Ready for the meet-cute?\"

That is all. """,
model="gpt-5.1",
output_type=DisplaycontinuecardSchema1,
model_settings=ModelSettings(
store=True,
reasoning=Reasoning(
effort="low",
summary="auto"
)
)
)

class WorkflowInput(BaseModel):
input_as_text: str

# Main code entrypoint

async def run_workflow(workflow_input: WorkflowInput):
with trace("Cupid05"):
state = {
"chapter": 0,
"mortal": "name: Zara Patel age: 28 occupation: Personal Trainer & Wellness Coach location: Greenpoint, Brooklyn origin: city: Los Angeles state: California country: US personality: core_traits: - Bold and pioneering (Aries Sun) - Detail-oriented and health-conscious (Virgo Moon) - Confident and direct (Aries Ascendant) - Sensual and grounded in love (Taurus Venus) - High-energy and competitive (Aries Mars) strengths: - Natural leader who inspires others to reach their fitness goals - Meticulous about nutrition and wellness routines - Courageous in trying new fitness trends and challenges - Values stability and loyalty in relationships (Taurus Venus) - Action-oriented and results-driven challenges: - Can be impatient with slower-paced people or processes - Tendency to be overly critical of self and others (Virgo Moon) - May rush into relationships impulsively (Aries energy) - Struggles to relax and be vulnerable - Can be blunt to the point of hurting feelings interests: - CrossFit and HIIT training - Meal prepping and nutrition science - Rock climbing and outdoor adventures - Morning routines and optimization hacks - Competitive sports (marathons, triathlons) relationship_style: approach: Direct and passionate, seeks partners who can keep up with their energy love_language: Acts of Service and Quality Time ideal_partner: Someone grounded, patient, and appreciative of their drive red_flags: Laziness, lack of ambition, people who don't take care of their health bio: | Zara is a high-energy personal trainer who moved from LA to Greenpoint two years ago, hungry to compete in NYC's cutthroat fitness scene. With an Aries Sun and Ascendant, she's a natural-born leader who inspires her clients through tough-love coaching and genuine care. Her Virgo Moon means she's obsessed with the details—tracking macros, optimizing workouts, and perfecting form. In love, her Taurus Venus craves stability and sensuality, though her fiery Aries Mars can make her impatient when romance moves too slowly. She's looking for someone who can match her intensity while also helping her slow down and enjoy the moment. dating_history: | Zara had a serious three-year relationship in LA with a fellow trainer that ended when she decided to move east for her career. Her Taurus Venus wanted to make it work long-distance, but her Aries Sun couldn't stand feeling held back. Since moving to NYC, she's dated casually but her Virgo Moon's high standards and Aries impatience mean she often ends things before they get serious. She's learned she needs someone who understands that her career drive doesn't mean she's not looking for love—just someone who can keep up. dating_goals: - Find a partner who values health and fitness - Build a relationship based on mutual growth and adventure - Someone who can handle her directness and appreciate her loyalty astrological_notes: sun_sign: Aries moon_sign: Virgo rising_sign: Aries venus_sign: Taurus mars_sign: Aries dominant_element: Fire (Aries Sun, Mars, Ascendant) chart_pattern: Double Aries (Sun + Ascendant) with practical Virgo Moon creates a driven perfectionist",
"match": "name: Sam Martinez age: 28 occupation: Podcast Host & Digital Content Creator location: Queens, New York origin: city: Austin state: Texas country: US personality: core_traits: - Quick-witted and versatile (Gemini Sun) - Independent and intellectually rebellious (Aquarius Moon) - Nurturing and emotionally protective (Cancer Ascendant) - Communicative and playful in love (Gemini Venus) - Patient and sensual in passion (Taurus Mars) strengths: - Brilliant conversationalist with endless curiosity (Gemini Sun) - Progressive thinker who values freedom (Aquarius Moon) - Warm and caring first impression (Cancer Rising) - Keeps relationships fresh with variety and humor (Gemini Venus) - Steady and reliable when committed (Taurus Mars) challenges: - Can be emotionally detached or aloof (Aquarius Moon) - Struggles with commitment due to fear of losing freedom - May intellectualize feelings rather than feeling them - Restless and easily bored without mental stimulation - Conflict between desire for connection and independence interests: - Hosting podcasts about technology, culture, and weird subcultures - Reading everything from sci-fi to philosophy - Attending local comedy shows and open mics - Brunch with friends and deep conversations - Social activism and community organizing relationship_style: approach: Playful and communicative, seeks best friend and intellectual equal love_language: Words of Affirmation and Quality Time ideal_partner: Someone intellectually curious who gives them space while creating emotional safety red_flags: Clinginess, anti-intellectualism, people who take life too seriously bio: | Sam is a charismatic podcast host who moved from Austin to Queens eighteen months ago to break into the bigger NYC media market. Their show has grown significantly since the move, but their personal life has taken a backseat. Their Gemini Sun makes them naturally curious, adaptable, and able to talk to anyone about anything. Their Aquarius Moon adds a progressive, independent streak—they need a partner who respects their freedom and shares their values around social justice. With Cancer Rising, they come across as warm and approachable despite their mental air sign energy. Their Gemini Venus keeps relationships light and fun, while their Taurus Mars provides surprising staying power once they commit. Sam is looking for someone who can match their wit and give them the space to be themselves. dating_history: | Sam's dating history is marked by a pattern of running when things get too serious. In Austin, they had three significant relationships that all ended the same way—their Aquarius Moon's need for freedom clashing with their partners' desire for more commitment. Their Cancer Rising makes people think they're ready for deep emotional connection, but their Gemini Sun and Venus prefer to keep things playful and non-committal. Since moving to NYC, they've gone on countless first and second dates but rarely make it past the third— their fear of losing independence kicks in. Their Taurus Mars suggests they could be loyal and devoted once they find the right person, but they need someone who understands that space and intimacy aren't mutually exclusive. dating_goals: - Find a partner who's both intellectually stimulating and emotionally mature - Build a relationship based on friendship, freedom, and shared curiosity - Someone who can help them feel safe being vulnerable astrological_notes: sun_sign: Gemini moon_sign: Aquarius rising_sign: Cancer venus_sign: Gemini mars_sign: Taurus dominant_element: Air (Gemini Sun + Venus, Aquarius Moon) with Earth/Water grounding chart_pattern: Air sign dominance with Cancer Rising creates warm intellectual who fears vulnerability",
"compatibility": "subject1_name: Zara Patel subject2_name: Sam Martinez overall_compatibility: 69 connection_intensity: 36 compatibility_tier: Moderate sun_compatibility: planet_name: Sun score: 56 compatibility_label: Neutral aspects: - Zara Patel's Sun Sextile Sam Martinez's Sun moon_compatibility: planet_name: Moon score: 72 connection_intensity: 60 compatibility_label: Good aspects: - Zara Patel's Moon Trine Sam Martinez's Mars - Zara Patel's Moon Sextile Sam Martinez's Ascendant - Zara Patel's Ascendant Sextile Sam Martinez's Moon venus_compatibility: planet_name: Venus score: 78 connection_intensity: 80 compatibility_label: Good aspects: - Zara Patel's Venus Conjunction Sam Martinez's Venus - Zara Patel's Venus Conjunction Sam Martinez's Mars - Zara Patel's Venus Sextile Sam Martinez's Ascendant - Zara Patel's Mars Sextile Sam Martinez's Venus mars_compatibility: planet_name: Mars score: 74 connection_intensity: 60 compatibility_label: Good aspects: - Zara Patel's Moon Trine Sam Martinez's Mars - Zara Patel's Venus Conjunction Sam Martinez's Mars - Zara Patel's Mars Sextile Sam Martinez's Venus ascendant_compatibility: planet_name: Ascendant score: 60 connection_intensity: 80 compatibility_label: Good aspects: - Zara Patel's Moon Sextile Sam Martinez's Ascendant - Zara Patel's Venus Sextile Sam Martinez's Ascendant - Zara Patel's Ascendant Sextile Sam Martinez's Moon - Zara Patel's Ascendant Square Sam Martinez's Ascendant summary: total_aspects: 9 harmonious_aspects: 8 challenging_aspects: 1 strengths: - Good Moon harmony (72/100) - Good Venus harmony (78/100) - Good Mars harmony (74/100) challenges: - Ascendant square aspects - growth through friction"
}
workflow = workflow_input.model_dump()
conversation_history: list[TResponseInputItem] = [
{
"role": "user",
"content": [
{
"type": "input_text",
"text": workflow["input_as_text"]
}
]
}
]
if state["chapter"] == 0:
introduction_result_temp = await Runner.run(
introduction,
input=[
*conversation_history
],
run_config=RunConfig(trace_metadata={
"**trace_source**": "agent-builder",
"workflow_id": "wf_6930706d7b5c8190b1ceaea9d3975c740fae062528ba44d5"
})
)

      conversation_history.extend([item.to_input_item() for item in introduction_result_temp.new_items])

      introduction_result = {
        "output_text": introduction_result_temp.final_output_as(str)
      }
      displaymortal_result_temp = await Runner.run(
        displaymortal,
        input=[
          *conversation_history
        ],
        run_config=RunConfig(trace_metadata={
          "__trace_source__": "agent-builder",
          "workflow_id": "wf_6930706d7b5c8190b1ceaea9d3975c740fae062528ba44d5"
        }),
        context=DisplaymortalContext(state_mortal=state["mortal"])
      )
      displaymortal_result = {
        "output_text": displaymortal_result_temp.final_output.json(),
        "output_parsed": displaymortal_result_temp.final_output.model_dump()
      }
      state["chapter"] = state["chapter"] + 1
    elif state["chapter"] == 1:
      mortal_result_temp = await Runner.run(
        mortal,
        input=[
          *conversation_history
        ],
        run_config=RunConfig(trace_metadata={
          "__trace_source__": "agent-builder",
          "workflow_id": "wf_6930706d7b5c8190b1ceaea9d3975c740fae062528ba44d5"
        }),
        context=MortalContext(state_mortal=state["mortal"])
      )

      conversation_history.extend([item.to_input_item() for item in mortal_result_temp.new_items])

      mortal_result = {
        "output_text": mortal_result_temp.final_output_as(str)
      }
      displaymatch_result_temp = await Runner.run(
        displaymatch,
        input=[
          *conversation_history
        ],
        run_config=RunConfig(trace_metadata={
          "__trace_source__": "agent-builder",
          "workflow_id": "wf_6930706d7b5c8190b1ceaea9d3975c740fae062528ba44d5"
        }),
        context=DisplaymatchContext(state_match=state["match"])
      )
      displaymatch_result = {
        "output_text": displaymatch_result_temp.final_output.json(),
        "output_parsed": displaymatch_result_temp.final_output.model_dump()
      }
      state["chapter"] = state["chapter"] + 1
    elif state["chapter"] == 2:
      match_result_temp = await Runner.run(
        match,
        input=[
          *conversation_history
        ],
        run_config=RunConfig(trace_metadata={
          "__trace_source__": "agent-builder",
          "workflow_id": "wf_6930706d7b5c8190b1ceaea9d3975c740fae062528ba44d5"
        }),
        context=MatchContext(state_match=state["match"])
      )

      conversation_history.extend([item.to_input_item() for item in match_result_temp.new_items])

      match_result = {
        "output_text": match_result_temp.final_output_as(str)
      }
      displaycontinuecard_result_temp = await Runner.run(
        displaycontinuecard,
        input=[
          *conversation_history
        ],
        run_config=RunConfig(trace_metadata={
          "__trace_source__": "agent-builder",
          "workflow_id": "wf_6930706d7b5c8190b1ceaea9d3975c740fae062528ba44d5"
        })
      )

      conversation_history.extend([item.to_input_item() for item in displaycontinuecard_result_temp.new_items])

      displaycontinuecard_result = {
        "output_text": displaycontinuecard_result_temp.final_output.json(),
        "output_parsed": displaycontinuecard_result_temp.final_output.model_dump()
      }
      state["chapter"] = state["chapter"] + 1
    elif state["chapter"] == 3:
      displaycompatibilitycard_result_temp = await Runner.run(
        displaycompatibilitycard,
        input=[
          *conversation_history
        ],
        run_config=RunConfig(trace_metadata={
          "__trace_source__": "agent-builder",
          "workflow_id": "wf_6930706d7b5c8190b1ceaea9d3975c740fae062528ba44d5"
        }),
        context=DisplaycompatibilitycardContext(state_compatibility=state["compatibility"])
      )

      conversation_history.extend([item.to_input_item() for item in displaycompatibilitycard_result_temp.new_items])

      displaycompatibilitycard_result = {
        "output_text": displaycompatibilitycard_result_temp.final_output.json(),
        "output_parsed": displaycompatibilitycard_result_temp.final_output.model_dump()
      }
      compatibilityanalysis_result_temp = await Runner.run(
        compatibilityanalysis,
        input=[
          *conversation_history
        ],
        run_config=RunConfig(trace_metadata={
          "__trace_source__": "agent-builder",
          "workflow_id": "wf_6930706d7b5c8190b1ceaea9d3975c740fae062528ba44d5"
        })
      )

      conversation_history.extend([item.to_input_item() for item in compatibilityanalysis_result_temp.new_items])

      compatibilityanalysis_result = {
        "output_text": compatibilityanalysis_result_temp.final_output_as(str)
      }
      displaycontinuecard_result_temp = await Runner.run(
        displaycontinuecard1,
        input=[
          *conversation_history
        ],
        run_config=RunConfig(trace_metadata={
          "__trace_source__": "agent-builder",
          "workflow_id": "wf_6930706d7b5c8190b1ceaea9d3975c740fae062528ba44d5"
        })
      )

      conversation_history.extend([item.to_input_item() for item in displaycontinuecard_result_temp.new_items])

      displaycontinuecard_result = {
        "output_text": displaycontinuecard_result_temp.final_output.json(),
        "output_parsed": displaycontinuecard_result_temp.final_output.model_dump()
      }
      state["chapter"] = state["chapter"] + 1
    elif state["chapter"] == 4:
      startcupidgame_result_temp = await Runner.run(
        startcupidgame,
        input=[
          *conversation_history
        ],
        run_config=RunConfig(trace_metadata={
          "__trace_source__": "agent-builder",
          "workflow_id": "wf_6930706d7b5c8190b1ceaea9d3975c740fae062528ba44d5"
        })
      )

      conversation_history.extend([item.to_input_item() for item in startcupidgame_result_temp.new_items])

      startcupidgame_result = {
        "output_text": startcupidgame_result_temp.final_output_as(str)
      }
      displaychoices_result_temp = await Runner.run(
        displaychoices1,
        input=[
          *conversation_history
        ],
        run_config=RunConfig(trace_metadata={
          "__trace_source__": "agent-builder",
          "workflow_id": "wf_6930706d7b5c8190b1ceaea9d3975c740fae062528ba44d5"
        })
      )

      conversation_history.extend([item.to_input_item() for item in displaychoices_result_temp.new_items])

      displaychoices_result = {
        "output_text": displaychoices_result_temp.final_output.json(),
        "output_parsed": displaychoices_result_temp.final_output.model_dump()
      }
      state["chapter"] = state["chapter"] + 1
    elif state["chapter"] == 5:
      evaluatescenescore_result_temp = await Runner.run(
        evaluatescenescore,
        input=[
          *conversation_history
        ],
        run_config=RunConfig(trace_metadata={
          "__trace_source__": "agent-builder",
          "workflow_id": "wf_6930706d7b5c8190b1ceaea9d3975c740fae062528ba44d5"
        })
      )

      conversation_history.extend([item.to_input_item() for item in evaluatescenescore_result_temp.new_items])

      evaluatescenescore_result = {
        "output_text": evaluatescenescore_result_temp.final_output.json(),
        "output_parsed": evaluatescenescore_result_temp.final_output.model_dump()
      }
      gamedashboard_result_temp = await Runner.run(
        gamedashboard,
        input=[
          *conversation_history
        ],
        run_config=RunConfig(trace_metadata={
          "__trace_source__": "agent-builder",
          "workflow_id": "wf_6930706d7b5c8190b1ceaea9d3975c740fae062528ba44d5"
        }),
        context=GamedashboardContext(state_compatibility=state["compatibility"], input_output_parsed_score=evaluatescenescore_result["output_parsed"]["score"])
      )

      conversation_history.extend([item.to_input_item() for item in gamedashboard_result_temp.new_items])

      gamedashboard_result = {
        "output_text": gamedashboard_result_temp.final_output.json(),
        "output_parsed": gamedashboard_result_temp.final_output.model_dump()
      }
      cupidgame_result_temp = await Runner.run(
        cupidgame,
        input=[
          *conversation_history
        ],
        run_config=RunConfig(trace_metadata={
          "__trace_source__": "agent-builder",
          "workflow_id": "wf_6930706d7b5c8190b1ceaea9d3975c740fae062528ba44d5"
        })
      )

      conversation_history.extend([item.to_input_item() for item in cupidgame_result_temp.new_items])

      cupidgame_result = {
        "output_text": cupidgame_result_temp.final_output_as(str)
      }
      hasended_result_temp = await Runner.run(
        hasended,
        input=[
          *conversation_history
        ],
        run_config=RunConfig(trace_metadata={
          "__trace_source__": "agent-builder",
          "workflow_id": "wf_6930706d7b5c8190b1ceaea9d3975c740fae062528ba44d5"
        })
      )

      conversation_history.extend([item.to_input_item() for item in hasended_result_temp.new_items])

      hasended_result = {
        "output_text": hasended_result_temp.final_output.json(),
        "output_parsed": hasended_result_temp.final_output.model_dump()
      }
      if hasended_result["output_parsed"]["has_ended"] == True:
        state["chapter"] = state["chapter"] + 1
      else:
        displaychoices_result_temp = await Runner.run(
          displaychoices,
          input=[
            *conversation_history
          ],
          run_config=RunConfig(trace_metadata={
            "__trace_source__": "agent-builder",
            "workflow_id": "wf_6930706d7b5c8190b1ceaea9d3975c740fae062528ba44d5"
          })
        )

        conversation_history.extend([item.to_input_item() for item in displaychoices_result_temp.new_items])

        displaychoices_result = {
          "output_text": displaychoices_result_temp.final_output.json(),
          "output_parsed": displaychoices_result_temp.final_output.model_dump()
        }
    else:
      cupidevaluation_result_temp = await Runner.run(
        cupidevaluation,
        input=[
          *conversation_history
        ],
        run_config=RunConfig(trace_metadata={
          "__trace_source__": "agent-builder",
          "workflow_id": "wf_6930706d7b5c8190b1ceaea9d3975c740fae062528ba44d5"
        })
      )

      conversation_history.extend([item.to_input_item() for item in cupidevaluation_result_temp.new_items])

      cupidevaluation_result = {
        "output_text": cupidevaluation_result_temp.final_output_as(str)
      }

```

```
