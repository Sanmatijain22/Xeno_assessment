# Redis Connection Timeout and Migration Fixes

## Fixes Applied

### 1. Migration Fix - NOT NULL Column Issue
**File:** `backend/alembic/versions/add_enhanced_validation_config.py`

**Problem:**
```
NotNullViolation: column "allow_future_dates" of relation "country_rules" contains null values
```

**Root Cause:**
The migration tried to add a NOT NULL column without providing default values for existing rows.

**Solution:**
Applied 3-step approach for the `allow_future_dates` column:

**Before (Line 23):**
```python
op.add_column('country_rules', sa.Column('allow_future_dates', sa.Boolean(), nullable=False, default=False))
```

**After (Lines 23-25):**
```python
op.add_column('country_rules', sa.Column('allow_future_dates', sa.Boolean(), nullable=True))
op.execute("UPDATE country_rules SET allow_future_dates = FALSE")
op.alter_column('country_rules', 'allow_future_dates', nullable=False)
```

**Impact:**
- Migration will now succeed on databases with existing country_rules data
- All existing rows get `allow_future_dates = FALSE` as default
- New rows will require explicit value (NOT NULL constraint enforced)

### 2. Redis Connection Timeout Fixes

**Problem:**
RQ worker disconnects from Redis (Valkey) with "Redis connection timeout, quitting..." after sitting idle for ~20-30 minutes on Render.

**Root Cause:**
TCP connections dropping during idle periods due to lack of keepalive and health checks.

**Solution:**
Applied Redis connection timeout fixes to worker startup scripts:

#### A. Enhanced Redis Connection Settings
**Files:**
- `backend/start_worker.py` (already had fixes, enhanced with auto-restart)
- `backend/app/workers/tasks.py` (already had fixes)

**Redis Connection Parameters:**
```python
redis_conn = Redis.from_url(
    settings.REDIS_URL,
    socket_keepalive=True,              # Enable TCP keepalive
    socket_keepalive_options={},        # Use OS default keepalive settings
    socket_timeout=None,               # No timeout for active operations
    socket_connect_timeout=10,          # 10s timeout for initial connection
    health_check_interval=30           # Health check every 30 seconds
)
```

**Benefits:**
- `socket_keepalive=True`: Prevents connection drops during idle periods
- `socket_timeout=None`: Allows long-running operations without timeout
- `socket_connect_timeout=10`: Quick failure on connection issues
- `health_check_interval=30`: Detects stale connections every 30 seconds

#### B. Worker Auto-Restart Capability
**File:** `backend/start_worker.py`

**Added Function:**
```python
def run_with_restart():
    """Run worker with automatic restart on exit"""
    while True:
        try:
            main()
        except Exception as e:
            print(f"Worker exited with error: {e}")
            print("Restarting in 5 seconds...")
            time.sleep(5)
```

**Environment Control:**
```python
if os.getenv("AUTO_RESTART_WORKER", "true").lower() == "true":
    run_with_restart()
else:
    main()
```

**Benefits:**
- Worker automatically restarts on Redis connection failures
- Configurable via `AUTO_RESTART_WORKER` environment variable
- Provides resilience against transient connection issues

#### C. Render Configuration Update
**File:** `render.yaml`

**Added Environment Variable:**
```yaml
- key: AUTO_RESTART_WORKER
  value: true
```

**Removed:**
- Shell loop from `dockerCommand` (now handled in Python)

**Benefits:**
- Cleaner separation of concerns
- Better error handling and logging in Python
- Consistent behavior across platforms (Render, Railway, etc.)

## Testing Checklist

### Migration Fix:
- [ ] Run `alembic upgrade head` on development database
- [ ] Verify `country_rules` table has new `allow_future_dates` column
- [ ] Check existing rows have `FALSE` as default value
- [ ] Test inserting new rows without `allow_future_dates` (should fail)

### Redis Connection Fixes:
- [ ] Deploy worker to Render/Railway
- [ ] Monitor worker logs for connection messages
- [ ] Verify worker stays connected during idle periods (>30 minutes)
- [ ] Test worker restarts automatically if connection drops
- [ ] Check Redis connection health in logs

### Integration Testing:
- [ ] Upload test file to trigger worker job
- [ ] Verify job processes successfully
- [ ] Check worker remains healthy after job completion
- [ ] Monitor for any connection timeout errors in logs

## Expected Behavior After Fixes

1. **Migration Success:** Database upgrade completes without NOT NULL violations
2. **Stable Redis Connection:** Worker maintains connection during idle periods
3. **Auto-Recovery:** Worker restarts automatically if connection drops
4. **Resilient Processing:** Jobs continue processing even with transient connection issues

## Files Modified

1. `backend/alembic/versions/add_enhanced_validation_config.py` - Migration fix
2. `backend/start_worker.py` - Enhanced with auto-restart logic
3. `render.yaml` - Added AUTO_RESTART_WORKER environment variable

## Configuration Notes

**Environment Variables:**
- `AUTO_RESTART_WORKER`: Enable/disable auto-restart (default: true)
- `REDIS_URL`: Redis connection string (required)
- `RQ_WORKER`: Indicates this is a worker deployment (required)

**Redis Connection Best Practices:**
- Always use `socket_keepalive=True` for long-running workers
- Set `health_check_interval` to detect stale connections
- Use `socket_timeout=None` for operations that may take time
- Set reasonable `socket_connect_timeout` for quick failure detection