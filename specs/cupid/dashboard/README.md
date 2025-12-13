# Cupid Observability Dashboard

An observability platform for the Cupid AI matchmaking game, built on Langfuse tracing data.

## Overview

This dashboard provides visibility into Cupid's AI conversations, showing:
- Session-level conversation tracking
- Agent performance analytics
- Aggregate metrics and cost tracking

## Langfuse Data Available

| Resource | Count | Description |
|----------|-------|-------------|
| Traces | 106 | Individual agent workflow executions |
| Sessions | 13 | Conversation threads (multi-turn) |
| Observations | ~300 | Nested spans within traces |

### Data Structure

```
Session (thr_xxx)
└── Trace: "Agent workflow"
    ├── metadata: { mortal, match, chapter }
    ├── tags: ["chapter_1", "cupid"]
    └── Observations:
        └── AGENT: "Agent workflow" (orchestrator)
            └── AGENT: "<SubAgent>" (one of 12 agents below)
                └── GENERATION: "response"
                    ├── input: message history
                    ├── output: model response
                    ├── model: "gpt-5.1-2025-11-13"
                    ├── tokens: { input, output, total }
                    └── cost: USD
```

### Cupid Agent Workflow

The game consists of 12 distinct sub-agents orchestrated by "Agent workflow":

| Agent | Category | Purpose | Typical Latency |
|-------|----------|---------|-----------------|
| **HasEnded** | Routing | Checks if game has ended | ~120ms |
| **StartCupidGame** | Control | Initializes game session | ~2.4s |
| **DisplayChoices** | UI | Shows player choice options | ~3.0s |
| **Introduction** | Content | Game introduction narrative | ~7.2s |
| **Mortal** | Content | Generates mortal character profile | ~10.6s |
| **DisplayMortal** | UI | Displays mortal character card | ~5.8s |
| **Match** | Content | Generates match character profile | ~8.3s |
| **DisplayMatch** | UI | Displays match character card | ~2.0s |
| **CompatibilityAnalysis** | Content | Analyzes astrological compatibility | ~10.7s |
| **DisplayCompatibilityCard** | UI | Shows compatibility breakdown | ~8.2s |
| **CupidEvaluation** | Content | Final game evaluation | ~20.5s |
| **End** | Control | Game conclusion | ~5.8s |

**Agent Categories:**
- **Routing/Control**: Fast decision-making agents (HasEnded, StartCupidGame, End)
- **UI/Display**: Render widgets and cards (Display* agents)
- **Content**: Generate narrative and analysis (Mortal, Match, CompatibilityAnalysis, CupidEvaluation)

## Dashboard Views

### 1. Sessions (`sessions.html`)
List of all conversation sessions with aggregate stats.

**Note:** Since user = session = thread (1:1 relationship in anonymous mode), the layout is simplified.

**Features:**
- Session table with: Session ID, Status, Characters, Duration, View button
- **Progress badges**: Shows game completion status (Complete, Intro, Mortal, Match, Compatibility, Story, Evaluation)
- Expandable rows showing: Total Cost, Avg Latency, First Seen, Last Active, Trace count
- Search by session ID or character name
- KPI cards: Sessions, Total Cost, Avg Duration, Avg Latency
- Link to full conversation transcript for each session

**API Used:** `GET /sessions`, `GET /traces?sessionId=X`

### 2. Conversation (`conversation.html`)
Full conversation transcript showing the complete player experience.

**Features:**
- **Progress badge**: "Complete" (green) or "Made it to: [Chapter]" (yellow) in header
- Chronological message list with user inputs and agent responses
- Chapter dividers separating game phases
- Markdown rendering for narrative content (headings, bold, lists, dialogue)
- Per-message metrics: latency, cost, timestamp
- Expandable details showing token counts and model info

**Game Flow Displayed:**
```
Chapter 0: Introduction
Chapter 1: Meet the Mortal
Chapter 2: Meet the Match
Chapter 3: Compatibility Analysis
Chapter 4: The Story (date scenes with player choices)
Chapter 5: Cupid's Evaluation
Chapter 6: The End
```

**Completion Detection:**
- A session is "Complete" if it has an End agent execution OR chapter 5/6 tags
- Incomplete sessions show the highest chapter reached

