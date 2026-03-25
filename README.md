# MYLLM Proxy

Internal LLM Proxy Service — centrally bundles, authenticates, routes, and logs all AI requests from internal tools.

OpenAI-compatible API with support for Anthropic, OpenAI, and local Ollama models.

## Architecture

```
Internal Tools  →  MYLLM Proxy  →  Anthropic / OpenAI / Ollama
                      ↕
               PostgreSQL + Redis
                      ↕
               Admin Dashboard
```

### Model Aliases

| Alias | Real Model | Provider |
|-------|-----------|----------|
| `ra-smart` | claude-sonnet-4-5 | Anthropic |
| `ra-fast` | claude-haiku-4-5 | Anthropic |
| `ra-pro` | claude-opus-4-5 | Anthropic |
| `ra-gpt` | gpt-4o | OpenAI |
| `ra-local` | llama3.2:8b | Ollama |
| `ra-local-fast` | llama3.2:3b | Ollama |

## Quick Start

```bash
# 1. Clone and configure
git clone <repo-url> && cd my-llm-proxy
cp .env.example .env
# Edit .env — set API keys and JWT secret

# 2. Build and start
docker compose up -d

# 3. Run database migrations
docker compose exec proxy alembic upgrade head

# 4. Create default team and API key
docker compose exec proxy python scripts/seed.py

# 5. Verify
curl http://localhost/health
```

## Usage

### Chat Completions (OpenAI-compatible)

```bash
curl http://localhost/v1/chat/completions \
  -H "Authorization: Bearer sk-ra-YOUR-KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "ra-smart",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

### Streaming

```bash
curl http://localhost/v1/chat/completions \
  -H "Authorization: Bearer sk-ra-YOUR-KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "ra-fast",
    "messages": [{"role": "user", "content": "Tell me a story"}],
    "stream": true
  }'
```

### List Models

```bash
curl http://localhost/v1/models \
  -H "Authorization: Bearer sk-ra-YOUR-KEY"
```

## Admin Dashboard

Access the admin dashboard at `http://localhost/` (port 80).

**Default login:** admin / admin (change in .env)

### Pages

- **Dashboard** — Real-time metrics, provider status, recent requests
- **Teams** — Manage teams, generate/revoke API keys
- **Models** — Configure model routing and fallbacks
- **Logs** — Searchable request log with filters
- **Budgets** — Monthly budget tracking per team
- **Settings** — System configuration overview

## Tech Stack

| Component | Technology |
|-----------|-----------|
| API | FastAPI (Python 3.12) |
| Provider Abstraction | LiteLLM |
| Database | PostgreSQL 16 |
| Cache/Budget | Redis 7 |
| Admin Frontend | React 18 + TypeScript + shadcn/ui |
| Reverse Proxy | Nginx |
| Deployment | Docker Compose |

## Project Structure

```
├── app/
│   ├── main.py              # FastAPI app
│   ├── config.py             # Pydantic settings
│   ├── database.py           # Async SQLAlchemy
│   ├── routers/
│   │   ├── chat.py           # /v1/chat/completions
│   │   ├── models.py         # /v1/models
│   │   └── admin.py          # /admin/* CRUD endpoints
│   ├── middleware/
│   │   ├── auth.py           # API key + JWT auth
│   │   └── budget.py         # Redis budget tracking
│   ├── services/
│   │   ├── router_service.py # Model alias resolution
│   │   └── proxy_service.py  # LiteLLM proxy calls
│   └── models/
│       ├── db_models.py      # SQLAlchemy ORM
│       └── schemas.py        # Pydantic schemas
├── dashboard/                # React admin dashboard
├── alembic/                  # Database migrations
├── config/
│   └── model_routing.yaml    # Model alias config
├── nginx/                    # Nginx configuration
├── scripts/
│   ├── seed.py               # Create default team/key
│   └── backup.sh             # PostgreSQL backup
├── docker-compose.yml
├── Dockerfile.proxy
└── Dockerfile.dashboard
```

## Environment Variables

| Variable | Description | Default |
|----------|------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql+asyncpg://proxy:proxy@postgres:5432/llmproxy` |
| `REDIS_URL` | Redis connection string | `redis://redis:6379/0` |
| `JWT_SECRET` | Secret for JWT tokens | (required) |
| `ANTHROPIC_API_KEY` | Anthropic API key | (optional) |
| `OPENAI_API_KEY` | OpenAI API key | (optional) |
| `OLLAMA_BASE_URL` | Ollama server URL | `http://host.docker.internal:11434` |
| `ADMIN_USERNAME` | Dashboard login username | `admin` |
| `ADMIN_PASSWORD_HASH` | Bcrypt hash of admin password | (optional, defaults to "admin") |

## Backup

PostgreSQL is backed up daily at 03:00 via `scripts/backup.sh`. Retention: 30 days.

Redis data is ephemeral (budget counters) and reconstructible from PostgreSQL audit logs.

## Development

```bash
# Run backend locally (needs PostgreSQL and Redis running)
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Run dashboard locally
cd dashboard && npm install && npm run dev
```
