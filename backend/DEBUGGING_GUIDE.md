# Debugging Guide - Validation Failure & Missing Downloads

## Current Issues

1. **Validation Failure:** 0% pass rate (2,000 invalid records out of 2,000 total)
2. **Download Links Not Visible:** Clean/error file download buttons not appearing

## Debugging Steps

### Step 1: Check Railway Worker Logs

The worker logs will show:
- File download from Supabase
- Row count loaded
- Validation breakdown
- Output file generation
- Output file upload to Supabase

**What to look for:**
```
Job {job_id}: Loaded {total_records} records from {file_path}
Job {job_id}: DataFrame columns: {columns}
Job {job_id}: First 5 rows: {sample_data}
Job {job_id}: Starting row-level validation for {total_records} rows
Job {job_id}: Row {row_number} error - {error_type}: {error_message}
Job {job_id}: Validation complete - {valid} valid, {invalid} invalid / {total}
Job {job_id}: Validation breakdown: {breakdown}
```

**Key Questions:**
- Is the file being downloaded successfully?
- What is the row count?
- What are the column names?
- What are the first 5 rows of data?
- What specific validation errors are occurring?
- What is the validation breakdown?

### Step 2: Check Render Backend Logs

The backend logs will show:
- Download endpoint calls
- File path checks
- Signed URL generation

**What to look for:**
```
Job {job_id}: Fetching downloads - job.status={status}, clean_file_path={path}
Job {job_id}: Processing clean_file_path={path}
Job {job_id}: Clean file from Supabase: {path}, url={url}
Job {job_id}: Final download URLs - clean_url={url}, error_url={url}
```

**Key Questions:**
- Are the file paths being saved to the database?
- Are they local paths or Supabase paths?
- Are signed URLs being generated successfully?
- Are there any errors in the download endpoint?

### Step 3: Check Database

Query the database to see what's stored:

```sql
SELECT job_id, status, clean_file_path, error_report_path, 
       total_records, valid_records, invalid_records
FROM processing_jobs
WHERE job_id = 'YOUR_JOB_ID';
```

**Key Questions:**
- What is stored in `clean_file_path`?
- What is stored in `error_report_path`?
- Are these local paths or Supabase paths?
- Do the paths exist?

### Step 4: Check Supabase Storage

Check if files were uploaded to Supabase:
- Go to Supabase dashboard
- Navigate to Storage
- Check the bucket
- Look for files in the job_id folder

**Key Questions:**
- Are the files present in Supabase?
- What is the storage path?
- Are the files accessible?

## Common Issues & Solutions

### Issue 1: All Records Invalid (0% Pass Rate)

**Possible Causes:**
1. **Pandera schema validation failing** - Data doesn't match expected schema
2. **Missing required fields** - Required columns are missing or empty
3. **Invalid phone numbers** - Phone numbers don't match country regex
4. **Invalid dates** - Date format doesn't match expected format
5. **Negative values** - Quantity or amount is negative
6. **Unsupported country** - Country code not in database
7. **Invalid payment modes** - Payment mode not in allowed list

**How to Debug:**
1. Check worker logs for "Row X error" messages
2. Look at the validation breakdown in logs
3. Check the first 5 rows of data in logs
4. Verify column names match expected format
5. Check if country rules are loaded correctly

**Solution:**
- Adjust validation rules if too strict
- Fix data format issues
- Add missing country rules to database
- Update regex patterns if needed

### Issue 2: Download Links Not Visible

**Possible Causes:**
1. **Files not uploaded to Supabase** - Upload failed
2. **Database paths are None** - Paths not saved
3. **Signed URL generation failed** - Supabase error
4. **Local paths used instead of Supabase** - Files on Railway, not Render
5. **Frontend not receiving URLs** - API response issue

**How to Debug:**
1. Check database for file paths
2. Check worker logs for upload success/failure
3. Check backend logs for signed URL generation
4. Check Supabase Storage for file presence
5. Check browser network tab for API response

**Solution:**
- Ensure Supabase credentials are correct
- Check bucket permissions
- Verify upload code is executing
- Check for errors in upload logs

## Expected Log Output

### Successful Validation (with some errors)
```
Job TXN-XXXXXXXX: Fetched 5 country rules from DB
Job TXN-XXXXXXXX: Using fallback rule for country_code=US: True
Job TXN-XXXXXXXX: Reading file /tmp/file.csv with extension .csv
Job TXN-XXXXXXXX: Loaded 2000 records from /tmp/file.csv
Job TXN-XXXXXXXX: DataFrame columns: ['order_id', 'product_id', 'quantity', 'amount', 'phone_number', 'payment_mode', 'transaction_date', 'country']
Job TXN-XXXXXXXX: First 5 rows:
  order_id | product_id | quantity | amount | phone_number | payment_mode | transaction_date | country
  ORD001   | PRD001     | 10       | 100.50 | +1234567890  | CREDIT_CARD | 01/01/2024       | US
  ...
Job TXN-XXXXXXXX: Pandera phone_regex=^\+?\d{10}$, date_format=DD/MM/YYYY
Job TXN-XXXXXXXX: Available columns for Pandera: {'order_id', 'product_id', 'quantity', 'amount', 'phone_number', 'payment_mode', 'transaction_date'}
Job TXN-XXXXXXXX: Starting row-level validation for 2000 rows
Job TXN-XXXXXXXX: Row 5 error - invalid_phone: Phone '+12345' does not match configured regex for country 'US'
Job TXN-XXXXXXXX: Row 10 error - missing_fields: Missing required field: product_id
Job TXN-XXXXXXXX: Validation complete - 1998 valid, 2 invalid / 2000
Job TXN-XXXXXXXX: Validation breakdown: {'invalid_phone': 1, 'missing_fields': 1}
```

### Successful File Upload
```
Job TXN-XXXXXXXX: Uploading /outputs/TXN-XXXXXXXX/clean_transactions.csv to Supabase bucket xeno-uploads as TXN-XXXXXXXX/clean_transactions.csv
Job TXN-XXXXXXXX: Successfully uploaded /outputs/TXN-XXXXXXXX/clean_transactions.csv to TXN-XXXXXXXX/clean_transactions.csv
Job TXN-XXXXXXXX: Uploaded clean file to Supabase: TXN-XXXXXXXX/clean_transactions.csv
Job TXN-XXXXXXXX: Cleaned up temporary file: /outputs/TXN-XXXXXXXX/clean_transactions.csv
```

### Successful Download URL Generation
```
Job TXN-XXXXXXXX: Fetching downloads - job.status=completed, clean_file_path=TXN-XXXXXXXX/clean_transactions.csv, error_report_path=TXN-XXXXXXXX/error_report.csv
Job TXN-XXXXXXXX: Processing clean_file_path=TXN-XXXXXXXX/clean_transactions.csv
Job TXN-XXXXXXXX: Clean file from Supabase: TXN-XXXXXXXX/clean_transactions.csv, url=https://...
Job TXN-XXXXXXXX: Final download URLs - clean_url=https://..., error_url=https://...
```

## Next Actions

1. **Deploy the updated code** with extensive logging
2. **Upload a test file** through the frontend
3. **Check Railway worker logs** for validation errors
4. **Check Render backend logs** for download URL generation
5. **Share the logs** for further analysis if issues persist

## Files Modified for Debugging

1. `backend/app/workers/tasks.py` - Added file download, upload, and metrics logging
2. `backend/app/services/validation.py` - Added validation pipeline logging
3. `backend/app/services/storage.py` - Added upload/download logging
4. `backend/app/api/upload.py` - Added download endpoint logging

These logs will help identify the exact cause of both issues.
