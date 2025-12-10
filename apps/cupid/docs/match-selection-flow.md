# Cupid Match Selection Flow - Implementation Summary

## Overview

Added a **pre-chat match selection flow** where users select a match before the ChatKit conversation begins. Session data is passed via HTTP header following OpenAI ChatKit best practices.

---

## Changes Made (Commits: `484872d` → `8afd1ac`)

### 1. Backend Refactoring

#### NEW FILES

| File | Purpose |
|------|---------|
| `backend/app/match_session_store.py` | Session store class for temporary match selections (follows `airline_state.py` pattern) |
| `backend/app/data/today_store.py` | Data loading for YAML files (mortal, matches, compatibility) |

#### MODIFIED FILES

| File | Changes |
|------|---------|
| `backend/app/request_context.py` | TypedDict → Pydantic BaseModel with `match_session_id` field |
| `backend/app/main.py` | Uses new stores, extracts `x-match-session-id` header in `/chatkit` endpoint, adds `/api/today` and `/api/match-selection` REST endpoints |
| `backend/app/server.py` | Removed circular import from `main.py`, uses `context.match_session_id` instead |

### 2. Frontend Changes

#### NEW FILES

| File | Purpose |
|------|---------|
| `frontend/src/components/MatchSelectionFlow/index.tsx` | Main flow controller (welcome → select → confirm) |
| `frontend/src/components/MatchSelectionFlow/WelcomePage.tsx` | Shows mortal profile |
| `frontend/src/components/MatchSelectionFlow/SelectMatchPage.tsx` | Match selection cards |
| `frontend/src/components/MatchSelectionFlow/ConfirmPage.tsx` | Confirmation + Play button |
| `frontend/src/components/MatchSelectionFlow/CompatibilityBars.tsx` | Compatibility visualization |
| `frontend/src/styles/match-selection.css` | Styles for selection flow |
| `frontend/src/types/today.ts` | TypeScript types for match data |

#### MODIFIED FILES

| File | Changes |
|------|---------|
| `frontend/src/App.tsx` | Conditionally renders `MatchSelectionFlow` or `ChatKitPanel` based on `gamePhase` |
| `frontend/src/store/useAppStore.ts` | Added `gamePhase`, `todayData`, `selectedMatchId`, `matchSessionId`, `startGame()`, `resetGame()` |
| `frontend/src/components/ChatKitPanel.tsx` | Custom fetch with `x-match-session-id` header, auto-starts game after selection |

### 3. Color Scheme

- **Light mode**: Cream (`#f8f6f1`) - matches ChatKit
- **Dark mode**: Dark blue (`slate-900` / `#0f172a`)

---

## Caddyfile Changes (DEPLOYMENT CRITICAL)

The Caddyfile was modified to route API calls to the backend. **This change is required on the server.**

### Before (simple proxy)
```caddy
cupid.humorist.ai {
    reverse_proxy frontend:80
}

:80 {
    reverse_proxy frontend:80
}
```

### After (path-based routing)
```caddy
cupid.humorist.ai {
    # API routes go to backend
    handle /api/* {
        reverse_proxy backend:8003
    }
    handle /chatkit {
        reverse_proxy backend:8003
    }
    handle /health {
        reverse_proxy backend:8003
    }
    # Everything else goes to frontend
    handle {
        reverse_proxy frontend:80
    }
}

:80 {
    # API routes go to backend
    handle /api/* {
        reverse_proxy backend:8003
    }
    handle /chatkit {
        reverse_proxy backend:8003
    }
    handle /health {
        reverse_proxy backend:8003
    }
    # Everything else goes to frontend
    handle {
        reverse_proxy frontend:80
    }
}
```

### Why This Change?

The new REST endpoints (`/api/today`, `/api/match-selection`) need to reach the backend. Previously, all requests went to the frontend nginx container.

### Deployment Steps

1. Push changes to server
2. Rebuild containers: `docker compose up -d --build`
3. Caddy will auto-reload with new config

---

## Data Flow

```
1. User loads app
   ↓
2. Frontend fetches GET /api/today
   ↓
3. User selects match, clicks Play
   ↓
4. Frontend POSTs to /api/match-selection
   ↓
5. Backend returns session_id
   ↓
6. Frontend stores session_id, transitions to ChatKit
   ↓
7. ChatKit sends POST /chatkit with x-match-session-id header
   ↓
8. Backend retrieves session data, initializes thread.metadata
```

---

## API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/today` | Returns mortal, matches, and compatibility data |
| POST | `/api/match-selection` | Stores selection, returns `session_id` |
| POST | `/chatkit` | ChatKit protocol (accepts `x-match-session-id` header) |
| GET | `/health` | Health check |

---

## Testing

```bash
# Local
cd apps/cupid
docker compose up -d --build

# Verify endpoints
curl http://localhost/api/today | head -c 200
curl -X POST http://localhost/api/match-selection \
  -H "Content-Type: application/json" \
  -d '{"mortal_data":{},"match_data":{},"compatibility_data":{},"selected_match_id":"test"}'
```
