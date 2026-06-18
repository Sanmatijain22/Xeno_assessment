# Railway Environment Variables

Add these environment variables to your Railway worker service:

## System Configuration
- `ENV=production`
- `DEBUG=false`
- `SECRET_KEY=your-secure-secret-key`

## Database
- `DB_USER=postgres`
- `DB_PASSWORD=your-db-password`
- `DB_HOST=your-render-postgres-host.render.com`
- `DB_PORT=5432`
- `DB_NAME=xeno`

## Database Pool Configuration
- `DB_ECHO=false`
- `DB_POOL_SIZE=5`
- `DB_MAX_OVERFLOW=10`
- `DB_POOL_TIMEOUT=30`

## Queue
- `REDIS_URL=redis://your-render-redis-host.render.com:6379/0`

## AI — Groq API
- `GROQ_API_KEY=your-groq-api-key`

## Supabase Storage (NEW)
- `SUPABASE_URL=https://your-project.supabase.co`
- `SUPABASE_SERVICE_KEY=your-supabase-service-role-key`
- `SUPABASE_BUCKET_NAME=xeno-uploads`

## Storage (local temp directories)
- `UPLOAD_DIR=./uploads`
- `OUTPUT_DIR=./outputs`

## Upload Limits
- `MAX_UPLOAD_BYTES=52428800`
