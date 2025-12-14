# Cupid Deluxe

An interactive romance fiction game where you play as Cupid, a divine matchmaker guiding a couple through their first date. Your strategic choices influence how the relationship unfolds.

## Quick Start

```bash
cd apps/cupid
docker compose up -d --build    # Start all services
docker compose logs -f          # View logs
docker compose down             # Stop
```

Access at http://localhost

## The Game

**You are Cupid.** A mortal needs your help finding love. You'll:

1. **Meet your mortal** - See their profile, personality, and dating history
2. **Choose their match** - Select from 3-4 potential partners based on compatibility
3. **Guide the date** - Make strategic choices as scenes unfold
4. **Get evaluated** - Receive your own astrological profile based on your matchmaking style

### The Big Four (Astrological System)

Every character has 4 placements that drive compatibility:

| Planet | Meaning |
|--------|---------|
| ☀️ Sun | Identity & core self |
| 🌙 Moon | Emotional needs |
| 💖 Venus | Love style |
| 🔥 Mars | Passion & conflict |

Compatibility scores for each planet determine the "physics" of attraction and tension.

### Player Choices

During the date, you're presented with 3-4 strategic options:

```
🏹 CUPID'S OPTIONS

OPTION A: "IMMEDIATE YES" — Strike While the Iron's Hot
Advice: Have Maya say yes to coffee right now.
✅ Plays to spontaneity of meet-cute
⚠️ Risk: Her Aquarius moon might regret the impulsive choice

OPTION B: "SLOW PLAY" — Exchange Numbers, Text Later
...
```

Your choices shape the narrative and ultimately define what kind of matchmaker you are.

## Architecture

```
apps/cupid/
├── backend/
│   ├── app/
│   │   ├── main.py                 # FastAPI entrypoint
│   │   ├── server.py               # CupidServer - game orchestrator
│   │   ├── agents/                 # 12 agent definitions
│   │   ├── instructions/           # Agent prompts (.md files)
│   │   ├── data/                   # Character YAML files
│   │   │   ├── mortal.yaml         # The person seeking love
│   │   │   ├── match.yaml          # Potential matches
│   │   │   └── compatibility.yaml  # Pre-computed synastry scores
│   │   └── widgets/                # UI component builders
│   ├── Dockerfile
│   └── pyproject.toml
├── frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── ChatKitPanel.tsx    # ChatKit SDK integration
│   │   │   └── MatchSelectionFlow/ # Pre-game selection wizard
│   │   └── store/useAppStore.ts    # Zustand state
│   ├── Dockerfile
│   └── vite.config.ts
├── docker-compose.yml
└── Caddyfile
```

## Game Flow

### Phase 1: Match Selection (Frontend)

A 4-page wizard before the chat begins:

1. **Welcome** - Introduction to being Cupid
2. **Meet Mortal** - See the person you're helping (profile card)
3. **Select Match** - Choose from potential partners (compatibility bars shown)
4. **Confirm** - Review pairing, start the game

### Phase 2: The Date (Chat)

| Chapter | What Happens |
|---------|--------------|
| 0 | Introduction + Meet the Mortal (ProfileCard widget) |
| 1 | Mortal's backstory + Meet the Match (ProfileCard widget) |
| 2 | Match's backstory |
| 3 | Compatibility Analysis (CompatibilityCard widget with Big Four breakdown) |
| 4 | **The Date** - Narrative scenes with player choices (loops until story ends) |
| 5 | Cupid's Evaluation - Your matchmaking style analyzed |
| 6 | End - Thank you, play again? |

**Chapter 4 is the core loop:** The `StartCupidGame` agent narrates scenes, `HasEnded` checks if the story concluded, and `DisplayChoices` extracts your options. You keep making choices until the date reaches its natural conclusion.

## Agents

All agents use `gpt-4.1` with low reasoning effort.

| Agent | Type | Purpose |
|-------|------|---------|
| Introduction | Streaming | Game opening, ask if ready |
| DisplayMortal | Structured | Extract ProfileCard data |
| Mortal | Streaming | Narrate mortal's personality |
| DisplayMatch | Structured | Extract ProfileCard data |
| Match | Streaming | Narrate match's personality |
| DisplayCompatibilityCard | Structured | Extract compatibility widget data |
| CompatibilityAnalysis | Streaming | Narrate Big Four breakdown |
| StartCupidGame | Streaming | Narrate date scenes with choices |
| HasEnded | Structured | Check if story concluded |
| DisplayChoices | Structured | Extract choice options |
| CupidEvaluation | Streaming | Analyze your matchmaking style |
| End | Streaming | Conclusion, offer replay |

**Agent Categories:**
- **routing** - HasEnded (flow control)
- **content** - Introduction, Mortal, Match, StartCupidGame, CompatibilityAnalysis
- **ui** - DisplayMortal, DisplayMatch, DisplayCompatibilityCard, DisplayChoices
- **meta** - CupidEvaluation, End

## Narrative Style

From the agent instructions - the voice is "Upper West Side intellectual meets rom-com narrator":

- Wry humor (New Yorker magazine territory)
- Warm beneath the irony, never cruel
- Wit, not whimsy
- Brief, not breathless

**Astrological tags are parenthetical, not subjects:**
- ✅ "She's fearless (♈️ ☀️)—first through every door"
- ❌ "Her ♈️ ☀️ makes her fearless"

## Environment Variables

```bash
OPENAI_API_KEY=sk-...
LANGFUSE_PUBLIC_KEY=pk-lf-...      # Optional: observability
LANGFUSE_SECRET_KEY=sk-lf-...
LANGFUSE_BASE_URL=https://us.cloud.langfuse.com
```

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `POST /chatkit` | Main ChatKit endpoint |
| `GET /api/today` | Get mortal + matches + compatibility data |
| `POST /api/match-selection` | Store selected match, returns session_id |
| `GET /health` | Health check |

The frontend passes `x-match-session-id` header to associate chat threads with match selections.

## Observability

Langfuse tracing via OpenInference instrumentation.

### Known Issue: Streaming Usage

**Issue:** https://github.com/Arize-ai/openinference/issues/2530

The `openinference-instrumentation-openai-agents` library doesn't capture token usage for streaming responses. This affects `CupidEvaluation` and `End` agents.

**Workaround:** `server.py` manually captures usage from `result.raw_responses` after streaming completes using the Langfuse SDK v3 API. See `_log_streaming_usage_to_langfuse()` method.

The workaround creates standalone GENERATION observations with:
- Proper model name (`gpt-5.1`) for cost calculation
- `metadata.workaround: "streaming_usage_capture"` marker
- Token counts via `usage_details`
- Streamed text content in `output.text` for dashboard conversation view

**When to remove:** Once the upstream issue is fixed, search for references to issue #2530 in `server.py`.

## Development

```bash
# Backend (without Docker)
cd backend
uv sync
uv run uvicorn app.main:app --reload --port 8003

# Frontend (without Docker)
cd frontend
npm install
npm run dev
```
