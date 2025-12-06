# Plan: Cupid Data MCP Server

## Goal
Create an MCP server (`cupid-data`) that provides database access for profiles and compatibility data, enabling:
1. Discovery via Claude Desktop / Agent Builder
2. Future integration with Cupid's FastAPI backend

## Architecture Decision: MCP-First

**Why MCP first?**
- Test tools conversationally before any integration
- Works with Agent Builder for visual testing
- Same server works with OpenAI agents (HTTP mode) and Claude (STDIO)
- Follows your established `astrologer-mcp` patterns

## Project Location

```
/Users/johnsteven/GITHUB/MCP/mcp-servers/mcps/cupid-data/
├── server.py              # PEP 723 header + FastMCP (dual transport)
├── src/
│   ├── __init__.py
│   ├── service.py         # CupidDataService (CRUD operations)
│   ├── database.py        # SQLite + SQLAlchemy setup
│   ├── models.py          # Profile, Compatibility ORM models
│   ├── schemas.py         # Pydantic models for validation
│   └── utils.py           # Format helpers (JSON/Markdown)
├── data/
│   └── db/
│       └── cupid.db       # SQLite database
├── scripts/
│   └── seed_from_yaml.py  # Migrate existing YAML → SQLite
├── README.md
└── test.py
```

## Database Schema

### profiles table (single table for mortal/match)
```sql
CREATE TABLE profiles (
    id INTEGER PRIMARY KEY,
    role TEXT NOT NULL,              -- 'mortal' | 'match'
    name TEXT NOT NULL,
    age INTEGER,
    occupation TEXT,
    location TEXT,
    birthdate TEXT,

    -- Origin (JSON)
    origin JSON,                     -- {"city": "...", "state": "...", "country": "..."}

    -- Personality (JSON)
    personality JSON,                -- {"core_traits": [...], "strengths": [...], "challenges": [...]}

    -- Interests (JSON array)
    interests JSON,

    -- Relationship style (JSON)
    relationship_style JSON,

    -- Bios
    short_bio TEXT,
    bio TEXT,
    dating_history TEXT,
    dating_goals JSON,

    -- Astrological (JSON)
    astrological_notes JSON,         -- {"sun_sign": "...", "moon_sign": "...", ...}

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_name ON profiles(name);
```

### compatibility table
```sql
CREATE TABLE compatibility (
    id INTEGER PRIMARY KEY,
    subject1_id INTEGER NOT NULL REFERENCES profiles(id),
    subject2_id INTEGER NOT NULL REFERENCES profiles(id),
    overall_compatibility INTEGER,
    connection_intensity INTEGER,
    compatibility_tier TEXT,

    -- Planet compatibility (JSON)
    sun_compatibility JSON,
    moon_compatibility JSON,
    venus_compatibility JSON,
    mars_compatibility JSON,
    ascendant_compatibility JSON,

    -- Summary (JSON)
    summary JSON,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(subject1_id, subject2_id)
);
```

## MCP Tools (CRUD + Query)

### Profile Operations
| Tool | Description | Annotation |
|------|-------------|------------|
| `cupid_create_profile` | Create new profile (mortal/match) | destructiveHint: false |
| `cupid_get_profile` | Get profile by ID or name | readOnlyHint: true |
| `cupid_update_profile` | Update profile fields | destructiveHint: true |
| `cupid_delete_profile` | Delete profile by ID | destructiveHint: true |
| `cupid_list_profiles` | List profiles with pagination/filters | readOnlyHint: true |
| `cupid_search_profiles` | Search by name, traits, interests | readOnlyHint: true |

### Compatibility Operations
| Tool | Description | Annotation |
|------|-------------|------------|
| `cupid_create_compatibility` | Create compatibility between two profiles | destructiveHint: false |
| `cupid_get_compatibility` | Get compatibility by profile pair | readOnlyHint: true |
| `cupid_update_compatibility` | Update compatibility scores | destructiveHint: true |
| `cupid_delete_compatibility` | Delete compatibility record | destructiveHint: true |

### Utility
| Tool | Description |
|------|-------------|
| `cupid_list_tools` | List all available tools with descriptions |

## Implementation Steps

### Step 1: Project Setup
- [ ] Create directory structure at `/Users/johnsteven/GITHUB/MCP/mcp-servers/mcps/cupid-data/`
- [ ] Create `server.py` with PEP 723 header (SQLAlchemy, pydantic, mcp[cli])
- [ ] Set up dual transport (STDIO + HTTP)

### Step 2: Database Layer
- [ ] Create `src/models.py` with SQLAlchemy ORM models (Profile, Compatibility)
- [ ] Create `src/database.py` with connection management (following astrologer pattern)
- [ ] Create `src/schemas.py` with Pydantic models for input validation

### Step 3: Service Layer
- [ ] Create `src/service.py` with CupidDataService class
- [ ] Implement CRUD methods for profiles
- [ ] Implement CRUD methods for compatibility
- [ ] Add search/filter capabilities

### Step 4: MCP Tools
- [ ] Register profile tools in `server.py`
- [ ] Register compatibility tools in `server.py`
- [ ] Add comprehensive docstrings (examples, error handling)
- [ ] Add tool annotations (readOnlyHint, destructiveHint, etc.)

### Step 5: Data Migration
- [ ] Create `scripts/seed_from_yaml.py` to migrate existing Cupid YAML files
- [ ] Test migration with mortal.yaml, match.yaml, compatibility.yaml

### Step 6: Testing & Documentation
- [ ] Test with `mcp dev server.py` and MCP Inspector
- [ ] Create README.md with Claude Desktop config
- [ ] Test STDIO mode (Claude Desktop)
- [ ] Test HTTP mode (for future OpenAI integration)

## Key Files to Reference

**Astrologer MCP patterns (copy structure):**
- `/Users/johnsteven/GITHUB/MCP/mcp-servers/mcps/astrologer-mcp/server.py`
- `/Users/johnsteven/GITHUB/MCP/mcp-servers/mcps/astrologer-mcp/src/database.py`
- `/Users/johnsteven/GITHUB/MCP/mcp-servers/mcps/astrologer-mcp/src/models.py`
- `/Users/johnsteven/GITHUB/MCP/mcp-servers/mcps/astrologer-mcp/src/service.py`

**Cupid data models (source of truth for schema):**
- `/Users/johnsteven/GITHUB/CHATKIT/chatkit-dev-00/apps/cupid/backend/app/data/mortal.yaml`
- `/Users/johnsteven/GITHUB/CHATKIT/chatkit-dev-00/apps/cupid/backend/app/data/match.yaml`
- `/Users/johnsteven/GITHUB/CHATKIT/chatkit-dev-00/apps/cupid/backend/app/data/compatibility.yaml`

**Best practices:**
- `/Users/johnsteven/GITHUB/MCP/mcp-servers/docs/MCP_BEST_PRACTICES.md`

## Future: FastAPI Integration

Once discovery is complete, integrate with Cupid's FastAPI backend:

```python
# In apps/cupid/backend/app/server.py
from mcp import MCPServerStdio

async def get_profile_from_mcp(profile_id: int):
    async with MCPServerStdio(
        "uv", "--directory", "/path/to/cupid-data", "run", "server.py"
    ) as server:
        result = await server.call_tool("cupid_get_profile", {"id": profile_id})
        return result
```

Or use HTTP mode for remote deployment:
```bash
uv run server.py --http --port 8001
```

## Success Criteria

1. Can query profiles via Claude Desktop
2. Full CRUD operations work in MCP Inspector
3. Seed script migrates existing YAML data
4. README enables easy setup
5. HTTP mode works for future OpenAI integration
