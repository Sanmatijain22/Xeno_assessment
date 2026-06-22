# Supabase Storage Migration Summary

## Overview
Refactored the application to use Supabase Storage as shared file storage between the Render backend and Railway worker, replacing local filesystem storage.

## Problem Solved
- Backend runs on Render
- Worker runs on Railway
- Uploaded files were saved to local paths like `./uploads/file.csv`
- Worker received a file path but could not access files stored on Render's filesystem
- Jobs failed with `FileNotFoundError`

## Solution
- Files are now uploaded to Supabase Storage from the Render backend
- Worker downloads files from Supabase Storage to a temporary local file
- Worker processes the file and cleans up the temporary file after completion
- Database stores Supabase storage paths instead of local file paths

---

## Files Modified

### 1. `backend/requirements.txt`
**Change:** Added Supabase Python client dependency
```diff
+ supabase>=2.0.0
```

### 2. `backend/app/config/settings.py`
**Changes:** Added Supabase environment variables
```diff
+ # Supabase Storage
+ supabase_url: str = field(default_factory=lambda: os.getenv("SUPABASE_URL", ""))
+ supabase_service_key: str = field(default_factory=lambda: os.getenv("SUPABASE_SERVICE_KEY", ""))
+ supabase_bucket_name: str = field(default_factory=lambda: os.getenv("SUPABASE_BUCKET_NAME", "xeno-uploads"))

+ @property
+ def SUPABASE_URL(self) -> str: return self.supabase_url  # noqa: N802
+ 
+ @property
+ def SUPABASE_SERVICE_KEY(self) -> str: return self.supabase_service_key  # noqa: N802
+ 
+ @property
+ def SUPABASE_BUCKET_NAME(self) -> str: return self.supabase_bucket_name  # noqa: N802
```

### 3. `backend/app/services/storage.py`
**Changes:** Complete rewrite to use Supabase Storage
- Added Supabase client initialization
- Added `upload_file()` method to upload files to Supabase Storage
- Added `download_file()` method to download files from Supabase Storage
- Added `delete_file()` method to delete files from Supabase Storage
- Added `generate_signed_url()` method to create temporary access URLs
- Added `cleanup_temp_file()` method to clean up temporary local files
- Kept existing local directory methods for output files (worker-generated)

### 4. `backend/app/models/jobs.py`
**Changes:** Renamed database column
```diff
class UploadedFiles(Base):
    __tablename__ = "uploaded_files"
    
    id: Mapped[uuid.UUID] = mapped_column(...)
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
-   file_path: Mapped[str] = mapped_column(String(512), nullable=False)
+   storage_path: Mapped[str] = mapped_column(String(512), nullable=False)
    file_size: Mapped[int] = mapped_column(Integer, nullable=False)
    mime_type: Mapped[str] = mapped_column(String(100), nullable=False)
```

### 5. `backend/app/api/upload.py`
**Changes:** Modified upload flow to use Supabase Storage
- Save file temporarily to local filesystem
- Upload file to Supabase Storage
- Store returned storage path in database instead of local path
- Pass storage path to worker instead of local file path
- Cleanup local temp file after successful upload
- Cleanup Supabase file on database registration failure
- Updated UploadedFiles creation to use `storage_path` instead of `file_path`

### 6. `backend/app/workers/tasks.py`
**Changes:** Modified worker flow to download from Supabase Storage
- Changed parameter from `file_path` to `storage_path`
- Added download step: download file from Supabase Storage to temporary local file
- Pass local file path to validation service
- Cleanup temporary downloaded file in finally block
- Updated function signature to return `local_file_path` for cleanup

---

## New Environment Variables

### Required for both Render (backend) and Railway (worker):
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-supabase-service-role-key
SUPABASE_BUCKET_NAME=xeno-uploads
```

### How to get these values:
1. Go to https://supabase.com
2. Create a new project or select existing project
3. Go to Project Settings > API
4. Copy `Project URL` as `SUPABASE_URL`
5. Copy `service_role` key as `SUPABASE_SERVICE_KEY`
6. Create a storage bucket named `xeno-uploads` (or configure custom name via `SUPABASE_BUCKET_NAME`)

---

## Database Migration

### New Migration File: `backend/alembic/versions/rename_file_path_to_storage_path.py`

**Upgrade:**
```python
def upgrade() -> None:
    """Upgrade schema."""
    op.alter_column('uploaded_files', 'file_path', new_column_name='storage_path')
```

**Downgrade:**
```python
def downgrade() -> None:
    """Downgrade schema."""
    op.alter_column('uploaded_files', 'storage_path', new_column_name='file_path')
```

### How to apply migration:
```bash
cd backend
alembic upgrade head
```

---

## Environment Files Generated

### 1. `backend/.env.example`
Updated to include Supabase environment variables

### 2. `backend/RENDER_ENV_VARS.md`
Complete list of environment variables for Render backend deployment

### 3. `backend/RAILWAY_ENV_VARS.md`
Complete list of environment variables for Railway worker deployment

---

## Deployment Steps

### 1. Set up Supabase Storage
1. Create a Supabase project
2. Create a storage bucket named `xeno-uploads`
3. Ensure bucket is public or configure appropriate RLS policies
4. Get Project URL and service_role key

### 2. Update Render Environment Variables
Add the following to your Render backend service:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `SUPABASE_BUCKET_NAME`

### 3. Update Railway Environment Variables
Add the following to your Railway worker service:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `SUPABASE_BUCKET_NAME`

### 4. Apply Database Migration
```bash
cd backend
alembic upgrade head
```

### 5. Redeploy Services
- Redeploy Render backend
- Redeploy Railway worker

---

## Security Considerations

- `SUPABASE_SERVICE_KEY` is used for backend/worker operations only
- Service key has full admin access to Supabase
- Never expose service key to frontend
- Use signed URLs (`generate_signed_url()`) if frontend access is required
- Supabase RLS policies can be configured for additional security

---

## Error Handling

- Upload failures: Cleanup local temp file, return error to user
- Download failures: Mark job as failed, retry with exponential backoff (60s, 120s, 240s)
- Database registration failures: Cleanup both local temp file and Supabase file
- Temporary file cleanup: Best-effort cleanup in finally block

---

## Expected Flow

**Frontend uploads → Render backend uploads file to Supabase Storage → Job queued with storage path → Railway worker downloads file from Supabase Storage → Processes file successfully → Cleans up temporary file**

---

## Validation Logic

All existing validation logic remains unchanged. Only the file storage mechanism was replaced with Supabase Storage. The validation service still receives a local file path (after download) and processes it the same way as before.
