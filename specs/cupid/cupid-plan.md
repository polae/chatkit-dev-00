# Cupid Deluxe Implementation Plan

## Overview
Build `apps/cupid/` - a deluxe version of cupid-simple with a 7-chapter workflow, multiple widgets, and richer game mechanics.

**Source of Truth**: `specs/cupid/workflows/cupid-workflow.md` - Follow this workflow code exactly for agent definitions, Pydantic schemas, and chapter flow.

## Key Decisions
- **App name**: `cupid` (in `apps/cupid/`)
- **Dashboard widget**: Compatibility Snapshot (simpler bars)
- **Model**: gpt-5.1 (as specified in cupid-workflow.md)
- **Widget actions**: Send messages (Continue sends "Continue", Choice sends "A - Title")
- **Implementation**: Follow cupid-workflow.md exactly for agent structure and flow

## Architecture

### Chapter Flow (from workflow)
```
Chapter 0: Introduction -> DisplayMortal -> chapter++
Chapter 1: Mortal -> DisplayMatch -> chapter++
Chapter 2: Match -> DisplayContinueCard -> chapter++
Chapter 3: DisplayCompatibilityCard -> CompatibilityAnalysis -> DisplayContinueCard -> chapter++
Chapter 4: StartCupidGame -> DisplayChoices -> chapter++
Chapter 5: EvaluateSceneScore -> GameDashboard -> CupidGame -> HasEnded -> (loop or chapter++)
Chapter 6+: CupidEvaluation
```

### Widgets (from specs/cupid/widgets/)
| Widget | Agent | Action Type |
|--------|-------|-------------|
| ProfileCard02 | DisplayMortal, DisplayMatch | Button sends "Continue" |
| Continue Card | DisplayContinueCard | Button sends "Continue" |
| CompatibilityAnalysis | DisplayCompatibilityCard | None (info display) |
| Choice list | DisplayChoices | ListItem sends "A - Title" |
| Compatibility Snapshot | GameDashboard | None (info display) |

### Agents to Create
Based on workflow, create agents with structured output:

1. **IntroductionAgent** - Text output, narrative intro
2. **MortalAgent** - Text output, mortal narrative
3. **MatchAgent** - Text output, match narrative
4. **CompatibilityAnalysisAgent** - Structured output for analysis
5. **StartCupidGameAgent** - Text output, game start narrative
6. **CupidGameAgent** - Text output, game scenes with choices
7. **EvaluateSceneScoreAgent** - Structured output (score, reasoning)
8. **HasEndedAgent** - Structured output (has_ended: bool)
9. **CupidEvaluationAgent** - Text output, final evaluation

**Display agents** (structured output for widgets):
- DisplayMortalAgent -> ProfileCard02 schema
- DisplayMatchAgent -> ProfileCard02 schema
- DisplayContinueCardAgent -> Continue Card schema
- DisplayCompatibilityCardAgent -> CompatibilityAnalysis schema
- DisplayChoicesAgent -> Choice list schema
- GameDashboardAgent -> Compatibility Snapshot schema

## Implementation Steps

### 1. Create App Structure
```
apps/cupid/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py
│   │   ├── server.py
│   │   ├── request_context.py
│   │   ├── memory_store.py
│   │   ├── thread_item_converter.py
│   │   ├── agents/
│   │   │   ├── __init__.py
│   │   │   ├── introduction_agent.py
│   │   │   ├── mortal_agent.py
│   │   │   ├── match_agent.py
│   │   │   ├── compatibility_analysis_agent.py
│   │   │   ├── start_cupid_game_agent.py
│   │   │   ├── cupid_game_agent.py
│   │   │   ├── evaluate_scene_score_agent.py
│   │   │   ├── has_ended_agent.py
│   │   │   ├── cupid_evaluation_agent.py
│   │   │   └── display_agents.py  # All display agents
│   │   ├── data/
│   │   │   ├── mortal.yaml
│   │   │   ├── match.yaml
│   │   │   └── compatibility.yaml
│   │   ├── instructions/
│   │   │   └── (copy from specs/cupid/instructions/)
│   │   └── widgets/
│   │       ├── __init__.py
│   │       ├── profilecard_widget.py
│   │       ├── continue_card_widget.py
│   │       ├── compatibility_analysis_widget.py
│   │       ├── choice_list_widget.py
│   │       └── compatibility_snapshot_widget.py
│   └── pyproject.toml
├── frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── ChatKitPanel.tsx
│   │   │   └── ThemeToggle.tsx
│   │   ├── lib/
│   │   │   └── config.ts
│   │   └── store/
│   │       └── useAppStore.ts
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
└── package.json
```

### 2. Backend Implementation

#### 2.1 Copy Base Files from cupid-simple
- `memory_store.py` (unchanged)
- `thread_item_converter.py` (unchanged)
- `request_context.py` (extend for chapter state)

