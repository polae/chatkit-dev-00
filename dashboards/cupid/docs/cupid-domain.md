# Cupid Game Domain

This document explains the Cupid AI matchmaking game domain - the agents, chapters, and data structures that the dashboard monitors.

## Game Overview

Cupid is an AI-powered matchmaking game where players experience a mythological dating simulation. The game follows a structured narrative through seven chapters, orchestrated by 12 specialized AI agents.

## Agent Workflow

The game is powered by an **Agent Workflow** orchestrator that delegates to specialized sub-agents. Each agent has a specific role in the game flow.

### The 12 Agents

| Agent | Category | Purpose | Typical Latency |
|-------|----------|---------|-----------------|
| **HasEnded** | routing | Checks if game has already ended | ~120ms |
| **StartCupidGame** | control | Initializes game session and state | ~2.4s |
| **Introduction** | content | Generates game introduction narrative | ~7.2s |
| **DisplayMortal** | ui | Displays the mortal character card | ~5.8s |
| **Mortal** | content | Generates mortal character profile | ~10.6s |
| **DisplayMatch** | ui | Displays the match character card | ~2.0s |
| **Match** | content | Generates match character profile | ~8.3s |
| **DisplayCompatibilityCard** | ui | Shows compatibility breakdown card | ~8.2s |
| **CompatibilityAnalysis** | content | Analyzes astrological compatibility | ~10.7s |
| **DisplayChoices** | ui | Shows player choice options | ~3.0s |
| **CupidEvaluation** | content | Final game evaluation and verdict | ~20.5s |
| **End** | control | Game conclusion and wrap-up | ~5.8s |

### Agent Categories

Agents are grouped into four functional categories:

| Category | Color | Agents | Description |
|----------|-------|--------|-------------|
| **routing** | Yellow | HasEnded | Fast decision-making, typically <500ms |
| **control** | Blue | StartCupidGame, End | Game lifecycle management |
| **content** | Purple | Introduction, Mortal, Match, CompatibilityAnalysis, CupidEvaluation | LLM-generated narrative content |
| **ui** | Green | DisplayMortal, DisplayMatch, DisplayCompatibilityCard, DisplayChoices | Widget rendering and display |

## Game Chapters

The game progresses through seven chapters (0-6):

| Chapter | Name | Description |
|---------|------|-------------|
| 0 | **Introduction** | Game introduction and setup |
| 1 | **Meet the Mortal** | Player meets the mortal character seeking love |
| 2 | **Meet the Match** | Introduction of the potential match character |
| 3 | **Compatibility Analysis** | Astrological compatibility breakdown |
| 4 | **The Story** | Date scenes with player choices |
| 5 | **Cupid's Evaluation** | Final assessment of the match |
| 6 | **The End** | Game conclusion |

### Chapter Tags

Each trace in Langfuse is tagged with its chapter (e.g., `chapter_0`, `chapter_1`). The dashboard extracts these tags to:
- Show progress badges on sessions
- Calculate cost-by-chapter metrics
- Display chapter dividers in conversation view

## Session Completion

A session is considered **complete** when either:
1. The `max_chapter` reaches 5 or higher, OR
2. An `End` agent observation exists in the session

Incomplete sessions display "Made it to: [Chapter Name]" in the dashboard.

## Data Hierarchy

```
Session (thr_xxx)
├── id: Thread/session identifier
├── mortal_name: Player character name
├── match_name: Match character name
├── max_chapter: Highest chapter reached (0-6)
├── is_complete: Boolean completion flag
│
└── Traces (one per agent workflow execution)
    ├── id: Unique trace ID
    ├── timestamp: Execution time
    ├── chapter: Game chapter tag
    ├── total_cost: LLM cost for this turn
    ├── latency: Total execution time
    │
    └── Observations (nested spans)
        ├── AGENT: "Agent workflow" (orchestrator)
        │   └── AGENT: "<SubAgent>" (one of 12 agents)
        │       └── GENERATION: "response"
        │           ├── input: Message history
        │           ├── output: Model response
        │           ├── model: e.g., "gpt-4.1-mini"
        │           ├── tokens: {prompt, completion, total}
        │           └── cost: USD
        │
        └── Parent-child relationships via parent_observation_id
```

## Metadata

### Trace Metadata

Each trace includes metadata extracted from the game:

```json
{
  "mortal": "Character name of the mortal",
  "match": "Character name of the match"
}
```

### Tags

Traces are tagged with:
- `cupid` - Identifies Cupid game traces
- `chapter_N` - Chapter number (0-6)

## Agent Execution Patterns

### Content Agents (Slow, Expensive)
- **Introduction**, **Mortal**, **Match**, **CompatibilityAnalysis**, **CupidEvaluation**
- Generate narrative content using LLMs
- Latency: 7-20+ seconds
- Higher token counts and costs

### UI Agents (Medium Speed)
- **DisplayMortal**, **DisplayMatch**, **DisplayCompatibilityCard**, **DisplayChoices**
- Render widgets and cards
- Latency: 2-8 seconds

### Control/Routing Agents (Fast)
- **HasEnded**, **StartCupidGame**, **End**
- Quick decision-making or state management
- Latency: <3 seconds typically

## Cost Distribution

Typical cost distribution across chapters:
- **Chapter 0-2** (Setup): ~20% of total cost
- **Chapter 3** (Compatibility): ~15% of total cost
- **Chapter 4** (Story): ~35% of total cost (multiple turns)
- **Chapter 5-6** (Evaluation/End): ~30% of total cost