**API Used:** `GET /traces?sessionId=X`, `GET /traces/{id}` (for each trace's observations)

### 3. Agents (`agent.html`)
Performance analytics for all 12 sub-agents across all sessions.

**Features:**
- Agent cards for each sub-agent (excludes "Agent workflow" orchestrator)
- Per-agent metrics: executions, avg latency, total cost, total tokens, success rate
- Latency over time chart (line)
- Executions by hour chart (bar)
- Recent executions table
- Sorted by execution count (most active agents first)

**API Used:** `GET /observations` (fetches both AGENT and GENERATION types, links parent-child relationships)

### 4. Metrics (`metrics.html`)
Aggregate analytics dashboard.

**Features:**
- KPI cards: Unique Sessions, Total Traces, Total Cost, Avg Latency, Cost per Session
- Cost by chapter (doughnut chart)
- Traces per day - last 7 days (bar chart)

**API Used:** `GET /traces`, `GET /sessions`

## Technical Stack

- **Pure HTML/CSS/JS** - No frameworks, easy to understand and modify
- **Chart.js** - For all visualizations
- **marked.js** - Markdown rendering for conversation transcripts
- **Langfuse REST API** - Direct API calls with Basic Auth
- **CSS Custom Properties** - Dark theme design system

## Files

```
dashboard/
├── README.md           # This file
├── styles.css          # Shared design system (dark theme)
├── api.js              # Langfuse API client + utilities
├── download-data.js    # Script to download Langfuse data to JSON
├── data/               # Downloaded JSON data files
│   ├── langfuse-data.json
│   ├── sessions.json
│   ├── traces.json
│   ├── observations.json
│   └── trace-details.json
├── index.html          # Navigation hub with quick stats
├── sessions.html       # Session list view
├── conversation.html   # Full conversation transcript view
├── agent.html          # Agent performance view
└── metrics.html        # Aggregate metrics view
```

## Running Locally

```bash
cd specs/cupid/dashboard
python3 -m http.server 8080
# Open http://localhost:8080
```

## Langfuse Configuration

Credentials are configured in `api.js`:

```javascript
const LANGFUSE_CONFIG = {
  baseUrl: 'https://us.cloud.langfuse.com/api/public',
  publicKey: 'pk-lf-...',
  secretKey: 'sk-lf-...'
};
```

### Data Loading

The dashboard uses **downloaded JSON data** from Langfuse (avoids CORS issues):

```bash
# Download fresh data from Langfuse API
node download-data.js

# Data saved to data/ directory:
# - langfuse-data.json (combined)
# - sessions.json, traces.json, observations.json, trace-details.json
```

**Configuration** in `api.js`:
- `USE_JSON_DATA = true` - Load from JSON files (default)
- `USE_JSON_DATA = false` - Use live API (requires CORS proxy)
- `USE_MOCK_ON_ERROR = true` - Fall back to mock data if JSON fails

**To refresh data**: Run `node download-data.js` periodically to sync with Langfuse.

For live API access, consider:
1. A backend proxy to handle Langfuse API calls
2. Langfuse's official SDK with server-side rendering

## API Endpoints Used

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/sessions` | GET | List all sessions |
| `/traces` | GET | List traces with filters |
| `/traces/{id}` | GET | Get trace with nested observations |
| `/observations` | GET | List observations with filters |

### Rate Limiting

**Langfuse API has aggressive rate limits** that affect data fetching:

| Observed Behavior | Impact |
|-------------------|--------|
| **429 Too Many Requests** | Returned after ~20-50 sequential requests |
| **Recovery time** | 30-60 seconds before rate limit resets |
| **Per-endpoint limits** | Each endpoint has separate limits |

**Current mitigation** in `download-data.js`:
```javascript
// Exponential backoff: 4s, 8s, 16s, 32s, 64s
const waitTime = Math.pow(2, attempt) * 2000;

// Delays between requests
await new Promise(r => setTimeout(r, 300)); // Between trace details
await new Promise(r => setTimeout(r, 500)); // Between paginated requests
```

**Server Design Implications:**

1. **Caching is mandatory** - Cannot make real-time API calls per dashboard request
2. **Background sync** - Use a scheduled job to refresh data (e.g., every 5-10 minutes)
3. **Request queuing** - Implement a queue with rate limiting for API calls
4. **Incremental updates** - Fetch only new data since last sync (use `fromTimestamp` param)
5. **Webhook alternative** - Consider Langfuse webhooks for real-time updates instead of polling

**Recommended server architecture:**
```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  Dashboard  │────▶│   Backend    │────▶│  Langfuse   │
│  (Browser)  │     │   Server     │     │    API      │
└─────────────┘     └──────────────┘     └─────────────┘
                           │
                    ┌──────▼──────┐
                    │   Cache     │
                    │ (Redis/DB)  │
                    └─────────────┘

- Dashboard requests hit cached data (fast, no rate limits)
- Background worker syncs with Langfuse periodically
- Worker respects rate limits with exponential backoff
```

## Design Decisions

### Why Pure HTML/CSS/JS?
- Quick prototyping without build setup
- Easy to inspect and modify
- Can be converted to React/Vue later
- Works directly in browser

### Dark Theme
- Matches Langfuse's aesthetic
- Easier on eyes for dashboard monitoring
- Better contrast for data visualization

## Future Enhancements

1. **Scores** - Add quality rating display when implemented
2. **Real-time updates** - WebSocket connection for live data
3. **Alerts** - Threshold-based notifications for latency/errors
4. **Comparison mode** - Side-by-side agent comparison
5. **Export** - CSV/PDF export for reports
6. **Filters** - More granular filtering (by model, by tag, by date range)

## Research Sources

Best practices were researched from:
- Langfuse official documentation and blog posts
- Datadog APM trace visualization patterns
- Honeycomb waterfall trace UI
- OpenTelemetry visualization guides
