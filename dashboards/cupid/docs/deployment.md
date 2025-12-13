# Deployment Guide

This guide covers deploying and operating the Cupid Dashboard using Docker Compose.

## Prerequisites

- Docker 20.10+
- Docker Compose 2.0+
- Langfuse account with API credentials

## Quick Start

```bash
# Navigate to dashboard directory
cd dashboards/cupid

# Copy environment file and configure
cp .env.example .env
# Edit .env with your Langfuse credentials

# Start all services
docker compose up -d --build

# Open dashboard
open http://localhost:3000
```

---

## Configuration

### Environment Variables

Create a `.env` file in the `dashboards/cupid` directory:

```bash
# Required: Langfuse API credentials
LANGFUSE_PUBLIC_KEY=pk-lf-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
LANGFUSE_SECRET_KEY=sk-lf-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

# Optional: Langfuse region (default: US)
LANGFUSE_BASE_URL=https://us.cloud.langfuse.com

# Optional: Sync interval in seconds (default: 300 = 5 minutes)
SYNC_INTERVAL_SECONDS=300
```

### Getting Langfuse Credentials

1. Go to [Langfuse Console](https://us.cloud.langfuse.com)
2. Navigate to Settings → API Keys
3. Create a new key pair
4. Copy public and secret keys to `.env`

### Regional URLs

| Region | URL |
|--------|-----|
| US | `https://us.cloud.langfuse.com` |
| EU | `https://cloud.langfuse.com` |
| Self-hosted | Your deployment URL |

---

## Docker Compose Services

### Service Overview

```yaml
services:
  backend:    # FastAPI application
  frontend:   # React + Nginx
  caddy:      # Reverse proxy
```

### Backend Service

```yaml
backend:
  build:
    context: ./backend
    dockerfile: Dockerfile
  container_name: cupid-dashboard-backend
  environment:
    - LANGFUSE_PUBLIC_KEY=${LANGFUSE_PUBLIC_KEY}
    - LANGFUSE_SECRET_KEY=${LANGFUSE_SECRET_KEY}
    - LANGFUSE_BASE_URL=${LANGFUSE_BASE_URL:-https://us.cloud.langfuse.com}
    - DATABASE_PATH=/app/data/cupid.db
    - SYNC_INTERVAL_SECONDS=${SYNC_INTERVAL_SECONDS:-300}
  volumes:
    - ./data:/app/data
  expose:
    - "8080"
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
    interval: 30s
    timeout: 10s
    retries: 3
    start_period: 40s
```

### Frontend Service

```yaml
frontend:
  build:
    context: ./frontend
    dockerfile: Dockerfile
  container_name: cupid-dashboard-frontend
  expose:
    - "80"
  depends_on:
    backend:
      condition: service_healthy
```

### Caddy Service

```yaml
caddy:
  image: caddy:2-alpine
  container_name: cupid-dashboard-caddy
  ports:
    - "3000:80"
  volumes:
    - ./Caddyfile:/etc/caddy/Caddyfile
    - caddy_data:/data
    - caddy_config:/config
  depends_on:
    - frontend
```

---

## Commands

### Start Dashboard

```bash
# Build and start all services
docker compose up -d --build

# Start without rebuilding
docker compose up -d
```

### Stop Dashboard

```bash
# Stop all services
docker compose down

# Stop and remove volumes (deletes data)
docker compose down -v
```

### View Logs

```bash
# All services
docker compose logs -f

# Backend only
docker compose logs -f backend

# Last 100 lines
docker compose logs --tail 100 backend
```

### Rebuild Services

```bash
# Rebuild all
docker compose build

# Rebuild specific service
docker compose build backend

# Force rebuild without cache
docker compose build --no-cache
```

### Check Status

```bash
# Service status
docker compose ps

# Health check
curl http://localhost:3000/health
```

---

## Data Persistence

### SQLite Database

Data is persisted via volume mount:

```yaml
volumes:
  - ./data:/app/data
```

**Location:** `./data/cupid.db`

### Backup

```bash
# Copy database file
cp ./data/cupid.db ./data/cupid.db.backup

# Or use sqlite3
sqlite3 ./data/cupid.db ".backup ./data/cupid.db.backup"
```

### Reset Data

```bash
# Remove database file
rm ./data/cupid.db

# Restart backend to recreate
docker compose restart backend
```

---

## Manual Sync

### Via API

```bash
# Trigger sync
curl -X POST http://localhost:3000/api/sync/trigger

# Check status
curl http://localhost:3000/api/sync/status
```

### Via Dashboard

Click the refresh icon in the sidebar sync status area.

---

## Local Development

### Without Docker

**Backend:**

```bash
cd backend

# Install dependencies
pip install uv
uv sync

# Set environment
export LANGFUSE_PUBLIC_KEY=pk-lf-...
export LANGFUSE_SECRET_KEY=sk-lf-...

# Run server
uv run uvicorn app.main:app --reload --port 8080
```

**Frontend:**

```bash
cd frontend

# Install dependencies
npm install

# Run dev server
npm run dev
# → http://localhost:5173
```

Frontend Vite dev server proxies `/api` to `localhost:8080`.

### Mixed Mode

Run backend in Docker, frontend locally:

```bash
# Start only backend
docker compose up -d backend

# Run frontend locally
cd frontend
npm run dev
```

---

## Troubleshooting

### Dashboard Not Loading

1. Check if containers are running:
   ```bash
   docker compose ps
   ```

2. Check Caddy logs:
   ```bash
   docker compose logs caddy
   ```

3. Verify health check:
   ```bash
   curl http://localhost:3000/health
   ```

### No Data Appearing

1. Check sync status:
   ```bash
   curl http://localhost:3000/api/sync/status
   ```

2. Verify Langfuse credentials in `.env`

3. Check backend logs:
   ```bash
   docker compose logs backend | grep -i error
   ```

4. Manually trigger sync:
   ```bash
   curl -X POST http://localhost:3000/api/sync/trigger
   ```

### Rate Limited

If sync status shows `rate_limited`:

1. Wait for automatic retry (next sync cycle)
2. Increase sync interval:
   ```bash
   # In .env
   SYNC_INTERVAL_SECONDS=600  # 10 minutes
   ```
3. Restart backend:
   ```bash
   docker compose restart backend
   ```

### Connection Refused

1. Check if backend is healthy:
   ```bash
   docker compose ps backend
   ```

2. Check backend logs:
   ```bash
   docker compose logs backend
   ```

3. Verify port mapping:
   ```bash
   docker compose port caddy 80
   ```

### Database Locked

If you see "database is locked" errors:

1. Stop all containers:
   ```bash
   docker compose down
   ```

2. Remove database:
   ```bash
   rm ./data/cupid.db
   ```

3. Restart:
   ```bash
   docker compose up -d --build
   ```

### Build Failures

1. Clear Docker cache:
   ```bash
   docker compose build --no-cache
   ```

2. Remove old images:
   ```bash
   docker compose down --rmi local
   ```

3. Rebuild:
   ```bash
   docker compose up -d --build
   ```

---

## Production Considerations

### Security

1. **API Authentication**: Add authentication to `/api/sync/trigger`
2. **HTTPS**: Configure Caddy with TLS certificates
3. **Secrets**: Use Docker secrets instead of `.env` file
4. **Network**: Restrict access to trusted IPs

### Performance

1. **Sync Interval**: Adjust based on data volume
2. **Database**: Consider PostgreSQL for larger deployments
3. **Caching**: Add Redis for hot queries

### Monitoring

1. **Health Checks**: Use existing `/health` endpoint
2. **Logging**: Aggregate logs to central system
3. **Metrics**: Add Prometheus metrics endpoint

### High Availability

1. **Database**: Use external PostgreSQL
2. **Load Balancing**: Multiple backend instances
3. **State**: Move sync state to shared storage

---

## File Reference

### Project Files

```
dashboards/cupid/
├── .env.example          # Environment template
├── .env                  # Your configuration (gitignored)
├── docker-compose.yml    # Service definitions
├── Caddyfile             # Reverse proxy config
├── data/                 # Persistent data (gitignored)
│   └── cupid.db          # SQLite database
├── backend/
│   ├── Dockerfile
│   ├── pyproject.toml
│   └── app/              # Python application
└── frontend/
    ├── Dockerfile
    ├── nginx.conf
    ├── package.json
    └── src/              # React application
```

### Docker Compose Reference

```bash
# Full command reference
docker compose --help

# Service-specific
docker compose exec backend bash
docker compose exec backend python -c "print('hello')"
docker compose exec caddy sh
```
