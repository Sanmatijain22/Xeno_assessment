# Xeno Data Intelligence Hub

Streaming transaction validation at scale.

## Structure

```
xeno/
├── backend/       # Litestar + Polars + Redis RQ + PostgreSQL
└── xeno-data-hub/ # Next.js 16 dashboard
```

## Quick Start

### All services (recommended)

From the repo root:

```bash
npm install
npm run dev
```

Starts the backend stack (PostgreSQL, Redis, API, worker) via Docker and the Next.js frontend. API at `http://localhost:8000`, app at `http://localhost:3000`.

### Backend

```bash
cd backend
cp .env.example .env          # fill in DB_PASSWORD and GROQ_API_KEY
docker compose up --build -d
```

API available at `http://localhost:8000`  
Docs at `http://localhost:8000/api/docs`

### Frontend

```bash
cd xeno-data-hub
npm install
cp .env.example .env.local    # set NEXT_PUBLIC_API_URL
npm run dev
```

App available at `http://localhost:3000`

## Environment Variables

See `backend/.env.example` for all required backend variables.

Set `NEXT_PUBLIC_API_URL` in `xeno-data-hub/.env.local` only when the API is on another host. In local dev, `/api/*` is proxied to `http://localhost:8000` automatically.

## Deployment

- **Frontend**: Deploy `xeno-data-hub/` to Vercel. Set `NEXT_PUBLIC_API_URL` to your Render API URL.
- **Backend**: Deploy `backend/` to Render using `render.yaml` (web + worker services).

## Tech Stack

| Layer | Technology |
|---|---|
| API | Litestar, msgspec |
| Validation | Polars, Pandera |
| Queue | Redis RQ |
| Database | PostgreSQL + SQLAlchemy async |
| AI | Groq (llama-3.3-70b) |
| Frontend | Next.js 16, TypeScript |
