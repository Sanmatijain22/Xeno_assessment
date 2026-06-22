# Data Flow Trace - Variable Name Analysis

## Complete Data Flow Analysis

### Step 1: Validation Service Output
**File:** `backend/app/services/validation.py` (lines 429-439)

```python
return {
    "job_id": job_id,
    "status": "completed",
    "total_records": total_records,
    "valid_records": valid_count,
    "invalid_records": invalid_count,
    "clean_file_path": str(clean_path) if clean_file_exists else None,
    "error_report_path": str(error_path) if error_file_exists else None,
    "chunk_paths": chunk_paths,
    "chunk_record_counts": chunk_record_counts,
    "error_logs": error_logs[:100],
    "validation_breakdown": breakdown,
    "country_stats": country_stats,
}
```

**Variable Names:**
- `total_records` (from `total_records = len(df)`)
- `valid_records` (from `valid_count = len(valid_df)`)
- `invalid_records` (from `invalid_count = len(invalid_df)`)

**Breakdown Dictionary:**
```python
breakdown: dict = {
    "invalid_phone": 0,
    "invalid_date": 0,
    "invalid_payment_mode": 0,
    "duplicate_order_id": 0,
    "negative_quantity": 0,
    "negative_amount": 0,
    "missing_fields": 0,
    "pandera_schema": 0,
}
```

---

### Step 2: Worker Result Processing
**File:** `backend/app/workers/tasks.py` (lines 145-147)

```python
job.total_records = result.get("total_records", 0)
job.valid_records = result.get("valid_records", 0)
job.invalid_records = result.get("invalid_records", 0)
job.clean_file_path = clean_storage_path or result.get("clean_file_path")
job.error_report_path = error_storage_path or result.get("error_report_path")
job.validation_breakdown = result.get("validation_breakdown")
job.processing_time_ms = processing_time_ms
```

**Variable Names:**
- `job.total_records` ← `result.get("total_records", 0)`
- `job.valid_records` ← `result.get("valid_records", 0)`
- `job.invalid_records` ← `result.get("invalid_records", 0)`
- `job.validation_breakdown` ← `result.get("validation_breakdown")`

**Mapping:** ✅ CORRECT - Variable names match exactly

---

### Step 3: Database Persistence
**File:** `backend/app/models/jobs.py` (lines 54-56)

```python
class ProcessingJobs(Base):
    __tablename__ = "processing_jobs"
    
    total_records: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    valid_records: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    invalid_records: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    clean_file_path: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    error_report_path: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    validation_breakdown: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    processing_time_ms: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
```

**Variable Names:**
- `total_records`
- `valid_records`
- `invalid_records`
- `validation_breakdown`

**Mapping:** ✅ CORRECT - Variable names match exactly

---

### Step 4: API Response Generation
**File:** `backend/app/api/upload.py` (lines 256-267)

```python
return JobDetailsResponse(
    job_id=job.id,
    uploaded_file_id=job.uploaded_file_id,
    status=job.status,
    total_records=job.total_records,
    valid_records=job.valid_records,
    invalid_records=job.invalid_records,
    clean_file_path=job.clean_file_path,
    error_report_path=job.error_report_path,
    processing_time_ms=job.processing_time_ms,
    country_stats=country_stat_entries,
    validation_breakdown=error_type_bd,
)
```

**Variable Names:**
- `total_records` ← `job.total_records`
- `valid_records` ← `job.valid_records`
- `invalid_records` ← `job.invalid_records`
- `validation_breakdown` ← `error_type_bd` (processed from `job.validation_breakdown`)

**Mapping:** ✅ CORRECT - Variable names match exactly

---

### Step 5: API Response Schema
**File:** `backend/app/schemas/jobs.py` (lines 30-43)

```python
class JobDetailsResponse(msgspec.Struct):
    job_id: str
    uploaded_file_id: uuid.UUID
    status: str
    total_records: Optional[int]
    valid_records: Optional[int]
    invalid_records: Optional[int]
    clean_file_path: Optional[str]
    error_report_path: Optional[str]
    processing_time_ms: Optional[int]
    country_stats: dict[str, CountryStatEntry]
    validation_breakdown: dict[str, int]
```

**Variable Names:**
- `total_records`
- `valid_records`
- `invalid_records`
- `validation_breakdown`

**Mapping:** ✅ CORRECT - Variable names match exactly

---

## Field-Name Mismatch Search

### Searched Terms:
- `valid_rows` - ❌ NOT FOUND
- `invalid_rows` - ❌ NOT FOUND
- `passed_records` - ❌ NOT FOUND
- `failed_records` - ❌ NOT FOUND
- `valid_count` - ✅ FOUND (used in validation service)
- `invalid_count` - ✅ FOUND (used in validation service)
- `valid_df` - ✅ FOUND (used in validation service)
- `invalid_df` - ✅ FOUND (used in validation service)

### Analysis:
- **No field-name mismatches found** between validation service output and database/API
- Variable names are consistent throughout the entire pipeline
- `valid_count` and `invalid_count` are used internally in validation service but correctly mapped to `valid_records` and `invalid_records` in the return dict

---

## Conclusion

**Variable Mapping:** ✅ NO BUGS FOUND

The variable names are consistent throughout the entire data flow:
1. Validation service returns: `valid_records`, `invalid_records`
2. Worker processes: `valid_records`, `invalid_records`
3. Database stores: `valid_records`, `invalid_records`
4. API returns: `valid_records`, `invalid_records`

**Root Cause:** The 0% pass rate is **NOT** due to a metrics/variable mapping bug.

**Actual Issue:** This is an **ACTUAL VALIDATION FAILURE** - all 2,000 records are genuinely failing validation checks.

## Next Steps to Debug Validation Failure

1. **Check worker logs** for validation error messages
2. **Look at the validation breakdown** to see which validation checks are failing
3. **Check the first 5 rows** of data to understand the data format
4. **Verify country rules** are loaded correctly
5. **Check if Pandera schema validation** is failing for all rows

The extensive logging added will reveal exactly which validation checks are failing for each record.
