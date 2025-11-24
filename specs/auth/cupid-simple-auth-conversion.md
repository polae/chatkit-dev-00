# Converting cupid-simple to Auth0 Authentication

This guide provides **specific code changes** to add Auth0 authentication to the existing cupid-simple app.

---

## Table of Contents

1. [Overview](#overview)
2. [Backend Changes](#backend-changes)
3. [Frontend Changes](#frontend-changes)
4. [Environment Variables](#environment-variables)
5. [Testing](#testing)
6. [Deployment Updates](#deployment-updates)

---

## Overview

### Current State

cupid-simple is a ChatKit-powered matchmaking app with:
- **Frontend**: React + Vite + TypeScript
- **Backend**: FastAPI + ChatKit
- **No authentication** currently

### Target State

After this conversion:
- Users must log in via Auth0
- JWT tokens validate API requests
- SSO works across all humorist.ai subdomains
- User identity passed to ChatKit context

### Architecture Change

```
BEFORE:
User → Frontend → Backend → ChatKit

AFTER:
User → Auth0 Login → Frontend (with JWT) → Backend (validates JWT) → ChatKit
```

---

## Backend Changes

### 1. Install Dependencies

Add to `apps/cupid-simple/backend/pyproject.toml`:

```toml
[project]
name = "cupid-simple-backend"
version = "0.1.0"
description = "Cupid matchmaking game backend with ChatKit"
requires-python = ">=3.11"
dependencies = [
    "fastapi>=0.114.1,<0.116",
    "uvicorn[standard]>=0.36,<0.37",
    "openai>=1.40",
    "openai-chatkit>=1.1.2,<2",
    "pyyaml>=6.0",
    "jinja2>=3.1",
    "python-jose[cryptography]>=3.3.0",  # NEW: JWT handling
    "python-dotenv>=1.0.0",              # NEW: Environment variables
]
```

Then reinstall:
```bash
cd apps/cupid-simple/backend
uv sync
```

### 2. Create Auth Middleware

Create new file: `apps/cupid-simple/backend/app/auth.py`

```python
"""Auth0 JWT validation middleware for FastAPI."""

from __future__ import annotations

import os
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
import requests

# Auth0 configuration from environment
AUTH0_DOMAIN = os.getenv("AUTH0_DOMAIN", "login.humorist.ai")
AUTH0_AUDIENCE = os.getenv("AUTH0_AUDIENCE", "https://api.humorist.ai")
ALGORITHMS = ["RS256"]

# Cache for Auth0 public keys (JWKS)
_jwks_cache: dict | None = None


def get_jwks() -> dict:
    """Fetch Auth0 public keys for JWT verification."""
    global _jwks_cache
    if _jwks_cache is None:
        jwks_url = f"https://{AUTH0_DOMAIN}/.well-known/jwks.json"
        response = requests.get(jwks_url, timeout=10)
        response.raise_for_status()
        _jwks_cache = response.json()
    return _jwks_cache


def verify_token(token: str) -> dict:
    """
    Verify Auth0 JWT token and return claims.

    Raises HTTPException if token is invalid.
    """
    try:
        # Get signing key from Auth0 JWKS
        jwks = get_jwks()
        unverified_header = jwt.get_unverified_header(token)

        # Find the key that matches the token's kid (key ID)
        rsa_key = None
        for key in jwks["keys"]:
            if key["kid"] == unverified_header["kid"]:
                rsa_key = {
                    "kty": key["kty"],
                    "kid": key["kid"],
                    "use": key["use"],
                    "n": key["n"],
                    "e": key["e"],
                }
                break

        if rsa_key is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token: Unable to find appropriate key",
            )

        # Verify and decode the token
        payload = jwt.decode(
            token,
            rsa_key,
            algorithms=ALGORITHMS,
            audience=AUTH0_AUDIENCE,
            issuer=f"https://{AUTH0_DOMAIN}/",
        )

        return payload

    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {str(e)}",
        ) from e


# FastAPI dependency for protected routes
security = HTTPBearer()


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(security)]
) -> dict:
    """
    FastAPI dependency to get current authenticated user.

    Usage:
        @app.get("/api/profile")
        async def get_profile(user: dict = Depends(get_current_user)):
            return {"user_id": user["sub"], "email": user.get("email")}
    """
    token = credentials.credentials
    return verify_token(token)


# Optional: Dependency for routes that work with or without auth
async def get_optional_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(
        HTTPBearer(auto_error=False)
    )
) -> dict | None:
    """
    Optional auth dependency - returns user if authenticated, None if not.
    Does not raise 401 if missing.
    """
    if credentials is None:
        return None

    token = credentials.credentials
    try:
        return verify_token(token)
    except HTTPException:
        return None
```

### 3. Update main.py

Modify `apps/cupid-simple/backend/app/main.py`:

```python
"""FastAPI entrypoint wiring the ChatKit server."""

from __future__ import annotations

import os
from dotenv import load_dotenv
load_dotenv()

from chatkit.server import StreamingResult
from fastapi import Depends, FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, StreamingResponse
from starlette.responses import JSONResponse

from .auth import get_current_user, get_optional_user  # NEW
from .server import CupidServer, create_chatkit_server

app = FastAPI(title="Cupid Game API")

# CORS configuration for production
FRONTEND_URLS = os.getenv("FRONTEND_URLS", "http://localhost:5173,http://localhost").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=FRONTEND_URLS + [
        "http://localhost:5173",  # Local dev
        "http://localhost:80",    # Docker local
        "https://*.vercel.app",   # Vercel deployments
        "https://cupid-simple.humorist.ai",  # Production
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_chatkit_server: CupidServer | None = create_chatkit_server()


def get_chatkit_server() -> CupidServer:
    if _chatkit_server is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="ChatKit server unavailable.",
        )
    return _chatkit_server


@app.get("/health")
async def health_check():
    """Health check endpoint for Docker and load balancers."""
    return {"status": "healthy", "service": "cupid-backend"}


# NEW: Protected user profile endpoint
@app.get("/api/user/profile")
async def get_user_profile(user: dict = Depends(get_current_user)):
    """Get current user's profile information."""
    return {
        "user_id": user["sub"],
        "email": user.get("email"),
        "name": user.get("name"),
        "picture": user.get("picture"),
        "email_verified": user.get("email_verified", False),
    }


# MODIFIED: ChatKit endpoint now requires authentication
@app.post("/chatkit")
async def chatkit_endpoint(
    request: Request,
    user: dict = Depends(get_current_user),  # NEW: Require auth
    server: CupidServer = Depends(get_chatkit_server),
) -> Response:
    """
    ChatKit endpoint - now requires authentication.
    User info is passed in request context.
    """
    payload = await request.body()

    # NEW: Add user info to request context
    context = {
        "request": request,
        "user": user,  # Pass authenticated user to ChatKit
    }

    result = await server.process(payload, context)
    if isinstance(result, StreamingResult):
        return StreamingResponse(result, media_type="text/event-stream")
    if hasattr(result, "json"):
        return Response(content=result.json, media_type="application/json")
    return JSONResponse(result)


# OPTIONAL: Public endpoint for testing (no auth required)
@app.get("/api/public")
async def public_endpoint():
    """Public endpoint - no authentication required."""
    return {"message": "This is a public endpoint"}
```

### 4. Update request_context.py

Modify `apps/cupid-simple/backend/app/request_context.py` to include user info:

```python
"""Request context type definition."""

from __future__ import annotations

from typing import TypedDict
from fastapi import Request


class RequestContext(TypedDict, total=False):
    """Context passed through ChatKit request processing."""

    request: Request
    chapter: int
    mortal_data: dict
    match_data: dict
    user: dict  # NEW: Authenticated user information
```

### 5. Optional: Use User Info in Agents

If you want to personalize responses based on the logged-in user, modify agent instructions:

In `apps/cupid-simple/backend/app/agents/cupid_agent.py`:

```python
INSTRUCTIONS = """
You are Cupid, the divine matchmaker from Mount Olympus.

{# NEW: Access user info if available #}
{% if context.request_context.user %}
You are speaking with {{ context.request_context.user.get('name', 'mortal') }}.
Their email is {{ context.request_context.user.get('email') }}.
{% endif %}

You speak with divine authority but a playful wit...
[Rest of instructions]
"""
```

---

## Frontend Changes

### 1. Install Dependencies

Add to `apps/cupid-simple/frontend/package.json`:

```json
{
  "dependencies": {
    "@auth0/auth0-react": "^2.2.4",
    "@openai/chatkit-react": "^1.0.0",
    "lucide-react": "^0.544.0",
    "react": "^19.2.0",
    "react-dom": "^19.2.0",
    "zustand": "^5.0.8"
  }
}
```

Then install:
```bash
cd apps/cupid-simple/frontend
npm install
```

### 2. Create Auth0 Provider

Create new file: `apps/cupid-simple/frontend/src/lib/auth0Config.ts`

```typescript
/**
 * Auth0 configuration for cupid-simple
 */

export const auth0Config = {
  domain: import.meta.env.VITE_AUTH0_DOMAIN || "login.humorist.ai",
  clientId: import.meta.env.VITE_AUTH0_CLIENT_ID || "",
  authorizationParams: {
    redirect_uri:
      import.meta.env.VITE_AUTH0_REDIRECT_URI ||
      `${window.location.origin}/callback`,
    audience: import.meta.env.VITE_AUTH0_AUDIENCE || "https://api.humorist.ai",
  },
  cookieDomain: ".humorist.ai", // 🔑 Enables SSO across subdomains
  useRefreshTokens: true,
  cacheLocation: "localstorage" as const,
};
```

### 3. Wrap App with Auth0Provider

Modify `apps/cupid-simple/frontend/src/main.tsx`:

```typescript
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Auth0Provider } from "@auth0/auth0-react";
import App from "./App";
import { auth0Config } from "./lib/auth0Config";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Auth0Provider
      domain={auth0Config.domain}
      clientId={auth0Config.clientId}
      authorizationParams={auth0Config.authorizationParams}
      useRefreshTokens={auth0Config.useRefreshTokens}
      cacheLocation={auth0Config.cacheLocation}
    >
      <App />
    </Auth0Provider>
  </StrictMode>
);
```

### 4. Create Login Components

Create new file: `apps/cupid-simple/frontend/src/components/LoginButton.tsx`

```typescript
import { useAuth0 } from "@auth0/auth0-react";
import { LogIn } from "lucide-react";

export function LoginButton() {
  const { loginWithRedirect } = useAuth0();

  return (
    <button
      onClick={() => loginWithRedirect()}
      className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
    >
      <LogIn size={16} />
      Log In
    </button>
  );
}
```

Create new file: `apps/cupid-simple/frontend/src/components/LogoutButton.tsx`

```typescript
import { useAuth0 } from "@auth0/auth0-react";
import { LogOut } from "lucide-react";

export function LogoutButton() {
  const { logout } = useAuth0();

  return (
    <button
      onClick={() =>
        logout({
          logoutParams: {
            returnTo: window.location.origin,
          },
        })
      }
      className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
    >
      <LogOut size={16} />
      Log Out
    </button>
  );
}
```

Create new file: `apps/cupid-simple/frontend/src/components/UserProfile.tsx`

```typescript
import { useAuth0 } from "@auth0/auth0-react";

export function UserProfile() {
  const { user } = useAuth0();

  if (!user) return null;

  return (
    <div className="flex items-center gap-2">
      {user.picture && (
        <img
          src={user.picture}
          alt={user.name}
          className="h-8 w-8 rounded-full ring-2 ring-slate-200 dark:ring-slate-700"
        />
      )}
      <span className="text-sm font-medium">{user.name || user.email}</span>
    </div>
  );
}
```

### 5. Update ChatKitPanel to Use Auth Token

Modify `apps/cupid-simple/frontend/src/components/ChatKitPanel.tsx`:

```typescript
import { ChatKit, useChatKit } from "@openai/chatkit-react";
import { useAuth0 } from "@auth0/auth0-react";
import clsx from "clsx";

import {
  CHATKIT_API_DOMAIN_KEY,
  CHATKIT_API_URL,
  GREETING,
  STARTER_PROMPTS,
} from "../lib/config";
import { useAppStore } from "../store/useAppStore";

export type ChatKitControl = ReturnType<typeof useChatKit>;

type ChatKitPanelProps = {
  onChatKitReady?: (chatkit: ChatKitControl) => void;
  className?: string;
};

export function ChatKitPanel({ onChatKitReady, className }: ChatKitPanelProps) {
  const theme = useAppStore((state) => state.scheme);
  const setThreadId = useAppStore((state) => state.setThreadId);

  // NEW: Get access token from Auth0
  const { getAccessTokenSilently } = useAuth0();

  const chatkit = useChatKit({
    api: {
      url: CHATKIT_API_URL,
      domainKey: CHATKIT_API_DOMAIN_KEY,
      // NEW: Add Authorization header with JWT token
      headers: async () => {
        try {
          const token = await getAccessTokenSilently();
          return {
            Authorization: `Bearer ${token}`,
          };
        } catch (error) {
          console.error("Failed to get access token:", error);
          return {};
        }
      },
    },
    theme: {
      density: "spacious",
      colorScheme: theme,
      color: {
        grayscale: {
          hue: 220,
          tint: 6,
          shade: theme === "dark" ? -1 : -4,
        },
        accent: {
          primary: theme === "dark" ? "#f1f5f9" : "#0f172a",
          level: 1,
        },
      },
      radius: "round",
    },
    startScreen: {
      greeting: GREETING,
      prompts: STARTER_PROMPTS,
    },
    composer: {
      placeholder: "Type your message...",
    },
    threadItemActions: {
      feedback: false,
    },
    onThreadChange: ({ threadId }) => setThreadId(threadId),
    onError: ({ error }) => {
      console.error("ChatKit error", error);
    },
    onReady: () => {
      onChatKitReady?.(chatkit);
    },
  });

  return (
    <div className={clsx("relative h-full w-full overflow-hidden", className)}>
      <ChatKit control={chatkit.control} className="block h-full w-full" />
    </div>
  );
}
```

### 6. Update App.tsx

Modify `apps/cupid-simple/frontend/src/App.tsx`:

```typescript
import { useAuth0 } from "@auth0/auth0-react";
import clsx from "clsx";
import { ChatKitPanel } from "./components/ChatKitPanel";
import { ThemeToggle } from "./components/ThemeToggle";
import { LoginButton } from "./components/LoginButton";
import { LogoutButton } from "./components/LogoutButton";
import { UserProfile } from "./components/UserProfile";
import { useAppStore } from "./store/useAppStore";

export default function App() {
  const scheme = useAppStore((state) => state.scheme);
  const { isLoading, isAuthenticated, error } = useAuth0();

  const containerClass = clsx(
    "h-full bg-gradient-to-br transition-colors duration-300",
    scheme === "dark"
      ? "from-slate-900 via-slate-950 to-slate-850 text-slate-100"
      : "from-slate-100 via-white to-slate-200 text-slate-900"
  );

  const headerBarClass = clsx(
    "sticky top-0 z-30 w-full border-b backdrop-blur",
    scheme === "dark"
      ? "bg-slate-950/80 border-slate-800/70 text-slate-100"
      : "bg-white/90 border-slate-200/70 text-slate-900"
  );

  // Show loading state
  if (isLoading) {
    return (
      <div className={containerClass}>
        <div className="flex h-screen items-center justify-center">
          <div className="text-center">
            <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-slate-300 border-t-slate-900 dark:border-slate-700 dark:border-t-slate-100" />
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Loading...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className={containerClass}>
        <div className="flex h-screen items-center justify-center">
          <div className="max-w-md rounded-lg bg-red-50 p-6 text-center dark:bg-red-900/20">
            <h2 className="mb-2 text-lg font-semibold text-red-900 dark:text-red-100">
              Authentication Error
            </h2>
            <p className="text-sm text-red-700 dark:text-red-300">
              {error.message}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show login screen if not authenticated
  if (!isAuthenticated) {
    return (
      <div className={containerClass}>
        <div className="flex h-screen items-center justify-center">
          <div className="max-w-md text-center">
            <h1 className="mb-4 text-4xl font-bold">CUPID</h1>
            <p className="mb-8 text-slate-600 dark:text-slate-300">
              Divine matchmaking powered by the stars
            </p>
            <LoginButton />
          </div>
        </div>
      </div>
    );
  }

  // Main authenticated app
  return (
    <div className={containerClass}>
      <div className={headerBarClass}>
        <div className="relative mx-auto flex w-full max-w-4xl items-center gap-4 px-6 py-4">
          <h1 className="text-lg font-semibold">CUPID</h1>
          <p className="flex-1 text-sm text-slate-600 dark:text-slate-300">
            Divine matchmaking powered by the stars
          </p>
          <UserProfile />
          <ThemeToggle />
          <LogoutButton />
        </div>
      </div>
      <div
        className="mx-auto w-full max-w-4xl px-6 pb-10 pt-6"
        style={{ height: "calc(100vh - 80px)" }}
      >
        <ChatKitPanel className="relative h-full w-full overflow-hidden rounded-3xl bg-white/80 shadow-lg ring-1 ring-slate-200/60 backdrop-blur dark:bg-slate-900/70 dark:ring-slate-800/60" />
      </div>
    </div>
  );
}
```

### 7. Create Callback Route (Optional)

Create new file: `apps/cupid-simple/frontend/src/pages/Callback.tsx` (if you want a dedicated callback page):

```typescript
import { useAuth0 } from "@auth0/auth0-react";
import { useEffect } from "react";

export function Callback() {
  const { isLoading, error } = useAuth0();

  useEffect(() => {
    if (!isLoading && !error) {
      // Redirect to home after successful auth
      window.location.href = "/";
    }
  }, [isLoading, error]);

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="mb-2 text-lg font-semibold">Authentication Error</h2>
          <p className="text-sm text-slate-600">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-center">
        <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-slate-300 border-t-slate-900" />
        <p className="text-sm text-slate-600">Completing login...</p>
      </div>
    </div>
  );
}
```

---

## Environment Variables

### Backend `.env`

Create `apps/cupid-simple/backend/.env`:

```bash
# Auth0 Configuration
AUTH0_DOMAIN=login.humorist.ai
AUTH0_AUDIENCE=https://api.humorist.ai

# CORS Configuration
FRONTEND_URLS=https://cupid-simple.humorist.ai,http://localhost:5173

# OpenAI (existing)
OPENAI_API_KEY=sk-...
```

### Frontend `.env`

Create `apps/cupid-simple/frontend/.env`:

```bash
# Auth0 Configuration
VITE_AUTH0_DOMAIN=login.humorist.ai
VITE_AUTH0_CLIENT_ID=YOUR_CLIENT_ID_FROM_AUTH0
VITE_AUTH0_AUDIENCE=https://api.humorist.ai
VITE_AUTH0_REDIRECT_URI=https://cupid-simple.humorist.ai/callback

# For local development, use:
# VITE_AUTH0_REDIRECT_URI=http://localhost:5173/callback

# ChatKit API (existing)
VITE_CHATKIT_API_URL=https://cupid-simple.humorist.ai
```

**Important:** Add `.env` to `.gitignore`:

```bash
echo "*.env" >> .gitignore
echo ".env.local" >> .gitignore
```

---

## Testing

### Local Testing

1. **Set up Auth0** (see auth-implementation-guide.md)

2. **Configure environment variables**:
   ```bash
   # Backend
   cd apps/cupid-simple/backend
   cp .env.example .env
   # Edit .env with your Auth0 credentials

   # Frontend
   cd apps/cupid-simple/frontend
   cp .env.example .env
   # Edit .env with your Auth0 credentials
   ```

3. **Install dependencies**:
   ```bash
   # Backend
   cd apps/cupid-simple/backend
   uv sync

   # Frontend
   cd apps/cupid-simple/frontend
   npm install
   ```

4. **Run the app**:
   ```bash
   npm run cupid-simple
   ```

5. **Test login flow**:
   - Visit http://localhost:5173
   - Should see login screen
   - Click "Log In"
   - Redirect to Auth0 Universal Login
   - Sign up or log in
   - Redirect back to http://localhost:5173/callback
   - Should see authenticated app

6. **Test API authentication**:
   ```bash
   # This should fail (no token)
   curl http://localhost:8000/api/user/profile

   # Get token from browser DevTools → Application → Local Storage
   # Look for key like: @@auth0spajs@@::CLIENT_ID::AUDIENCE::openid profile email
   TOKEN="eyJhbGc..."

   # This should succeed
   curl -H "Authorization: Bearer $TOKEN" \
     http://localhost:8000/api/user/profile
   ```

---

## Deployment Updates

### AWS ECS Task Definition

Update task definition to include Auth0 environment variables:

```json
{
  "containerDefinitions": [
    {
      "name": "cupid-simple-backend",
      "environment": [
        {
          "name": "AUTH0_DOMAIN",
          "value": "login.humorist.ai"
        },
        {
          "name": "AUTH0_AUDIENCE",
          "value": "https://api.humorist.ai"
        },
        {
          "name": "FRONTEND_URLS",
          "value": "https://cupid-simple.humorist.ai"
        }
      ],
      "secrets": [
        {
          "name": "OPENAI_API_KEY",
          "valueFrom": "arn:aws:secretsmanager:..."
        }
      ]
    }
  ]
}
```

### Frontend Build

Update build configuration to include Auth0 variables:

```bash
# During build, set environment variables
export VITE_AUTH0_DOMAIN=login.humorist.ai
export VITE_AUTH0_CLIENT_ID=your_production_client_id
export VITE_AUTH0_AUDIENCE=https://api.humorist.ai
export VITE_AUTH0_REDIRECT_URI=https://cupid-simple.humorist.ai/callback

npm run build
```

### Docker Compose (if using)

Update `docker-compose.yml`:

```yaml
version: "3.8"

services:
  backend:
    environment:
      - AUTH0_DOMAIN=login.humorist.ai
      - AUTH0_AUDIENCE=https://api.humorist.ai
      - FRONTEND_URLS=http://localhost:5173
      - OPENAI_API_KEY=${OPENAI_API_KEY}

  frontend:
    environment:
      - VITE_AUTH0_DOMAIN=login.humorist.ai
      - VITE_AUTH0_CLIENT_ID=${AUTH0_CLIENT_ID}
      - VITE_AUTH0_AUDIENCE=https://api.humorist.ai
      - VITE_AUTH0_REDIRECT_URI=http://localhost:5173/callback
```

---

## DNS Configuration with GoDaddy

After deploying to AWS, configure DNS in GoDaddy to point to your AWS resources.

### Step 1: Get AWS Resource Information

After deploying cupid-simple to AWS, note:

```bash
# Application Load Balancer DNS name
ALB_DNS=cupid-simple-alb-123456789.us-east-1.elb.amazonaws.com

# ACM Certificate validation CNAME (from AWS Certificate Manager)
CERT_VALIDATION_NAME=_abc123def456.cupid-simple.humorist.ai
CERT_VALIDATION_VALUE=_xyz789ghi012.acm-validations.aws.
```

### Step 2: Add DNS Records to GoDaddy

1. Go to [GoDaddy DNS Management](https://dcc.godaddy.com/manage/dns)
2. Select domain: `humorist.ai`
3. Add SSL validation record:

```yaml
Type: CNAME
Name: _abc123def456.cupid-simple
Value: _xyz789ghi012.acm-validations.aws.
TTL: 600
```

4. Wait for ACM to validate (5-30 mins), then add app subdomain:

```yaml
Type: CNAME
Name: cupid-simple
Value: cupid-simple-alb-123456789.us-east-1.elb.amazonaws.com
TTL: 600
```

### Step 3: Verify DNS

```bash
# Check DNS resolution
nslookup cupid-simple.humorist.ai
# Should return AWS ALB IP addresses

# Test HTTPS
curl -I https://cupid-simple.humorist.ai
# Should return 200 OK with valid SSL
```

**Complete GoDaddy DNS Setup:**

```
Type    Name            Value
CNAME   login           humorist.edge.tenants.auth0.com
CNAME   cupid-simple    cupid-simple-alb-123.us-east-1.elb.amazonaws.com
CNAME   _abc123.cupid   _xyz789.acm-validations.aws.
        -simple
```

See [auth-implementation-guide.md Phase 7](./auth-implementation-guide.md#phase-7-dns-configuration-for-app-subdomains-godaddy) for detailed DNS setup instructions.

---

## Verification Checklist

After deployment, verify:

- [ ] Login works on production domain
- [ ] JWT token included in ChatKit requests
- [ ] Backend validates token correctly
- [ ] User info accessible in backend
- [ ] Logout works correctly
- [ ] Session persists across browser refresh
- [ ] SSO works (test with another app subdomain)
- [ ] Error handling works (expired token, invalid token)

---

## Common Issues

### Issue: "Invalid state" error during login

**Cause:** Callback URL mismatch

**Solution:**
1. Verify callback URL in Auth0 app settings matches exactly
2. Check for trailing slashes (should match)
3. Ensure HTTP vs HTTPS matches

### Issue: CORS error when calling backend

**Cause:** Frontend domain not in CORS allowed origins

**Solution:**
1. Add frontend domain to `FRONTEND_URLS` in backend .env
2. Restart backend server

### Issue: Token not being sent to backend

**Cause:** Missing `headers` function in ChatKit config

**Solution:**
- Verify `headers: async () => { ... }` is in ChatKitPanel.tsx
- Check browser DevTools → Network tab for Authorization header

### Issue: "Audience claim missing" error

**Cause:** Auth0 SDK not requesting audience

**Solution:**
- Verify `audience` in `authorizationParams` in auth0Config.ts
- Ensure it matches API identifier in Auth0

---

## Next Steps

1. ✅ Complete this conversion for cupid-simple
2. → Test thoroughly in local environment
3. → Deploy to staging/production
4. → Test SSO by creating a second app
5. → Use `app-template-auth-snippets.md` for future apps

---

**Congratulations!** You've successfully added Auth0 authentication to cupid-simple. This same pattern can now be applied to all future apps in the humorist.ai ecosystem.
