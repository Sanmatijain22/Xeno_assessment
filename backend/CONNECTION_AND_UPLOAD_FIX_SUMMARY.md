# DB Connection and Upload Endpoint Fix Summary

## Issues Fixed

### 1. DB Connection Error
**Error:** `TypeError: connect() got an unexpected keyword argument 'connect_timeout'`

**Root Cause:** asyncpg uses `timeout` parameter instead of `connect_timeout` for connection timeout. The code was using the wrong parameter name.

**Files Modified:**

**backend/app/config/db.py (line 34):**
```python
# Before:
connect_args={"connect_timeout": 10}

# After:
connect_args={"timeout": 10}  # asyncpg uses 'timeout' not 'connect_timeout'
```

**backend/alembic/env.py (line 51):**
```python
# Before:
connect_args={"connect_timeout": 10}

# After:
connect_args={"timeout": 10}  # asyncpg uses 'timeout'
```

### 2. Upload Endpoint 500 Error
**Error:** POST /api/upload → 500 Internal Server Error

**Root Cause:** Redis connection in upload endpoint lacked socket timeout, potentially causing indefinite hangs if Redis was unreachable.

**File Modified:**

**backend/app/api/upload.py (line 191):**
```python
# Before:
redis_conn = Redis.from_url(settings.REDIS_URL)

# After:
redis_conn = Redis.from_url(settings.REDIS_URL, socket_timeout=5, socket_connect_timeout=5)
```

## Stack Information
- FastAPI + SQLAlchemy (async) + asyncpg
- Supabase PostgreSQL + Supabase Storage
- Python 3.11

## Upload Pipeline Flow
The upload endpoint does not directly produce chunk_1.csv, clean_transactions.csv, error_report.csv. Instead:
1. Upload endpoint saves file locally and uploads to Supabase Storage
2. Creates database records for the job
3. Enqueues background task to Redis queue
4. Returns job_id and status "queued"
5. Background task (process_dataset_task) processes the file and produces the output files

## Verification Required
1. Test database connection - should no longer throw TypeError
2. Test POST /api/upload - should return 200 with job_id instead of 500
3. Verify background task produces expected output files (chunk_1.csv, clean_transactions.csv, error_report.csv)

## Note on Business Logic
No business logic was changed. Only connection timeout parameters were corrected to match asyncpg's expected parameter names, and socket timeouts were added to Redis connection to prevent indefinite hangs.
