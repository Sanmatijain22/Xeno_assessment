# Xeno Data Intelligence Hub

Streaming transaction validation at scale.

## Structure

```
xeno/
├── backend/   # Litestar + Polars + Redis RQ + PostgreSQL
└── frontend/  # Next.js 16 dashboard
```

## Quick Start

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
cd frontend
npm install
npm run dev
```

App available at `http://localhost:3000`

## Environment Variables

See `backend/.env.example` for all required backend variables.

Set `NEXT_PUBLIC_API_URL=http://localhost:8000` in `frontend/.env.local`.

## Tech Stack

| Layer | Technology |
|---|---|
| API | Litestar, msgspec |
| Validation | Polars, Pandera |
| Queue | Redis RQ |
| Database | PostgreSQL + SQLAlchemy async |
| AI | Groq (llama-3.3-70b) |
| Frontend | Next.js 16, TypeScript |
