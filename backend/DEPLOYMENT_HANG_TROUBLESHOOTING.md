# Render Deployment Hang Troubleshooting Guide

## Problem
Render deploy hangs for 14+ minutes during Alembic migration step, then fails with misleading "no open ports detected" error.

**Confirmed Timeline:**
```
09:21:03 AM  INFO [alembic.runtime.migration] Context impl PostgresqlImpl.
09:21:03 AM  INFO [alembic.runtime.migration] Will assume transactional DDL.
[... 14 minute total silence, no further alembic output, no errors ...]
09:35:53 AM  ==> Port scan timeout reached, no open ports detected...
```

**Interpretation:** The "no open ports detected" message is a RED HERRING. The app never binds a port because the process never gets past `alembic upgrade head` — it is fully hung for the entire 14 minutes until Render's deploy timeout kills it.

## Root Cause Analysis

### Most Likely: Stale Postgres Advisory Lock
Alembic takes a Postgres advisory lock before running `upgrade head` to prevent concurrent migrations. If a previous deploy crashed, was cancelled, or was killed mid-migration without releasing that lock, the new deploy will hang forever waiting to acquire it.

### Other Possible Causes
- DB connection hanging (not failing)
- Missing merge migration in deployed code
- Network connectivity issues
- Supabase pooler mode misconfiguration (transaction pooler doesn't support advisory locks)

## Investigation Steps

### Step 1: Check for Stale Advisory Locks
Connect to the production/staging Postgres DB directly and run:

```sql
-- Check for advisory locks
SELECT pid, granted, mode, locktype
FROM pg_locks
WHERE locktype = 'advisory';
```

If any locks are found, note the `pid` and terminate the blocking session:

```sql
-- Terminate the blocking session
SELECT pg_terminate_backend(<pid>);
```

### Step 2: Check for Long-Running/Idle Sessions
```sql
-- Check for long-running or idle-in-transaction sessions
SELECT pid, state, query, query_start, state_change, wait_event_type, wait_event
FROM pg_stat_activity
WHERE state != 'idle'
ORDER BY query_start ASC;
```

If any sessions are in `idle in transaction` state for a long time, terminate them:

```sql
-- Terminate idle-in-transaction sessions
SELECT pg_terminate_backend(<pid>);
```

### Step 3: Check Alembic Heads
Verify the merge migration is present in the deployed code:

```bash
cd backend
alembic heads
```

Expected output:
```
5d31b052e9b5 (head)
```

If multiple heads are shown, the merge migration is missing from the deployed code.

### Step 4: Check DB Connection Configuration
Verify the DATABASE_URL is correct:
- **Current Configuration:** Using port 5432 (direct PostgreSQL connection)
- **Supabase Note:** Transaction pooler (port 6543) does NOT support advisory locks
- **Recommendation:** Use direct connection (port 5432) or Session pooler for migrations
- SSL mode is set correctly if required
- Connection is reachable from Render's network

## Fixes Applied

### Fix 1: Added Connection Timeout to env.py
**File:** `backend/alembic/env.py`

**Change:**
```python
def run_migrations_online() -> None:
    # Add connect_timeout to fail fast on connection issues instead of hanging indefinitely
    connectable = create_engine(
        DB_URL,
        poolclass=pool.NullPool,
        connect_args={"connect_timeout": 10}  # Fail fast if DB is unreachable
    )
    with connectable.connect() as connection:
        # Set lock_timeout and statement_timeout to fail fast on hangs instead of waiting indefinitely
        connection.execute(text("SET lock_timeout = '15s'"))
        connection.execute(text("SET statement_timeout = '60s'"))
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
        )
        with context.begin_transaction():
            context.run_migrations()
```

**Impact:**
- Connection issues will now fail fast with a clear error instead of hanging indefinitely
- Lock acquisition will timeout after 15 seconds instead of waiting forever
- Statement execution will timeout after 60 seconds instead of waiting forever

### Fix 2: Verified Merge Migration is Present
**Result:** Single head confirmed: `5d31b052e9b5`

**Impact:** The multiple-heads fix is present in the codebase.

### Fix 3: Confirmed DB Connection Mode
**Result:** Using port 5432 (direct PostgreSQL connection)

**Impact:** Correct configuration for Alembic migrations (supports advisory locks). Not using transaction pooler which would cause hangs.

## Resolution Steps

### If Stale Lock is Found
1. Terminate the blocking session using `pg_terminate_backend(<pid>)`
2. Re-trigger the Render deploy
3. Migration should complete within 30 seconds

### If No Stale Lock is Found
1. Check DB connection string in Render environment variables
2. Verify Supabase pooler mode is correct (use direct connection for migrations)
3. Check network connectivity from Render to DB
4. Re-trigger deploy with timeout fix in place
5. Should now fail fast with clear error if connection issue

### If Merge Migration is Missing
1. Ensure the merge migration file is committed and pushed
2. Verify the correct branch is deployed
3. Re-trigger deploy

## Expected Behavior After Fix

**Before Fix:**
- Deploy hangs indefinitely during migration step (14+ minutes)
- No error message
- Fails with misleading "no open ports detected" error
- "Waiting for internal health check" banner remains active

**After Fix:**
- Deploy either completes successfully within 30 seconds
- OR fails fast with clear error message (connection timeout, lock timeout, statement timeout, etc.)
- No indefinite hanging
- Clear error messages for debugging

## Monitoring

After applying fixes, monitor:
1. Deploy log should show migration completion or clear error
2. Migration should complete within 30 seconds for typical migrations
3. Lock timeout should trigger after 15 seconds if stale lock exists
4. Statement timeout should trigger after 60 seconds if query hangs
5. No "Waiting for internal health check" hanging

## Files Modified

1. `backend/alembic/env.py` - Added connect_timeout, lock_timeout, and statement_timeout to prevent indefinite hangs

## Verification

Run these commands to verify the fix:

```bash
# Check single head exists
cd backend
alembic heads

# Verify timeouts are in env.py
grep -n "connect_timeout\|lock_timeout\|statement_timeout" alembic/env.py
```

## Next Steps

1. Run the SQL queries against the production DB to check for stale locks
2. If stale lock found, terminate it
3. Re-trigger Render deploy
4. Monitor deploy log for completion or clear error
5. Report results

## DO NOT Change Port-Binding Configuration

The "no open ports detected" error is a symptom of the migration hang, not a separate bug. Changing PORT env var or host binding will not fix the underlying issue.
