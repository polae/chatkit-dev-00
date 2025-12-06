# Auth0 Integration Spec for Cupid

> **Status**: Ready for Implementation
> **Created**: 2025-12-06
> **App**: `apps/cupid`

## Overview

Add Auth0 social-only authentication (Google, Apple) to Cupid with fully protected access. Users must authenticate before seeing any game content.

### Requirements

| Requirement | Choice |
|-------------|--------|
| Login Flow | Social Only (Google, Apple via Auth0 Universal Login) |
| Access Level | Fully Protected (must login before seeing anything) |
| Data Storage | Add user_id to context now, defer database persistence |

---

## Auth0 Tenant Setup (Manual Steps)

### 1. Create Auth0 Application

1. Log into [Auth0 Dashboard](https://manage.auth0.com/)
2. Go to **Applications > Applications**
3. Click **Create Application**
4. Select **Single Page Application**
5. Name it "Cupid"

### 2. Configure Application Settings

In the application settings, configure:

**Allowed Callback URLs:**
```
http://localhost:5180/callback
https://cupid.humorist.ai/callback
```

**Allowed Logout URLs:**
```
http://localhost:5180
https://cupid.humorist.ai
```

**Allowed Web Origins:**
```
http://localhost:5180
https://cupid.humorist.ai
```

### 3. Enable Social Connections

1. Go to **Authentication > Social**
2. Enable **Google**:
   - Create OAuth credentials in [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
   - Add Client ID and Client Secret to Auth0
3. Enable **Apple**:
   - Configure Sign in with Apple in [Apple Developer Portal](https://developer.apple.com/)
   - Add Service ID and Key to Auth0

### 4. Create API

1. Go to **Applications > APIs**
2. Click **Create API**
3. Configure:
   - **Name**: Cupid API
   - **Identifier**: `https://cupid.humorist.ai/api`
   - **Signing Algorithm**: RS256

### 5. Record Configuration Values

You will need these values for `.env`:

| Variable | Where to Find |
|----------|---------------|
| `AUTH0_DOMAIN` | Application Settings > Domain |
| `AUTH0_CLIENT_ID` | Application Settings > Client ID |
| `AUTH0_AUDIENCE` | API Settings > Identifier |

---

## Implementation Summary

### Files to Create

| File | Description |
|------|-------------|
| `backend/app/auth.py` | JWT validation with PyJWT + JWKS |
| `frontend/src/lib/auth.ts` | Auth0 config constants |
| `frontend/src/components/AuthGuard.tsx` | Auth gate component |
| `frontend/src/components/UserMenu.tsx` | User avatar + logout |

### Files to Modify

| File | Changes |
|------|---------|
| `backend/app/request_context.py` | Add `user_id: str` field |
| `backend/app/main.py` | Add auth dependency to `/chatkit` |
| `backend/pyproject.toml` | Add `PyJWT[crypto]>=2.8.0` |
| `frontend/package.json` | Add `@auth0/auth0-react` |
| `frontend/src/main.tsx` | Wrap with `Auth0Provider` |
| `frontend/src/App.tsx` | Add `AuthGuard` wrapper |
| `frontend/src/components/ChatKitPanel.tsx` | Add custom fetch with Bearer token |
| `docker-compose.yml` | Add AUTH0_* env vars |
| `frontend/Dockerfile` | Add VITE_AUTH0_* build args |

---

## Detailed Implementation

### Backend

#### 1. Create `apps/cupid/backend/app/auth.py`

```python
"""Auth0 JWT validation for Cupid backend."""
from __future__ import annotations

import os
from functools import lru_cache
from typing import Any

import jwt
from jwt import PyJWKClient
from fastapi import HTTPException, Request, status

AUTH0_DOMAIN = os.getenv("AUTH0_DOMAIN", "")
AUTH0_AUDIENCE = os.getenv("AUTH0_AUDIENCE", "")
AUTH0_ALGORITHMS = ["RS256"]


@lru_cache(maxsize=1)
def get_jwks_client() -> PyJWKClient:
    """Get cached JWKS client for Auth0 domain."""
    if not AUTH0_DOMAIN:
        raise ValueError("AUTH0_DOMAIN not configured")
    jwks_url = f"https://{AUTH0_DOMAIN}/.well-known/jwks.json"
    return PyJWKClient(jwks_url, cache_keys=True, lifespan=3600)


def validate_token(token: str) -> dict[str, Any]:
    """Validate JWT and return payload.

    Raises HTTPException on validation failure.
    """
    if not AUTH0_DOMAIN or not AUTH0_AUDIENCE:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Auth0 not configured"
        )

    try:
        jwks_client = get_jwks_client()
        signing_key = jwks_client.get_signing_key_from_jwt(token)

        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=AUTH0_ALGORITHMS,
            audience=AUTH0_AUDIENCE,
            issuer=f"https://{AUTH0_DOMAIN}/",
        )
        return payload

    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_user(request: Request) -> dict[str, Any]:
    """FastAPI dependency to extract and validate user from Authorization header.

    Returns decoded JWT payload with user info.
    Raises HTTPException if not authenticated.
    """
    auth_header = request.headers.get("Authorization", "")

    if not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid Authorization header",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = auth_header[7:]  # Remove "Bearer " prefix
    return validate_token(token)


def get_user_id(payload: dict[str, Any]) -> str:
    """Extract user ID from JWT payload.

    Auth0 uses 'sub' claim as the unique user identifier.
    Format: "google-oauth2|123456789" or "apple|000123.abc..."
    """
    return payload.get("sub", "")
```

#### 2. Modify `apps/cupid/backend/app/request_context.py`

Add `user_id` field:

```python
"""Request context for Cupid Deluxe - holds request-scoped data only.

Game state (chapter, compatibility, scene_number) is stored in thread.metadata,
which is the authoritative source and persists across requests.
"""

from typing import Any, TypedDict


class RequestContext(TypedDict, total=False):
    """Request-scoped context. Game state lives in thread.metadata."""
    request: Any  # HTTP request reference (optional)
    user_id: str  # Authenticated user's ID from Auth0 (format: "provider|id")
```

#### 3. Modify `apps/cupid/backend/app/main.py`

Add auth dependency:

```python
"""FastAPI entrypoint wiring the ChatKit server."""

from __future__ import annotations

from dotenv import load_dotenv
load_dotenv()

from typing import Any

from chatkit.server import StreamingResult
from fastapi import Depends, FastAPI, HTTPException, Request, status
from fastapi.responses import Response, StreamingResponse
from starlette.responses import JSONResponse

from .auth import get_current_user, get_user_id
from .server import CupidServer, create_chatkit_server

app = FastAPI(title="Cupid Deluxe API")

_chatkit_server: CupidServer | None = create_chatkit_server()


def get_chatkit_server() -> CupidServer:
    if _chatkit_server is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="ChatKit server unavailable.",
        )
    return _chatkit_server


@app.get("/health")
def health_check():
    """Health check endpoint for Docker healthcheck."""
    return {"status": "healthy"}


@app.post("/chatkit")
async def chatkit_endpoint(
    request: Request,
    server: CupidServer = Depends(get_chatkit_server),
    user_payload: dict[str, Any] = Depends(get_current_user),
) -> Response:
    """Protected ChatKit endpoint - requires valid Auth0 JWT."""
    user_id = get_user_id(user_payload)

    payload = await request.body()
    result = await server.process(payload, {"request": request, "user_id": user_id})

    if isinstance(result, StreamingResult):
        return StreamingResponse(result, media_type="text/event-stream")
    if hasattr(result, "json"):
        return Response(content=result.json, media_type="application/json")
    return JSONResponse(result)
```

#### 4. Modify `apps/cupid/backend/pyproject.toml`

Add PyJWT dependency:

```toml
dependencies = [
    # ... existing dependencies
    "PyJWT[crypto]>=2.8.0,<3",
]
```

---

### Frontend

#### 1. Install Auth0 SDK

```bash
cd apps/cupid/frontend
npm install @auth0/auth0-react
```

#### 2. Create `apps/cupid/frontend/src/lib/auth.ts`

```typescript
// Auth0 configuration from environment variables
export const AUTH0_DOMAIN = import.meta.env.VITE_AUTH0_DOMAIN ?? "";
export const AUTH0_CLIENT_ID = import.meta.env.VITE_AUTH0_CLIENT_ID ?? "";
export const AUTH0_AUDIENCE = import.meta.env.VITE_AUTH0_AUDIENCE ?? "";

// Callback URL matches Auth0 application settings
export const AUTH0_REDIRECT_URI = window.location.origin + "/callback";

// Check if Auth0 is configured (allows local dev without auth)
export const isAuth0Configured = Boolean(AUTH0_DOMAIN && AUTH0_CLIENT_ID);
```

#### 3. Create `apps/cupid/frontend/src/components/AuthGuard.tsx`

```tsx
import { useAuth0 } from "@auth0/auth0-react";
import { ReactNode } from "react";

type AuthGuardProps = {
  children: ReactNode;
};

export function AuthGuard({ children }: AuthGuardProps) {
  const { isLoading, isAuthenticated, error, loginWithRedirect } = useAuth0();

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-[#f8f6f1] via-[#faf9f5] to-[#f8f6f1] dark:from-slate-900 dark:via-slate-950 dark:to-slate-850">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-pink-200 border-t-pink-500 mx-auto" />
          <p className="text-slate-600 dark:text-slate-300">Loading...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-[#f8f6f1] via-[#faf9f5] to-[#f8f6f1] dark:from-slate-900 dark:via-slate-950 dark:to-slate-850">
        <div className="text-center max-w-md px-6">
          <h2 className="text-xl font-semibold text-red-600 mb-2">Authentication Error</h2>
          <p className="text-slate-600 dark:text-slate-300 mb-4">{error.message}</p>
          <button
            onClick={() => loginWithRedirect()}
            className="px-6 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    loginWithRedirect();
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-[#f8f6f1] via-[#faf9f5] to-[#f8f6f1] dark:from-slate-900 dark:via-slate-950 dark:to-slate-850">
        <div className="text-center">
          <p className="text-slate-600 dark:text-slate-300">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  // User is authenticated, render children
  return <>{children}</>;
}
```

#### 4. Create `apps/cupid/frontend/src/components/UserMenu.tsx`

```tsx
import { useAuth0 } from "@auth0/auth0-react";
import { LogOut, User } from "lucide-react";

export function UserMenu() {
  const { user, logout, isAuthenticated } = useAuth0();

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        {user.picture ? (
          <img
            src={user.picture}
            alt={user.name ?? "User"}
            className="h-8 w-8 rounded-full ring-2 ring-slate-200 dark:ring-slate-700"
          />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-pink-100 dark:bg-pink-900">
            <User className="h-4 w-4 text-pink-600 dark:text-pink-300" />
          </div>
        )}
        <span className="text-sm text-slate-600 dark:text-slate-300 hidden sm:inline">
          {user.name ?? user.email}
        </span>
      </div>
      <button
        onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
        className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
        title="Sign out"
      >
        <LogOut className="h-4 w-4" />
      </button>
    </div>
  );
}
```

#### 5. Modify `apps/cupid/frontend/src/main.tsx`

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Auth0Provider } from "@auth0/auth0-react";
import App from "./App";
import "./index.css";
import {
  AUTH0_DOMAIN,
  AUTH0_CLIENT_ID,
  AUTH0_AUDIENCE,
  AUTH0_REDIRECT_URI,
  isAuth0Configured,
} from "./lib/auth";

const container = document.getElementById("root");
if (!container) {
  throw new Error("Root element with id 'root' not found");
}

// Wrap app with Auth0Provider if configured
const AppWithAuth = isAuth0Configured ? (
  <Auth0Provider
    domain={AUTH0_DOMAIN}
    clientId={AUTH0_CLIENT_ID}
    authorizationParams={{
      redirect_uri: AUTH0_REDIRECT_URI,
      audience: AUTH0_AUDIENCE,
      scope: "openid profile email",
    }}
    useRefreshTokens={true}
    cacheLocation="localstorage"
  >
    <App />
  </Auth0Provider>
) : (
  <App />
);

createRoot(container).render(
  <StrictMode>
    {AppWithAuth}
  </StrictMode>
);
```

#### 6. Modify `apps/cupid/frontend/src/App.tsx`

Add AuthGuard and UserMenu imports/usage:

```tsx
import clsx from "clsx";
import { ChatKitPanel } from "./components/ChatKitPanel";
import { ThemeToggle } from "./components/ThemeToggle";
import { AuthGuard } from "./components/AuthGuard";
import { UserMenu } from "./components/UserMenu";
import { useAppStore } from "./store/useAppStore";
import { isAuth0Configured } from "./lib/auth";

function AppContent() {
  const scheme = useAppStore((state) => state.scheme);

  // ... existing containerClass and headerBarClass definitions ...

  return (
    <div className={containerClass}>
      <div className={headerBarClass}>
        <div className="relative mx-auto flex w-full max-w-4xl items-center gap-4 px-6 py-4">
          <img src="/cupid-cherub.svg" alt="Cupid" className="h-6 w-6" />
          <h1 className="text-lg font-semibold">Cupid</h1>
          <p className="flex-1 text-sm text-slate-600 dark:text-slate-300">
            interactive rom-com
          </p>
          <UserMenu />  {/* ADD THIS */}
          <ThemeToggle />
        </div>
      </div>
      {/* ... rest of component */}
    </div>
  );
}

export default function App() {
  // Only wrap with AuthGuard if Auth0 is configured
  if (isAuth0Configured) {
    return (
      <AuthGuard>
        <AppContent />
      </AuthGuard>
    );
  }

  return <AppContent />;
}
```

#### 7. Modify `apps/cupid/frontend/src/components/ChatKitPanel.tsx`

Add custom fetch with Authorization header:

```tsx
import { ChatKit, useChatKit } from "@openai/chatkit-react";
import { useAuth0 } from "@auth0/auth0-react";
import clsx from "clsx";
import { useMemo } from "react";

import {
  CHATKIT_API_DOMAIN_KEY,
  CHATKIT_API_URL,
  GREETING,
  STARTER_PROMPTS,
} from "../lib/config";
import { isAuth0Configured, AUTH0_AUDIENCE } from "../lib/auth";
import { LEXEND_FONT_SOURCES } from "../lib/fonts";
import { useAppStore } from "../store/useAppStore";
import { WelcomeOverlay } from "./WelcomeOverlay";

export type ChatKitControl = ReturnType<typeof useChatKit>;

type ChatKitPanelProps = {
  onChatKitReady?: (chatkit: ChatKitControl) => void;
  className?: string;
};

export function ChatKitPanel({ onChatKitReady, className }: ChatKitPanelProps) {
  const theme = useAppStore((state) => state.scheme);
  const threadId = useAppStore((state) => state.threadId);
  const setThreadId = useAppStore((state) => state.setThreadId);

  // Get Auth0 token getter (only if configured)
  const { getAccessTokenSilently } = isAuth0Configured
    ? useAuth0()
    : { getAccessTokenSilently: null };

  // Create custom fetch that includes Authorization header
  const customFetch = useMemo(() => {
    if (!getAccessTokenSilently) {
      return undefined; // Use default fetch if Auth0 not configured
    }

    return async (input: RequestInfo | URL, init?: RequestInit) => {
      try {
        // Get fresh access token
        const token = await getAccessTokenSilently({
          authorizationParams: {
            audience: AUTH0_AUDIENCE,
          },
        });

        const headers = new Headers(init?.headers ?? {});
        headers.set("Authorization", `Bearer ${token}`);

        return fetch(input, { ...init, headers });
      } catch (error) {
        console.error("Failed to get access token:", error);
        throw error;
      }
    };
  }, [getAccessTokenSilently]);

  const chatkit = useChatKit({
    api: {
      url: CHATKIT_API_URL,
      domainKey: CHATKIT_API_DOMAIN_KEY,
      ...(customFetch && { fetch: customFetch }),
    },
    // ... rest of existing config unchanged
  });

  return (
    <div className={clsx("relative h-full w-full overflow-hidden", className)}>
      <ChatKit control={chatkit.control} className="block h-full w-full" />
      {!threadId && <WelcomeOverlay chatkit={chatkit} theme={theme} />}
    </div>
  );
}
```

---

### Docker Configuration

#### 1. Modify `apps/cupid/docker-compose.yml`

```yaml
version: '3.8'

services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: cupid-backend
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - FRONTEND_URLS=${FRONTEND_URLS}
      - PORT=8003
      # Auth0 configuration
      - AUTH0_DOMAIN=${AUTH0_DOMAIN}
      - AUTH0_AUDIENCE=${AUTH0_AUDIENCE}
    expose:
      - "8003"
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8003/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    networks:
      - cupid-network

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      args:
        - VITE_CHATKIT_API_DOMAIN_KEY=${VITE_CHATKIT_API_DOMAIN_KEY}
        # Auth0 configuration
        - VITE_AUTH0_DOMAIN=${AUTH0_DOMAIN}
        - VITE_AUTH0_CLIENT_ID=${AUTH0_CLIENT_ID}
        - VITE_AUTH0_AUDIENCE=${AUTH0_AUDIENCE}
    container_name: cupid-frontend
    expose:
      - "80"
    depends_on:
      backend:
        condition: service_healthy
    restart: unless-stopped
    networks:
      - cupid-network

  caddy:
    image: caddy:2-alpine
    container_name: cupid-caddy
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
      - caddy_config:/config
    depends_on:
      - frontend
    restart: unless-stopped
    networks:
      - cupid-network

volumes:
  caddy_data:
  caddy_config:

networks:
  cupid-network:
    driver: bridge
```

#### 2. Modify `apps/cupid/frontend/Dockerfile`

Add Auth0 build args:

```dockerfile
# Stage 1: Build
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# ChatKit config
ARG VITE_CHATKIT_API_DOMAIN_KEY
ENV VITE_CHATKIT_API_DOMAIN_KEY=$VITE_CHATKIT_API_DOMAIN_KEY

# Auth0 build arguments
ARG VITE_AUTH0_DOMAIN
ARG VITE_AUTH0_CLIENT_ID
ARG VITE_AUTH0_AUDIENCE
ENV VITE_AUTH0_DOMAIN=$VITE_AUTH0_DOMAIN
ENV VITE_AUTH0_CLIENT_ID=$VITE_AUTH0_CLIENT_ID
ENV VITE_AUTH0_AUDIENCE=$VITE_AUTH0_AUDIENCE

RUN npm run build

# Stage 2: Production
FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

---

## Environment Variables

### `.env` file (create in `apps/cupid/`)

```bash
# OpenAI
OPENAI_API_KEY=sk-...

# ChatKit
VITE_CHATKIT_API_DOMAIN_KEY=domain_pk_...

# CORS
FRONTEND_URLS=https://cupid.humorist.ai,http://localhost:5180

# Auth0 Configuration
AUTH0_DOMAIN=your-tenant.auth0.com
AUTH0_CLIENT_ID=your-spa-client-id
AUTH0_AUDIENCE=https://cupid.humorist.ai/api
```

---

## Testing Checklist

### Manual Testing

- [ ] Without Auth0 config, app runs in unauthenticated mode (local dev)
- [ ] With Auth0 config, app redirects to Auth0 Universal Login
- [ ] Login with Google works
- [ ] Login with Apple works (requires HTTPS)
- [ ] After login, user returns to app with profile displayed
- [ ] ChatKit API calls include `Authorization: Bearer <token>` header
- [ ] Backend returns 401 without valid token
- [ ] Expired token triggers automatic refresh
- [ ] Logout clears session and redirects to home
- [ ] `user_id` appears in backend logs (add logging to verify)

### API Testing

```bash
# Test without token (should fail)
curl -X POST https://cupid.humorist.ai/chatkit \
  -H "Content-Type: application/json" \
  -d '{"thread_id":"test"}'
# Expected: 401 Unauthorized

# Test with valid token (get token from browser devtools)
curl -X POST https://cupid.humorist.ai/chatkit \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"thread_id":"test"}'
# Expected: Valid response
```

---

## Security Notes

1. **SSE Streaming**: Token is validated BEFORE the stream starts (in FastAPI dependency), so invalid tokens are rejected synchronously
2. **HTTPS Required**: Auth0 and Apple Sign-In require HTTPS in production (Caddy auto-generates certificates)
3. **Token Storage**: Using `cacheLocation: "localstorage"` with refresh tokens for session persistence
4. **JWKS Caching**: PyJWKClient caches public keys for 1 hour to reduce latency
5. **Algorithm Restriction**: Only RS256 accepted, preventing algorithm confusion attacks

---

## Future Enhancements (Out of Scope)

1. **Per-user thread storage**: Use `user_id` to associate threads with users in database
2. **User profile storage**: Store additional user metadata beyond Auth0 claims
3. **Role-based access**: Add custom claims for admin/premium users
4. **Session management**: Active session display and remote logout capability
