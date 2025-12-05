# Cupid Docker Deployment Plan

## Objective

Configure the Cupid app (full version) with Docker so it can:
1. Run locally via Docker Compose
2. Deploy to the same AWS EC2 server currently running Cupid Simple
3. Use `docker compose up` to start Cupid instead of Cupid Simple

---

## Current State

### Cupid Simple (Working Deployment on `deploy` branch)
- **Backend port**: 8003
- **Frontend port**: 80 (nginx)
- **Domain**: cupid-simple.humorist.ai
- **EC2 Location**: `~/chatkit-dev-00/apps/cupid-simple`
- **Files**: Dockerfile, docker-compose.yml, Caddyfile, nginx.conf, GitHub Actions workflow

### Cupid (No Docker Config Yet)
- **Backend port**: 8010 (dev)
- **Frontend port**: 5180 (dev)
- **Extra dependency**: `openai-agents>=0.0.16`
- **More complex**: 15 agents vs 2, 729 lines server.py vs 203

---

## Files to Create

### 1. Backend Dockerfile
**Path**: `apps/cupid/backend/Dockerfile`

```dockerfile
FROM python:3.13-slim AS base
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv
WORKDIR /app
COPY pyproject.toml uv.lock* ./
ENV UV_PROJECT_ENVIRONMENT=/app/.venv
RUN uv sync --frozen --no-dev || uv sync --no-dev
COPY . .
EXPOSE 8003
ENV PORT=8003
CMD [".venv/bin/python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8003"]
```

### 2. Frontend Dockerfile
**Path**: `apps/cupid/frontend/Dockerfile`

```dockerfile
# Stage 1: Build
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG VITE_CHATKIT_API_DOMAIN_KEY
ENV VITE_CHATKIT_API_DOMAIN_KEY=$VITE_CHATKIT_API_DOMAIN_KEY
RUN npm run build

# Stage 2: Production
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### 3. Frontend nginx.conf
**Path**: `apps/cupid/frontend/nginx.conf`

```nginx
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    gzip_vary on;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /chatkit {
        proxy_pass http://backend:8003;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_buffering off;
        proxy_cache off;
        chunked_transfer_encoding on;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### 4. Docker Compose (Production)
**Path**: `apps/cupid/docker-compose.yml`

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

### 5. Caddyfile
**Path**: `apps/cupid/Caddyfile`

```
# Production with domain (automatic HTTPS)
cupid.humorist.ai {
    reverse_proxy frontend:80
}

# Fallback for HTTP access via IP
:80 {
    reverse_proxy frontend:80
}
```

### 6. Environment Example
**Path**: `apps/cupid/.env.example`

```
OPENAI_API_KEY=sk-your-key-here
VITE_CHATKIT_API_DOMAIN_KEY=domain_pk_your_key
FRONTEND_URLS=https://cupid.humorist.ai,http://your-ec2-ip
```

### 7. Backend .dockerignore
**Path**: `apps/cupid/backend/.dockerignore`

```
# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
build/
develop-eggs/
dist/
downloads/
eggs/
.eggs/
lib/
lib64/
parts/
sdist/
var/
wheels/
*.egg-info/
.installed.cfg
*.egg

# Virtual environments
.venv/
venv/
ENV/

# Testing
.pytest_cache/
.coverage
htmlcov/
.tox/
.nox/

# Type checking
.mypy_cache/
.ruff_cache/

# IDE
.vscode/
.idea/

# Environment files
.env
.env.*

# Git
.git/
.gitignore

# Docs
*.md
```

### 8. Frontend .dockerignore
**Path**: `apps/cupid/frontend/.dockerignore`

```
# Dependencies
node_modules/

# Build output
dist/
.vite/

# Environment
.env
.env.*

# IDE
.vscode/
.idea/

# Git
.git/
.gitignore

# Testing
coverage/

# Docs
*.md
```

### 9. Documentation (copy from cupid-simple)
**Path**: `apps/cupid/docs/`

Copy and adapt these docs from `apps/cupid-simple/docs/`:
- `AWS-SETUP.md` - EC2 instance setup
- `DEPLOY-DOCKER-AWS.md` - Main deployment guide
- `DEPLOY-VERCEL-RAILWAY.md` - Alternative deployment options
- `DOMAIN-SETUP.md` - Domain and SSL configuration

Update references from "cupid-simple" to "cupid" and port 8003.

---

## Backend Health Endpoint

Add `/health` endpoint to `apps/cupid/backend/app/main.py`:

```python
@app.get("/health")
def health_check():
    return {"status": "healthy"}
```

---

## Deployment Steps

### Local Testing
```bash
cd apps/cupid
cp .env.example .env
# Edit .env with your API keys
docker compose build
docker compose up
# Access at http://localhost (ports 80/443)
```

### AWS Deployment
1. SSH into EC2 server
2. Stop Cupid Simple: `cd ~/chatkit-dev-00/apps/cupid-simple && docker compose down`
3. Navigate to Cupid: `cd ~/chatkit-dev-00/apps/cupid`
4. Create `.env` with secrets
5. Start: `docker compose build && docker compose up -d`

---

## Port Summary

| Component | Cupid Simple | Cupid |
|-----------|-------------|-------|
| Backend internal | 8003 | 8003 |
| Frontend internal | 80 | 80 |
| Caddy external | 80/443 | 80/443 |

**Note**: Using same port (8003) as cupid-simple for consistency since only one runs at a time.

---

## Critical Files to Modify/Create

| # | File | Action |
|---|------|--------|
| 1 | `apps/cupid/backend/Dockerfile` | create |
| 2 | `apps/cupid/backend/.dockerignore` | create |
| 3 | `apps/cupid/backend/app/main.py` | modify (add /health) |
| 4 | `apps/cupid/frontend/Dockerfile` | create |
| 5 | `apps/cupid/frontend/.dockerignore` | create |
| 6 | `apps/cupid/frontend/nginx.conf` | create |
| 7 | `apps/cupid/docker-compose.yml` | create |
| 8 | `apps/cupid/Caddyfile` | create |
| 9 | `apps/cupid/.env.example` | create |
| 10 | `apps/cupid/docs/*` | copy & adapt from cupid-simple |

---

## Decisions (Confirmed)

1. **Domain**: `cupid.humorist.ai`
2. **Port**: 8003 (same as cupid-simple for consistency)
3. **Port Strategy**: Stop Cupid Simple before starting Cupid (only one runs at a time)
4. **CI/CD**: Manual git pull & deploy (no GitHub Actions)
