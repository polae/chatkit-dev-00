# Cupid Scaling Plan: From Alpha to Production

> **Current State**: EC2 t3.small | Single container deployment | ~20 alpha testers
> **Target State**: Horizontally scalable architecture supporting thousands of concurrent users

---

## Executive Summary

This document outlines a phased approach to scale Cupid from its current alpha deployment on a t3.small EC2 instance to a production-ready architecture capable of handling thousands of users. The plan addresses:

1. **Current capacity analysis** and alpha test limits
2. **Critical architectural changes** required for horizontal scaling
3. **Database persistence** strategy for threads and sessions
4. **Infrastructure evolution** from single instance to auto-scaling
5. **Observability and monitoring** with Langfuse

---

## 1. Current Architecture Analysis

### 1.1 Infrastructure Specs (t3.small)

| Resource | Value | Implications |
|----------|-------|--------------|
| **vCPUs** | 2 | Maximum 2 Uvicorn workers effectively |
| **Memory** | 2 GiB | ~500MB per Python process, limits concurrent connections |
| **Network** | Up to 5 Gbps | Sufficient for current scale |
| **CPU Credits** | Burstable (Unlimited mode) | Can handle spikes, but $0.05/vCPU-hour overage |

*Source: [AWS EC2 t3.small specs](https://instances.vantage.sh/aws/ec2/t3.small)*

### 1.2 Current Software Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Caddy (HTTPS/Proxy)                      │
│                    cupid.humorist.ai:443                        │
└─────────────────────────────────────────────────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
   /api/* /chatkit          /*                     /health
        │                       │                       │
        ▼                       ▼                       ▼
┌───────────────┐      ┌───────────────┐       ┌───────────────┐
│   Backend     │      │   Frontend    │       │    Backend    │
│   (FastAPI)   │      │   (nginx)     │       │  Health Check │
│   Port 8003   │      │   Port 80     │       │               │
└───────────────┘      └───────────────┘       └───────────────┘
        │
        ▼
┌───────────────────────────────────────┐
│         In-Memory Storage             │
│  • MemoryStore (threads/messages)     │
│  • MatchSessionStore (temp sessions)  │
│  • TodayDataStore (cached YAML)       │
└───────────────────────────────────────┘
```

### 1.3 Critical Limitations for Scaling

| Component | Issue | Risk Level |
|-----------|-------|------------|
| **MemoryStore** | No thread safety (no asyncio.Lock) | 🔴 Critical |
| **MemoryStore** | In-memory only, data loss on restart | 🔴 Critical |
| **Uvicorn** | Single worker, no --workers flag | 🟡 High |
| **State** | Can't share state across instances | 🔴 Critical |
| **Sessions** | MatchSessionStore is ephemeral | 🟡 High |

---

## 2. Alpha Test Capacity Analysis

### 2.1 Concurrency Model

Cupid's workload is **I/O-bound** (waiting for OpenAI API responses), not CPU-bound. This means:

- A single Uvicorn worker can handle **many concurrent connections** via async/await
- The bottleneck is **memory** (storing threads) and **OpenAI API rate limits**
- Each active chat session holds ~50KB-200KB in memory (thread history + context)

### 2.2 Estimated Capacity (Current Setup)

| Metric | Conservative | Optimistic |
|--------|--------------|------------|
| **Concurrent active users** | 15-20 | 30-40 |
| **Total threads in memory** | 100-200 | 300-500 |
| **Requests/second sustained** | 5-10 | 15-20 |
| **Memory headroom** | ~1GB usable | ~1.5GB usable |

**Calculation basis:**
- 2GB total - 500MB system/Python overhead = ~1.5GB usable
- Each thread: ~100KB average (messages, context, metadata)
- 1.5GB / 100KB = ~15,000 threads theoretically
- But active connections with streaming: ~50 concurrent safely

### 2.3 Alpha Test Recommendation

> **Safe upper bound for alpha: 30-40 invited testers**
>
> Assuming:
> - Not all users active simultaneously
> - Peak concurrency of 10-15 users at once
> - Daily restart acceptable (data loss)
> - Langfuse captures all traces for analysis

**Risk factors:**
- Race conditions under concurrent writes (no locks in MemoryStore)
- Memory exhaustion if threads accumulate without cleanup
- OpenAI API rate limits (Tier dependent)

---

## 3. Phase 1: Immediate Improvements (Alpha Hardening)

### 3.1 Add Thread Safety to MemoryStore

**Estimated effort:** 1-2 hours

```python
# apps/cupid/backend/app/memory_store.py

import asyncio

class MemoryStore(Store[RequestContext]):
    def __init__(self) -> None:
        self._threads: Dict[str, _ThreadState] = {}
        self._lock = asyncio.Lock()  # ADD THIS

    async def load_thread(self, thread_id: str, ...) -> Thread:
        async with self._lock:  # WRAP ALL OPERATIONS
            state = self._threads.get(thread_id)
            ...
```

### 3.2 Add Uvicorn Workers

**Estimated effort:** 30 minutes

```dockerfile
# apps/cupid/backend/Dockerfile

# Current:
CMD [".venv/bin/python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8003"]

# Updated (2 workers for 2 vCPUs):
CMD [".venv/bin/python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8003", "--workers", "2"]
```

**Note:** With multiple workers, each has its own MemoryStore. This is fine for alpha (threads stay with one worker via Caddy connection reuse) but breaks horizontal scaling.

### 3.3 Add Memory Monitoring

```python
# apps/cupid/backend/app/main.py

import psutil

@app.get("/health")
def health_check():
    memory = psutil.Process().memory_info()
    return {
        "status": "healthy",
        "memory_mb": memory.rss / 1024 / 1024,
        "threads_count": len(get_chatkit_server().store._threads)
    }
```

### 3.4 Implement Thread Cleanup

```python
# Clean up old threads (>24 hours) on startup and periodically
from datetime import datetime, timedelta

async def cleanup_old_threads(store: MemoryStore, max_age_hours: int = 24):
    async with store._lock:
        cutoff = datetime.now() - timedelta(hours=max_age_hours)
        old_threads = [
            tid for tid, state in store._threads.items()
            if state.thread.created_at < cutoff
        ]
        for tid in old_threads:
            del store._threads[tid]
        return len(old_threads)
```

---

## 4. Phase 2: Database Persistence (Pre-Scale Foundation)

### 4.1 Architecture with PostgreSQL

```
┌─────────────────────────────────────────────────────────────────┐
│                        Caddy (HTTPS/Proxy)                      │
└─────────────────────────────────────────────────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
┌───────────────┐      ┌───────────────┐       ┌───────────────┐
│   Backend     │      │   Frontend    │       │    Redis      │
│   (FastAPI)   │      │   (nginx)     │       │   (Sessions)  │
│   Port 8003   │      │   Port 80     │       │   Port 6379   │
└───────────────┘      └───────────────┘       └───────────────┘
        │                                              │
        ▼                                              │
┌───────────────────────────────────────┐              │
│         PostgreSQL                    │◄─────────────┘
│  • threads table                      │
│  • thread_items table                 │
│  • match_sessions table               │
└───────────────────────────────────────┘
```

### 4.2 Database Schema

```sql
-- threads table
CREATE TABLE threads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_threads_created_at ON threads(created_at);
CREATE INDEX idx_threads_metadata ON threads USING GIN(metadata);

-- thread_items table (messages, widgets, etc.)
CREATE TABLE thread_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id UUID NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
    item_type VARCHAR(50) NOT NULL, -- 'message', 'widget', 'hidden_context'
    role VARCHAR(20), -- 'user', 'assistant', 'system'
    content JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sequence_num SERIAL
);

CREATE INDEX idx_thread_items_thread_id ON thread_items(thread_id);
CREATE INDEX idx_thread_items_sequence ON thread_items(thread_id, sequence_num DESC);

-- match_sessions table (replaces MatchSessionStore)
CREATE TABLE match_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mortal_id VARCHAR(100) NOT NULL,
    match_id VARCHAR(100) NOT NULL,
    compatibility_key VARCHAR(200) NOT NULL,
    consumed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '1 hour'
);

CREATE INDEX idx_match_sessions_expires ON match_sessions(expires_at) WHERE NOT consumed;
```

### 4.3 PostgresStore Implementation

```python
# apps/cupid/backend/app/postgres_store.py

from asyncpg import Pool, create_pool
from openai_chatkit import Store, Thread, Page, ThreadItem

class PostgresStore(Store[RequestContext]):
    def __init__(self, pool: Pool):
        self._pool = pool

    @classmethod
    async def create(cls, database_url: str) -> "PostgresStore":
        pool = await create_pool(
            database_url,
            min_size=5,
            max_size=20,
            command_timeout=30
        )
        return cls(pool)

    async def load_thread(self, thread_id: str, context: RequestContext) -> Thread:
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT id, metadata, created_at FROM threads WHERE id = $1",
                thread_id
            )
            if not row:
                raise ThreadNotFoundError(thread_id)
            return Thread(
                id=str(row['id']),
                metadata=row['metadata'],
                created_at=row['created_at']
            )

    async def save_thread(self, thread: Thread, context: RequestContext) -> Thread:
        async with self._pool.acquire() as conn:
            await conn.execute("""
                INSERT INTO threads (id, metadata, created_at, updated_at)
                VALUES ($1, $2, $3, NOW())
                ON CONFLICT (id) DO UPDATE SET
                    metadata = EXCLUDED.metadata,
                    updated_at = NOW()
            """, thread.id, thread.metadata, thread.created_at)
        return thread

    async def load_thread_items(
        self,
        thread_id: str,
        after: str | None,
        limit: int,
        order: str,
        context: RequestContext
    ) -> Page[ThreadItem]:
        async with self._pool.acquire() as conn:
            query = """
                SELECT id, item_type, role, content, created_at, sequence_num
                FROM thread_items
                WHERE thread_id = $1
                ORDER BY sequence_num DESC
                LIMIT $2
            """
            rows = await conn.fetch(query, thread_id, limit)
            items = [self._row_to_item(row) for row in reversed(rows)]
            return Page(items=items, has_more=len(rows) == limit)

    async def add_thread_item(
        self,
        thread_id: str,
        item: ThreadItem,
        context: RequestContext
    ) -> ThreadItem:
        async with self._pool.acquire() as conn:
            await conn.execute("""
                INSERT INTO thread_items (id, thread_id, item_type, role, content)
                VALUES ($1, $2, $3, $4, $5)
            """, item.id, thread_id, item.type, getattr(item, 'role', None),
                item.model_dump_json())
        return item
```

### 4.4 Docker Compose Update

```yaml
# apps/cupid/docker-compose.yml (Phase 2)

services:
  backend:
    # ... existing config ...
    environment:
      - DATABASE_URL=postgresql://cupid:${POSTGRES_PASSWORD}@db:5432/cupid
      - REDIS_URL=redis://redis:6379/0
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy

  db:
    image: postgres:16-alpine
    container_name: cupid-db
    restart: unless-stopped
    environment:
      POSTGRES_USER: cupid
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: cupid
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U cupid"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: cupid-redis
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

---

## 5. Phase 3: Horizontal Scaling

### 5.1 Architecture with Load Balancing

```
                         ┌─────────────────┐
                         │   Route 53 /    │
                         │   CloudFront    │
                         └────────┬────────┘
                                  │
                         ┌────────▼────────┐
                         │  Application    │
                         │  Load Balancer  │
                         │    (ALB)        │
                         └────────┬────────┘
                                  │
        ┌─────────────────────────┼─────────────────────────┐
        │                         │                         │
        ▼                         ▼                         ▼
┌───────────────┐        ┌───────────────┐        ┌───────────────┐
│   Backend 1   │        │   Backend 2   │        │   Backend N   │
│   (ECS Task)  │        │   (ECS Task)  │        │   (ECS Task)  │
└───────────────┘        └───────────────┘        └───────────────┘
        │                         │                         │
        └─────────────────────────┼─────────────────────────┘
                                  │
        ┌─────────────────────────┼─────────────────────────┐
        │                         │                         │
        ▼                         ▼                         ▼
┌───────────────┐        ┌───────────────┐        ┌───────────────┐
│   PostgreSQL  │        │    Redis      │        │     S3        │
│   (RDS)       │        │ (ElastiCache) │        │   (Assets)    │
└───────────────┘        └───────────────┘        └───────────────┘
```

### 5.2 ECS Task Definition

```json
{
  "family": "cupid-backend",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "containerDefinitions": [
    {
      "name": "backend",
      "image": "${ECR_REPO}/cupid-backend:latest",
      "portMappings": [
        {
          "containerPort": 8003,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {"name": "DATABASE_URL", "valueFrom": "arn:aws:ssm:..."},
        {"name": "REDIS_URL", "valueFrom": "arn:aws:ssm:..."},
        {"name": "OPENAI_API_KEY", "valueFrom": "arn:aws:secretsmanager:..."}
      ],
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -f http://localhost:8003/health || exit 1"],
        "interval": 30,
        "timeout": 10,
        "retries": 3
      },
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/cupid-backend",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

### 5.3 Auto Scaling Configuration

```yaml
# CloudFormation snippet
CupidAutoScalingTarget:
  Type: AWS::ApplicationAutoScaling::ScalableTarget
  Properties:
    MaxCapacity: 10
    MinCapacity: 2
    ResourceId: !Sub service/${ECSCluster}/${ServiceName}
    RoleARN: !GetAtt AutoScalingRole.Arn
    ScalableDimension: ecs:service:DesiredCount
    ServiceNamespace: ecs

CupidScalingPolicy:
  Type: AWS::ApplicationAutoScaling::ScalingPolicy
  Properties:
    PolicyName: CupidCPUScaling
    PolicyType: TargetTrackingScaling
    ScalingTargetId: !Ref CupidAutoScalingTarget
    TargetTrackingScalingPolicyConfiguration:
      PredefinedMetricSpecification:
        PredefinedMetricType: ECSServiceAverageCPUUtilization
      TargetValue: 70.0
      ScaleInCooldown: 300
      ScaleOutCooldown: 60
```

### 5.4 Session Affinity (Sticky Sessions)

For SSE streaming connections, configure ALB sticky sessions:

```yaml
# ALB Target Group
TargetGroup:
  Type: AWS::ElasticLoadBalancingV2::TargetGroup
  Properties:
    TargetGroupAttributes:
      - Key: stickiness.enabled
        Value: "true"
      - Key: stickiness.type
        Value: app_cookie
      - Key: stickiness.app_cookie.cookie_name
        Value: CUPID_SESSION
      - Key: stickiness.app_cookie.duration_seconds
        Value: "3600"
```

---

## 6. Observability & Monitoring

### 6.1 Current Langfuse Integration

Cupid already has Langfuse tracing. The current implementation captures:

| Attribute | Source | Purpose |
|-----------|--------|---------|
| `session_id` | thread.id | Group traces by conversation |
| `user_id` | match_session_id | Track unique play sessions |
| `tags` | chapter number | Filter by game progress |
| `metadata` | mortal/match names | Debug specific scenarios |

### 6.2 Enhanced Monitoring Stack

```
┌─────────────────────────────────────────────────────────────────┐
│                      Langfuse Cloud                             │
│   • LLM traces & costs                                         │
│   • Prompt versioning                                          │
│   • Evaluation scores                                          │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    CloudWatch / Grafana                         │
│   • Request latency (p50, p95, p99)                           │
│   • Error rates                                                │
│   • Active connections                                         │
│   • Database connection pool                                   │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Application Metrics                          │
│   • /health endpoint with detailed stats                       │
│   • Prometheus metrics export                                  │
│   • Custom business metrics                                    │
└─────────────────────────────────────────────────────────────────┘
```

### 6.3 Key Metrics to Track

```python
# apps/cupid/backend/app/metrics.py

from prometheus_client import Counter, Histogram, Gauge

# Request metrics
REQUESTS_TOTAL = Counter(
    'cupid_requests_total',
    'Total requests',
    ['endpoint', 'status']
)

REQUEST_LATENCY = Histogram(
    'cupid_request_latency_seconds',
    'Request latency',
    ['endpoint'],
    buckets=[0.1, 0.5, 1.0, 2.0, 5.0, 10.0, 30.0]
)

# Game metrics
ACTIVE_GAMES = Gauge(
    'cupid_active_games',
    'Currently active game sessions'
)

CHAPTER_COMPLETIONS = Counter(
    'cupid_chapter_completions_total',
    'Chapter completions',
    ['chapter']
)

# OpenAI metrics (from Langfuse)
OPENAI_TOKENS = Counter(
    'cupid_openai_tokens_total',
    'OpenAI tokens used',
    ['model', 'type']  # type: prompt/completion
)

OPENAI_COST = Counter(
    'cupid_openai_cost_dollars',
    'OpenAI API cost',
    ['model']
)
```

### 6.4 Alerts Configuration

```yaml
# CloudWatch Alarms
Alarms:
  - Name: CupidHighErrorRate
    Metric: 5XXErrors
    Threshold: 5%
    Period: 5 minutes
    Action: SNS notification

  - Name: CupidHighLatency
    Metric: TargetResponseTime
    Threshold: 10 seconds (p95)
    Period: 5 minutes
    Action: SNS notification

  - Name: CupidDatabaseConnections
    Metric: DatabaseConnections
    Threshold: 80% of max
    Action: SNS notification

  - Name: CupidMemoryUsage
    Metric: MemoryUtilization
    Threshold: 85%
    Action: Auto-scale + notification
```

---

## 7. Cost Estimation

### 7.1 Current State (Alpha)

| Resource | Monthly Cost |
|----------|--------------|
| EC2 t3.small | ~$15-20 |
| Data transfer | ~$5 |
| **Total** | **~$25/month** |

### 7.2 Phase 2 (Database Added)

| Resource | Monthly Cost |
|----------|--------------|
| EC2 t3.small | ~$20 |
| RDS db.t3.micro | ~$15 |
| ElastiCache cache.t3.micro | ~$12 |
| Data transfer | ~$10 |
| **Total** | **~$60/month** |

### 7.3 Phase 3 (Scaled for 1000s of users)

| Resource | Monthly Cost |
|----------|--------------|
| ECS Fargate (2-10 tasks) | ~$50-250 |
| ALB | ~$20 |
| RDS db.t3.medium | ~$50 |
| ElastiCache cache.t3.small | ~$25 |
| CloudFront | ~$20 |
| Data transfer | ~$50 |
| **Total** | **~$200-400/month** |

### 7.4 OpenAI API Costs (Variable)

| Usage Level | Estimated Monthly |
|-------------|-------------------|
| 100 games/day | ~$50-100 |
| 1,000 games/day | ~$500-1,000 |
| 10,000 games/day | ~$5,000-10,000 |

*Assumes ~$0.50-1.00 per complete game session with GPT-4.1*

---

## 8. Implementation Roadmap

### Phase 1: Alpha Hardening (Week 1)

- [ ] Add asyncio.Lock to MemoryStore
- [ ] Add 2 Uvicorn workers
- [ ] Implement thread cleanup job
- [ ] Add memory monitoring to /health
- [ ] Test with 30-40 users

### Phase 2: Database Persistence (Weeks 2-3)

- [ ] Design and create PostgreSQL schema
- [ ] Implement PostgresStore class
- [ ] Add Redis for session management
- [ ] Update docker-compose.yml
- [ ] Migrate from in-memory to database
- [ ] Set up database backups

### Phase 3: Horizontal Scaling (Weeks 4-6)

- [ ] Create ECS task definitions
- [ ] Set up ALB with sticky sessions
- [ ] Configure auto-scaling policies
- [ ] Set up CloudWatch alarms
- [ ] Create deployment pipeline (CI/CD)
- [ ] Load test at target scale

### Phase 4: Production Polish (Weeks 7-8)

- [ ] Implement rate limiting
- [ ] Add comprehensive logging
- [ ] Set up Grafana dashboards
- [ ] Create runbooks for operations
- [ ] Security audit
- [ ] Documentation

---

## 9. Appendix

### A. Quick Reference: Instance Sizing

| Users | Recommended Instance | Workers | Database |
|-------|---------------------|---------|----------|
| 20-50 | t3.small (current) | 2 | In-memory OK |
| 50-200 | t3.medium | 2 | PostgreSQL required |
| 200-1000 | ECS (2-4 tasks) | 2 each | RDS + ElastiCache |
| 1000-5000 | ECS (4-10 tasks) | 4 each | RDS Multi-AZ |
| 5000+ | ECS + Auto-scale | Custom | RDS + Read Replicas |

### B. Related Documentation

- [FastAPI Production Deployment](https://render.com/articles/fastapi-production-deployment-best-practices)
- [Uvicorn Workers Guide](https://fastapi.tiangolo.com/deployment/server-workers/)
- [Langfuse Scaling Guide](https://langfuse.com/self-hosting/configuration/scaling)
- [AWS ECS Best Practices](https://docs.aws.amazon.com/AmazonECS/latest/bestpracticesguide/)

### C. ChatKit Specific Notes

From analysis of the openai-chatkit-advanced-samples repository:

1. **MemoryStore is demo-only** - explicitly documented as requiring database for production
2. **No horizontal scaling examples** exist in the reference implementations
3. **Thread safety not implemented** - must be added for concurrent access
4. **Connection pooling pattern** from asyncpg is recommended for PostgreSQL

---

## 10. Summary & Recommendations

### For Alpha (Now)

1. **You can safely invite 30-40 testers** with current setup
2. Add thread safety locks as a precaution
3. Monitor memory via enhanced /health endpoint
4. Use Langfuse to capture all traces for analysis
5. Accept that data is ephemeral (restarts clear threads)

### For Beta (100-500 users)

1. Implement PostgreSQL persistence (Phase 2)
2. Add Redis for session management
3. Upgrade to t3.medium instance
4. Set up automated backups

### For Production (1000+ users)

1. Move to ECS Fargate with auto-scaling
2. Use RDS Multi-AZ for reliability
3. Implement full observability stack
4. Create incident response procedures

---

*Document Version: 1.0*
*Created: December 2024*
*Author: Claude Code*
