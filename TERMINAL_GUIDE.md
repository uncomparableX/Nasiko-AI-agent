# 🖥️ Nasiko Terminal Guide

Follow these instructions to get the entire Nasiko platform and the Recruitment App running. Open each command in a **separate terminal tab or window**.

## 1. Core Infrastructure (Docker)
**Directory:** `~/nasiko`
```bash
# Start all core services (Backend, DBs, Gateway, Router)
docker compose -f docker-compose.local.yml --env-file .nasiko-local.env up -d

# To watch logs:
docker compose -f docker-compose.local.yml --env-file .nasiko-local.env logs -f
```

## 2. Agent Orchestrator (Redis Listener)
**Directory:** `~/nasiko`
> [!IMPORTANT]
> This MUST be running for agents to deploy correctly.
```bash
# Start the async worker that handles agent builds and deployments
# (Now configured to use Python 3.12 via .python-version)
uv run orchestrator/redis_stream_listener.py
```

## 3. Recruitment App (Frontend)
**Directory:** `~/nasiko/recruitment-app`
```bash
# Switch to correct Node version and start dev server
nvm use
npm run dev
```
**Access at:** [http://localhost:5173](http://localhost:5173)

## 4. Monitoring & CLI
**Directory:** `~/nasiko`
```bash
# Check status of all containers
docker ps

# Check agent specific status
docker ps --filter "name=agent-"
```

---

### 🌐 Key URLs
| Service | URL |
|---------|-----|
| **Recruitment App** | [http://localhost:5173](http://localhost:5173) |
| **Nasiko Platform UI** | [http://localhost:9100/app/](http://localhost:9100/app/) |
| **API Documentation** | [http://localhost:8000/docs](http://localhost:8000/docs) |
| **Observability (Phoenix)** | [http://localhost:6006](http://localhost:6006) |
