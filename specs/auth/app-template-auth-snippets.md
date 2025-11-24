# Reusable Auth0 Snippets for Any ChatKit App

This document provides **copy-paste ready code snippets** to add Auth0 authentication to any new ChatKit app in the humorist.ai ecosystem.

---

## Table of Contents

1. [Quick Start Checklist](#quick-start-checklist)
2. [Backend Snippets](#backend-snippets)
3. [Frontend Snippets](#frontend-snippets)
4. [Environment Variables Template](#environment-variables-template)
5. [Deployment Snippets](#deployment-snippets)
6. [GoDaddy DNS Configuration](#godaddy-dns-configuration)
7. [Testing Snippets](#testing-snippets)
8. [Quick Reference](#quick-reference)

---

## Quick Start Checklist

For any new app (e.g., `new-app`):

### 1. Register in Auth0
- [ ] Go to Auth0 Dashboard → Applications → Create Application
- [ ] Name: `New App`
- [ ] Type: Single Page Application
- [ ] Add callback URLs: `https://new-app.humorist.ai/callback`, `http://localhost:5173/callback`
- [ ] Add logout URLs: `https://new-app.humorist.ai`, `http://localhost:5173`
- [ ] Copy Client ID

### 2. Backend Setup
- [ ] Copy `auth.py` to `apps/new-app/backend/app/auth.py`
- [ ] Update `pyproject.toml` dependencies
- [ ] Update `main.py` with auth middleware
- [ ] Create `.env` with Auth0 credentials

### 3. Frontend Setup
- [ ] Install `@auth0/auth0-react`
- [ ] Copy auth config files
- [ ] Wrap app with `Auth0Provider`
- [ ] Update ChatKit config to send token
- [ ] Create `.env` with Auth0 credentials

### 4. DNS Setup (GoDaddy)
- [ ] Deploy app to AWS (get ALB DNS name)
- [ ] Request SSL certificate in ACM
- [ ] Add validation CNAME to GoDaddy DNS
- [ ] Wait for ACM validation
- [ ] Add app subdomain CNAME to GoDaddy DNS

### 5. Test
- [ ] Run locally and test login flow
- [ ] Verify token in API requests
- [ ] Test logout
- [ ] Test production deployment

---

## Backend Snippets

### 1. Dependencies (pyproject.toml)

```toml
[project]
name = "your-app-backend"
version = "0.1.0"
description = "Your app backend with ChatKit"
requires-python = ">=3.11"
dependencies = [
    "fastapi>=0.114.1,<0.116",
    "uvicorn[standard]>=0.36,<0.37",
    "openai>=1.40",
    "openai-chatkit>=1.1.2,<2",
    "pyyaml>=6.0",
    "jinja2>=3.1",
    "python-jose[cryptography]>=3.3.0",  # JWT handling
    "python-dotenv>=1.0.0",              # Environment variables
    "requests>=2.31.0",                  # For JWKS fetching
]

[build-system]
requires = ["setuptools>=68.0", "wheel"]
build-backend = "setuptools.build_meta"
```

### 2. Auth Middleware (app/auth.py)

**Complete file - copy as-is:**

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

### 3. Main.py Template

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

from .auth import get_current_user  # Import auth dependency
from .server import YourAppServer, create_chatkit_server

app = FastAPI(title="Your App API")

# CORS configuration
FRONTEND_URLS = os.getenv("FRONTEND_URLS", "http://localhost:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=FRONTEND_URLS + [
        "http://localhost:5173",
        "https://your-app.humorist.ai",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_chatkit_server: YourAppServer | None = create_chatkit_server()


def get_chatkit_server() -> YourAppServer:
    if _chatkit_server is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="ChatKit server unavailable.",
        )
    return _chatkit_server


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "your-app-backend"}


@app.get("/api/user/profile")
async def get_user_profile(user: dict = Depends(get_current_user)):
    """Get current user's profile."""
    return {
        "user_id": user["sub"],
        "email": user.get("email"),
        "name": user.get("name"),
        "picture": user.get("picture"),
    }


@app.post("/chatkit")
async def chatkit_endpoint(
    request: Request,
    user: dict = Depends(get_current_user),  # Require authentication
    server: YourAppServer = Depends(get_chatkit_server),
) -> Response:
    """ChatKit endpoint - requires authentication."""
    payload = await request.body()

    # Pass user info to ChatKit context
    context = {
        "request": request,
        "user": user,
    }

    result = await server.process(payload, context)
    if isinstance(result, StreamingResult):
        return StreamingResponse(result, media_type="text/event-stream")
    if hasattr(result, "json"):
        return Response(content=result.json, media_type="application/json")
    return JSONResponse(result)
```

### 4. Request Context Update (app/request_context.py)

```python
"""Request context type definition."""

from __future__ import annotations

from typing import TypedDict
from fastapi import Request


class RequestContext(TypedDict, total=False):
    """Context passed through ChatKit request processing."""

    request: Request
    user: dict  # Authenticated user information from Auth0
    # Add your app-specific fields here
```

---

## Frontend Snippets

### 1. Dependencies (package.json)

```json
{
  "dependencies": {
    "@auth0/auth0-react": "^2.2.4",
    "@openai/chatkit-react": "^1.0.0",
    "react": "^19.2.0",
    "react-dom": "^19.2.0",
    "zustand": "^5.0.8"
  }
}
```

### 2. Auth0 Config (src/lib/auth0Config.ts)

```typescript
/**
 * Auth0 configuration
 * Replace YOUR_APP_NAME with your app's name
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

### 3. Main Entry Point (src/main.tsx)

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

### 4. Login Button (src/components/LoginButton.tsx)

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

### 5. Logout Button (src/components/LogoutButton.tsx)

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

### 6. User Profile Display (src/components/UserProfile.tsx)

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

### 7. ChatKit with Auth Token

**Key snippet to add to your ChatKitPanel component:**

```typescript
import { useAuth0 } from "@auth0/auth0-react";

export function ChatKitPanel({ ... }: ChatKitPanelProps) {
  // Get access token function from Auth0
  const { getAccessTokenSilently } = useAuth0();

  const chatkit = useChatKit({
    api: {
      url: CHATKIT_API_URL,
      domainKey: CHATKIT_API_DOMAIN_KEY,
      // 🔑 Add Authorization header with JWT token
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
    // ... rest of config
  });

  // ... rest of component
}
```

### 8. App.tsx with Auth Flow

```typescript
import { useAuth0 } from "@auth0/auth0-react";
import { LoginButton } from "./components/LoginButton";
import { LogoutButton } from "./components/LogoutButton";
import { UserProfile } from "./components/UserProfile";
import { ChatKitPanel } from "./components/ChatKitPanel";

export default function App() {
  const { isLoading, isAuthenticated, error } = useAuth0();

  // Loading state
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-slate-300 border-t-slate-900" />
          <p className="text-sm text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="max-w-md rounded-lg bg-red-50 p-6 text-center">
          <h2 className="mb-2 text-lg font-semibold text-red-900">
            Authentication Error
          </h2>
          <p className="text-sm text-red-700">{error.message}</p>
        </div>
      </div>
    );
  }

  // Login screen
  if (!isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="max-w-md text-center">
          <h1 className="mb-4 text-4xl font-bold">YOUR APP NAME</h1>
          <p className="mb-8 text-slate-600">Your app description</p>
          <LoginButton />
        </div>
      </div>
    );
  }

  // Authenticated app
  return (
    <div className="h-full">
      {/* Header */}
      <div className="sticky top-0 z-30 w-full border-b bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center gap-4 px-6 py-4">
          <h1 className="text-lg font-semibold">YOUR APP</h1>
          <p className="flex-1 text-sm text-slate-600">Description</p>
          <UserProfile />
          <LogoutButton />
        </div>
      </div>

      {/* Main content */}
      <div className="mx-auto max-w-4xl px-6 py-6">
        <ChatKitPanel className="h-full" />
      </div>
    </div>
  );
}
```

---

## Environment Variables Template

### Backend `.env`

```bash
# Auth0 Configuration
AUTH0_DOMAIN=login.humorist.ai
AUTH0_AUDIENCE=https://api.humorist.ai

# CORS Configuration
FRONTEND_URLS=https://your-app.humorist.ai,http://localhost:5173

# OpenAI
OPENAI_API_KEY=sk-...

# App-specific variables
# Add your app's specific env vars here
```

### Frontend `.env`

```bash
# Auth0 Configuration
VITE_AUTH0_DOMAIN=login.humorist.ai
VITE_AUTH0_CLIENT_ID=YOUR_CLIENT_ID_FROM_AUTH0
VITE_AUTH0_AUDIENCE=https://api.humorist.ai
VITE_AUTH0_REDIRECT_URI=https://your-app.humorist.ai/callback

# For local development:
# VITE_AUTH0_REDIRECT_URI=http://localhost:5173/callback

# ChatKit API
VITE_CHATKIT_API_URL=https://your-app.humorist.ai

# App-specific variables
# Add your app's specific env vars here
```

### .env.example Templates

Create these for Git:

**Backend `.env.example`:**
```bash
AUTH0_DOMAIN=login.humorist.ai
AUTH0_AUDIENCE=https://api.humorist.ai
FRONTEND_URLS=https://your-app.humorist.ai,http://localhost:5173
OPENAI_API_KEY=sk-your-key-here
```

**Frontend `.env.example`:**
```bash
VITE_AUTH0_DOMAIN=login.humorist.ai
VITE_AUTH0_CLIENT_ID=your-client-id-here
VITE_AUTH0_AUDIENCE=https://api.humorist.ai
VITE_AUTH0_REDIRECT_URI=http://localhost:5173/callback
VITE_CHATKIT_API_URL=http://localhost:8000
```

---

## Deployment Snippets

### AWS ECS Task Definition

```json
{
  "family": "your-app-backend",
  "containerDefinitions": [
    {
      "name": "backend",
      "image": "your-ecr-repo/your-app-backend:latest",
      "portMappings": [
        {
          "containerPort": 8000,
          "protocol": "tcp"
        }
      ],
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
          "value": "https://your-app.humorist.ai"
        }
      ],
      "secrets": [
        {
          "name": "OPENAI_API_KEY",
          "valueFrom": "arn:aws:secretsmanager:region:account:secret:openai-api-key"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/your-app-backend",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ],
  "requiresCompatibilities": ["FARGATE"],
  "networkMode": "awsvpc",
  "cpu": "256",
  "memory": "512"
}
```

### Dockerfile for Frontend

```dockerfile
# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Build-time environment variables
ARG VITE_AUTH0_DOMAIN
ARG VITE_AUTH0_CLIENT_ID
ARG VITE_AUTH0_AUDIENCE
ARG VITE_AUTH0_REDIRECT_URI
ARG VITE_CHATKIT_API_URL

ENV VITE_AUTH0_DOMAIN=$VITE_AUTH0_DOMAIN
ENV VITE_AUTH0_CLIENT_ID=$VITE_AUTH0_CLIENT_ID
ENV VITE_AUTH0_AUDIENCE=$VITE_AUTH0_AUDIENCE
ENV VITE_AUTH0_REDIRECT_URI=$VITE_AUTH0_REDIRECT_URI
ENV VITE_CHATKIT_API_URL=$VITE_CHATKIT_API_URL

RUN npm run build

# Production stage
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

### nginx.conf for SPA

```nginx
server {
    listen 80;
    server_name localhost;

    root /usr/share/nginx/html;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # SPA fallback - all routes serve index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location /assets {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### Docker Compose

```yaml
version: "3.8"

services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - AUTH0_DOMAIN=login.humorist.ai
      - AUTH0_AUDIENCE=https://api.humorist.ai
      - FRONTEND_URLS=http://localhost:5173
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    volumes:
      - ./backend:/app

  frontend:
    build:
      context: ./frontend
      args:
        - VITE_AUTH0_DOMAIN=login.humorist.ai
        - VITE_AUTH0_CLIENT_ID=${AUTH0_CLIENT_ID}
        - VITE_AUTH0_AUDIENCE=https://api.humorist.ai
        - VITE_AUTH0_REDIRECT_URI=http://localhost:5173/callback
        - VITE_CHATKIT_API_URL=http://localhost:8000
    ports:
      - "5173:80"
    depends_on:
      - backend
```

---

## Testing Snippets

### Test Login Flow

```bash
# Start app
npm run your-app

# Open browser
open http://localhost:5173

# Should see login screen
# Click login → redirect to Auth0
# Login → redirect back to app
# Should be authenticated
```

### Test API with Token

```bash
# Get token from browser DevTools
# Application → Local Storage → Look for @@auth0spajs@@ key

TOKEN="eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."

# Test protected endpoint
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/user/profile

# Should return:
# {
#   "user_id": "auth0|123...",
#   "email": "user@example.com",
#   "name": "John Doe",
#   "picture": "https://..."
# }
```

### Test CORS

```javascript
// Run in browser console on http://localhost:5173

fetch("http://localhost:8000/health")
  .then((r) => r.json())
  .then(console.log)
  .catch(console.error);

// Should succeed (CORS configured correctly)
```

---

## GoDaddy DNS Configuration

After deploying to AWS, configure DNS records in GoDaddy.

### SSL Certificate Validation

When you request an ACM certificate, AWS provides a validation CNAME:

```bash
# From AWS Certificate Manager
Name: _abc123def456.your-app.humorist.ai
Value: _xyz789ghi012.acm-validations.aws.
```

**Add to GoDaddy:**

1. Go to [GoDaddy DNS Management](https://dcc.godaddy.com/manage/dns)
2. Select `humorist.ai`
3. Add Record:

```yaml
Type: CNAME
Name: _abc123def456.your-app
Value: _xyz789ghi012.acm-validations.aws.
TTL: 600
```

### App Subdomain

Point your app subdomain to AWS ALB:

```yaml
Type: CNAME
Name: your-app
Value: your-app-alb-123456789.us-east-1.elb.amazonaws.com
TTL: 600
```

### Auth0 Custom Domain

```yaml
Type: CNAME
Name: login
Value: humorist.edge.tenants.auth0.com
TTL: 600
```

### Complete GoDaddy DNS Example

```
Type    Name            Value                                       TTL
CNAME   login           humorist.edge.tenants.auth0.com             600
CNAME   cupid-simple    cupid-alb-123.us-east-1.elb.amazonaws.com   600
CNAME   new-app         newapp-alb-456.us-east-1.elb.amazonaws.com  600
CNAME   _abc.cupid-     _xyz.acm-validations.aws.                   600
        simple
CNAME   _def.new-app    _ghi.acm-validations.aws.                   600
```

**Notes:**
- GoDaddy automatically appends `.humorist.ai` to the Name field
- SSL validation records can be deleted after ACM validates
- App subdomain records are permanent
- DNS propagation takes 5-10 minutes

See [auth-implementation-guide.md Phase 7](./auth-implementation-guide.md#phase-7-dns-configuration-for-app-subdomains-godaddy) for detailed instructions.

---

## Quick Reference

### Auth0 User Object Structure

```typescript
{
  sub: "auth0|507f1f77bcf86cd799439011",  // Unique user ID
  email: "user@example.com",
  email_verified: true,
  name: "Jane Doe",
  nickname: "jane",
  picture: "https://s.gravatar.com/avatar/...",
  updated_at: "2025-01-15T10:30:00.000Z"
}
```

### JWT Token Claims

```json
{
  "iss": "https://login.humorist.ai/",
  "sub": "auth0|507f1f77bcf86cd799439011",
  "aud": "https://api.humorist.ai",
  "iat": 1735070400,
  "exp": 1735074000,
  "scope": "openid profile email",
  "email": "user@example.com",
  "name": "Jane Doe"
}
```

### Common Auth0 Methods

```typescript
// Frontend (React)
import { useAuth0 } from "@auth0/auth0-react";

const {
  isLoading,          // true while Auth0 initializes
  isAuthenticated,    // true if user logged in
  user,               // User profile object
  error,              // Auth error if any
  loginWithRedirect,  // Function to trigger login
  logout,             // Function to trigger logout
  getAccessTokenSilently,  // Get JWT token for API calls
} = useAuth0();
```

---

## File Structure Reference

Complete file structure for a ChatKit app with Auth0:

```
apps/your-app/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py              # FastAPI app with auth endpoints
│   │   ├── server.py            # ChatKit server
│   │   ├── auth.py              # 🔑 Auth0 JWT validation
│   │   ├── request_context.py   # Context with user info
│   │   ├── agents/
│   │   │   └── your_agent.py
│   │   ├── data/
│   │   ├── widgets/
│   │   └── memory_store.py
│   ├── pyproject.toml           # Dependencies with jose, requests
│   ├── .env                     # Auth0 credentials (gitignored)
│   └── .env.example             # Template
├── frontend/
│   ├── src/
│   │   ├── main.tsx             # 🔑 Auth0Provider wrapper
│   │   ├── App.tsx              # Auth flow logic
│   │   ├── components/
│   │   │   ├── ChatKitPanel.tsx # 🔑 Token in headers
│   │   │   ├── LoginButton.tsx
│   │   │   ├── LogoutButton.tsx
│   │   │   └── UserProfile.tsx
│   │   ├── lib/
│   │   │   ├── auth0Config.ts   # 🔑 Auth0 configuration
│   │   │   └── config.ts
│   │   └── store/
│   ├── package.json             # Dependencies with @auth0/auth0-react
│   ├── .env                     # Auth0 credentials (gitignored)
│   └── .env.example             # Template
└── package.json                 # Root scripts
```

---

## Common Mistakes to Avoid

### ❌ Don't Do This

```typescript
// DON'T hardcode Auth0 credentials
const auth0Config = {
  domain: "login.humorist.ai",
  clientId: "abc123xyz", // ❌ Never hardcode
};

// DON'T expose client secret in frontend
const auth0Config = {
  clientSecret: "secret123", // ❌ Backend only!
};

// DON'T forget to send token
const chatkit = useChatKit({
  api: {
    url: API_URL,
    // ❌ Missing headers function with token
  },
});
```

### ✅ Do This

```typescript
// ✅ Use environment variables
const auth0Config = {
  domain: import.meta.env.VITE_AUTH0_DOMAIN,
  clientId: import.meta.env.VITE_AUTH0_CLIENT_ID,
};

// ✅ Client secret stays in backend .env
# Backend .env only
AUTH0_CLIENT_SECRET=secret123

// ✅ Include token in API requests
const chatkit = useChatKit({
  api: {
    url: API_URL,
    headers: async () => {
      const token = await getAccessTokenSilently();
      return { Authorization: `Bearer ${token}` };
    },
  },
});
```

---

## Next Steps

1. ✅ Choose which app to convert next
2. → Follow Quick Start Checklist above
3. → Copy-paste relevant snippets
4. → Test locally
5. → Deploy to production
6. → Verify SSO works across apps

---

**You're all set!** These snippets should cover 95% of use cases for adding Auth0 to any ChatKit app in the humorist.ai ecosystem. For edge cases or advanced features, refer to the full conversion guide for cupid-simple.