#### 2.2 Create Widget Builders
Each widget builder loads the `.widget` file from `specs/cupid/widgets/` and renders with Jinja2:

```python
# Example: widgets/profilecard_widget.py
def build_profilecard_widget(data: dict) -> Widget:
    # Load specs/cupid/widgets/ProfileCard02.widget
    # Render template with data
    # Return Widget object
```

#### 2.3 Create Agents
Each agent loads instructions from `app/instructions/` folder:

```python
# agents/introduction_agent.py
INSTRUCTIONS_PATH = Path(__file__).parent.parent / "instructions" / "cupid-agent-introduction.md"
with open(INSTRUCTIONS_PATH, "r") as f:
    INSTRUCTIONS = f.read()

introduction_agent = Agent(
    name="Introduction",
    instructions=INSTRUCTIONS,
    model="gpt-5.1",
)
```

#### 2.4 Create Display Agents with Pydantic Output Types
```python
# agents/display_agents.py
class ProfileCardOutput(BaseModel):
    name: str
    age: int
    occupation: str
    location: str
    birthdate: str
    origin: Origin
    astrological_notes: AstrologicalNotes

display_mortal_agent = Agent(
    name="DisplayMortal",
    instructions="Generate ProfileCard from mortal data...",
    model="gpt-5.1",
    output_type=ProfileCardOutput,
)
```

#### 2.5 Implement server.py
The main orchestrator with chapter-based logic:

```python
class CupidServer(ChatKitServer[RequestContext]):
    async def action(self, thread, action, sender, context):
        # Handle widget actions
        if action.type == "continue":
            message_text = "Continue"
        elif action.type == "choice.select":
            key = action.payload.get("key")
            title = action.payload.get("title")
            message_text = f"{key} - {title}"

        # Create user message and call respond()

    async def respond(self, thread, item, context):
        chapter = context.get("chapter", 0)

        if chapter == 0:
            # Introduction + DisplayMortal + ProfileCard widget
        elif chapter == 1:
            # Mortal + DisplayMatch + ProfileCard widget
        elif chapter == 2:
            # Match + DisplayContinueCard + Continue Card widget
        elif chapter == 3:
            # DisplayCompatibilityCard + CompatibilityAnalysis widget + DisplayContinueCard
        elif chapter == 4:
            # StartCupidGame + DisplayChoices + Choice list widget
        elif chapter == 5:
            # Game loop: EvaluateSceneScore -> GameDashboard -> CupidGame -> HasEnded
            # If has_ended: chapter++, else: DisplayChoices loop
        else:
            # CupidEvaluation (final)
```

### 3. Frontend Implementation

#### 3.1 Copy from cupid-simple
- Most files unchanged
- Update `config.ts`: Only "Play" prompt
- Update `App.tsx`: Title "CUPID"

#### 3.2 config.ts
```typescript
export const STARTER_PROMPTS: StartScreenPrompt[] = [
  { label: "Play", prompt: "Play", icon: "play" },
];
```

### 4. Data Files
Copy from `specs/cupid/data/`:
- `mortal.yaml`
- `match.yaml`
- `compatibility.yaml`

### 5. Instructions Files
Copy from `specs/cupid/instructions/` to `app/instructions/`:
- `cupid-agent-introduction.md`
- `cupid-agent-mortal.md`
- `cupid-agent-match.md`
- `cupid-agent-compatibility-analysis.md`
- `cupid-agent-start-cupid-game.md`
- `cupid-agent-cupid-game.md`
- `cupid-agent-cupid-evaluation.md`
- `cupid-agent-game-dashboard.md`
- `cupid-agent-display-compatibility-card.md`

### 6. Root package.json
Add script:
```json
"cupid": "concurrently \"npm run cupid:backend\" \"npm run cupid:frontend\"",
"cupid:backend": "cd apps/cupid/backend && uv run uvicorn app.main:app --reload --port 8010",
"cupid:frontend": "cd apps/cupid/frontend && npm run dev -- --port 5180"
```

## Critical Files to Create/Modify

### New Files
- `apps/cupid/backend/app/server.py` - Main orchestrator
- `apps/cupid/backend/app/agents/*.py` - All agents
- `apps/cupid/backend/app/widgets/*.py` - Widget builders
- `apps/cupid/backend/app/instructions/*.md` - Copy from specs
- `apps/cupid/backend/app/data/*.yaml` - Copy from specs
- `apps/cupid/frontend/src/*` - Copy from cupid-simple

### Files to Modify
- `package.json` (root) - Add cupid scripts

## Testing Checklist
1. Run `npm run cupid`
2. Click "Play" button
3. Verify chapter 0: Introduction + Mortal ProfileCard
4. Click Continue on ProfileCard
5. Verify chapter 1: Mortal narrative + Match ProfileCard
6. Continue through all chapters
7. Test Choice list sends correct message format
8. Test game loop in chapter 5
9. Verify final evaluation
