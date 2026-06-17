import re
import logging
import polars as pl
from pathlib import Path
from app.services.storage import storage_service

logger = logging.getLogger("xeno.validation")

# Configurable chunk size for splitting output
CHUNK_SIZE = 1000

# Expected columns in the transaction dataset
EXPECTED_COLUMNS = [
    "order_id", "product_id", "quantity", "amount",
    "phone_number", "payment_mode", "transaction_date",
]

VALID_PAYMENT_MODES = {"Credit Card", "Debit Card", "UPI", "Net Banking", "Wallet", "Paypal"}

# Date format mapping: convert notation like DD/MM/YYYY to regex patterns
DATE_FORMAT_REGEX = {
    "DD/MM/YYYY": r"^\d{1,2}/\d{1,2}/\d{4}$",
    "MM/DD/YYYY": r"^\d{1,2}/\d{1,2}/\d{4}$",
    "DD-MM-YYYY": r"^\d{1,2}-\d{1,2}-\d{4}$",
    "DD.MM.YYYY": r"^\d{1,2}\.\d{1,2}\.\d{4}$",
    "YYYY-MM-DD": r"^\d{4}-\d{1,2}-\d{1,2}$",
}


class ValidationService:
    """Coordinates Polars data stream reader and row-level validation.

    Operates using Polars to read files, then validates each row
    against country-specific rules fetched from the database.
    """

    async def process_dataset(self, job_id: str, file_path: str, country_code: str) -> dict:
        """Executes transaction validation steps:

        1. Query rules configuration patterns for country_code from database.
        2. Read the transaction dataset via Polars.
        3. Validate each row for missing fields, invalid phones, bad dates, etc.
        4. Separate valid and invalid rows.
        5. Write clean output, error report, and chunks.
        6. Return results summary.
        """
        # Fetch country rules from DB
        from app.config.db import session_scope
        from app.repositories.rules import CountryRulesRepository

        phone_regex = r"^\+?\d{7,15}$"  # fallback
        date_format = "DD/MM/YYYY"

        try:
            async with session_scope() as session:
                rules_repo = CountryRulesRepository(session)
                rule = await rules_repo.get_by_code(country_code)
                if rule:
                    phone_regex = rule.phone_regex
                    date_format = rule.date_format
                    logger.info(f"Loaded rules for {country_code}: phone={phone_regex}, date={date_format}")
                else:
                    logger.warning(f"No rules found for country {country_code}, using defaults")
        except Exception as e:
            logger.error(f"Failed to fetch country rules: {e}")

        date_regex = DATE_FORMAT_REGEX.get(date_format, r"^\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4}$")

        # Read the dataset
        file_ext = Path(file_path).suffix.lower()
        try:
            if file_ext == ".csv":
                df = pl.read_csv(file_path, infer_schema_length=0)
            elif file_ext in (".xlsx", ".xls"):
                df = pl.read_excel(file_path, infer_schema_length=0)
            else:
                raise ValueError(f"Unsupported file extension: {file_ext}")
        except Exception as e:
            logger.error(f"Failed to read file {file_path}: {e}")
            raise

        # Normalize column names: strip whitespace and lowercase
        df = df.rename({col: col.strip().lower().replace(" ", "_") for col in df.columns})

        total_records = len(df)
        logger.info(f"Job {job_id}: Read {total_records} records from {file_path}")

        # Validate rows
        error_logs = []
        valid_mask = [True] * total_records

        # Compile regex patterns
        phone_pattern = re.compile(phone_regex)
        date_pattern = re.compile(date_regex)

        for row_idx in range(total_records):
            row = df.row(row_idx, named=True)
            row_errors = []

            # Check missing required fields
            for col in EXPECTED_COLUMNS:
                if col in row:
                    val = row[col]
                    if val is None or (isinstance(val, str) and val.strip() == ""):
                        row_errors.append({
                            "row_number": row_idx + 1,
                            "column_name": col,
                            "error_message": f"Missing required field: {col}",
                            "error_type": "missing_field",
                        })

            # Validate phone_number
            if "phone_number" in row and row["phone_number"]:
                phone_val = str(row["phone_number"]).strip()
                if not phone_pattern.match(phone_val):
                    row_errors.append({
                        "row_number": row_idx + 1,
                        "column_name": "phone_number",
                        "error_message": f"Phone '{phone_val}' does not match {country_code} pattern",
                        "error_type": "invalid_phone",
                    })

            # Validate transaction_date
            if "transaction_date" in row and row["transaction_date"]:
                date_val = str(row["transaction_date"]).strip()
                if not date_pattern.match(date_val):
                    row_errors.append({
                        "row_number": row_idx + 1,
                        "column_name": "transaction_date",
                        "error_message": f"Date '{date_val}' does not match format {date_format}",
                        "error_type": "invalid_date",
                    })

            # Validate quantity (non-negative)
            if "quantity" in row and row["quantity"] is not None:
                try:
                    qty = float(str(row["quantity"]))
                    if qty < 0:
                        row_errors.append({
                            "row_number": row_idx + 1,
                            "column_name": "quantity",
                            "error_message": f"Negative quantity: {qty}",
                            "error_type": "negative_value",
                        })
                except (ValueError, TypeError):
                    row_errors.append({
                        "row_number": row_idx + 1,
                        "column_name": "quantity",
                        "error_message": f"Non-numeric quantity: {row['quantity']}",
                        "error_type": "invalid_value",
                    })

            # Validate amount (non-negative)
            if "amount" in row and row["amount"] is not None:
                try:
                    amt = float(str(row["amount"]))
                    if amt < 0:
                        row_errors.append({
                            "row_number": row_idx + 1,
                            "column_name": "amount",
                            "error_message": f"Negative amount: {amt}",
                            "error_type": "negative_value",
                        })
                except (ValueError, TypeError):
                    row_errors.append({
                        "row_number": row_idx + 1,
                        "column_name": "amount",
                        "error_message": f"Non-numeric amount: {row['amount']}",
                        "error_type": "invalid_value",
                    })

            # Validate payment_mode
            if "payment_mode" in row and row["payment_mode"]:
                pm = str(row["payment_mode"]).strip()
                if pm not in VALID_PAYMENT_MODES:
                    row_errors.append({
                        "row_number": row_idx + 1,
                        "column_name": "payment_mode",
                        "error_message": f"Invalid payment mode: '{pm}'",
                        "error_type": "invalid_payment_mode",
                    })

            if row_errors:
                valid_mask[row_idx] = False
                error_logs.extend(row_errors)

        # Check for duplicate order_ids
        if "order_id" in df.columns:
            order_ids = df["order_id"].to_list()
            seen = {}
            for i, oid in enumerate(order_ids):
                if oid and str(oid).strip():
                    oid_str = str(oid).strip()
                    if oid_str in seen:
                        error_logs.append({
                            "row_number": i + 1,
                            "column_name": "order_id",
                            "error_message": f"Duplicate order_id: '{oid_str}' (first seen at row {seen[oid_str]})",
                            "error_type": "duplicate_order_id",
                        })
                        valid_mask[i] = False
                    else:
                        seen[oid_str] = i + 1

        # Separate valid and invalid rows
        valid_indices = [i for i, v in enumerate(valid_mask) if v]
        invalid_indices = [i for i, v in enumerate(valid_mask) if not v]

        valid_df = df[valid_indices] if valid_indices else df.clear()
        invalid_df = df[invalid_indices] if invalid_indices else df.clear()

        valid_count = len(valid_df)
        invalid_count = len(invalid_df)

        logger.info(f"Job {job_id}: {valid_count} valid, {invalid_count} invalid out of {total_records}")

        # Write output files
        clean_path = storage_service.get_clean_output_path(job_id)
        error_path = storage_service.get_error_report_path(job_id)

        valid_df.write_csv(str(clean_path))
        logger.info(f"Job {job_id}: Wrote clean file to {clean_path}")

        # Build error report: invalid rows with error reason column
        if invalid_indices:
            # Create a mapping of row_index -> concatenated errors
            row_error_map = {}
            for err in error_logs:
                row_num = err["row_number"] - 1  # convert to 0-indexed
                msg = f"{err['column_name']}: {err['error_message']}"
                if row_num in row_error_map:
                    row_error_map[row_num] += "; " + msg
                else:
                    row_error_map[row_num] = msg

            error_reasons = [row_error_map.get(i, "Unknown error") for i in invalid_indices]
            error_report_df = invalid_df.with_columns(
                pl.Series("validation_errors", error_reasons)
            )
            error_report_df.write_csv(str(error_path))
        else:
            # Write empty error report with headers
            invalid_df.write_csv(str(error_path))

        logger.info(f"Job {job_id}: Wrote error report to {error_path}")

        # Write chunks of valid data
        chunk_paths = []
        if valid_count > 0:
            for chunk_idx, start in enumerate(range(0, valid_count, CHUNK_SIZE)):
                chunk_df = valid_df.slice(start, CHUNK_SIZE)
                chunk_path = storage_service.get_chunk_output_path(job_id, chunk_idx + 1)
                chunk_df.write_csv(str(chunk_path))
                chunk_paths.append(str(chunk_path))
                logger.info(f"Job {job_id}: Wrote chunk {chunk_idx + 1} to {chunk_path}")

        # Store validation logs in DB
        try:
            from app.config.db import session_scope
            from app.models.logs import ValidationLogs
            from app.repositories.jobs import JobsRepository

            async def _save_logs():
                async with session_scope() as session:
                    repo = JobsRepository(session)
                    log_objects = []
                    for err in error_logs[:500]:  # cap at 500 log entries
                        log_objects.append(ValidationLogs(
                            job_id=job_id,
                            row_number=err["row_number"],
                            column_name=err.get("column_name"),
                            error_message=err["error_message"],
                            error_type=err["error_type"],
                        ))
                    if log_objects:
                        await repo.bulk_log_validation_errors(log_objects)

            import asyncio
            # Check if an event loop is already running
            try:
                loop = asyncio.get_running_loop()
                # If we're already inside an async context, just await directly
                await _save_logs()
            except RuntimeError:
                asyncio.run(_save_logs())

        except Exception as e:
            logger.error(f"Failed to save validation logs: {e}")

        return {
            "job_id": job_id,
            "status": "completed",
            "total_records": total_records,
            "valid_records": valid_count,
            "invalid_records": invalid_count,
            "clean_file_path": str(clean_path),
            "error_report_path": str(error_path),
            "chunk_paths": chunk_paths,
            "error_logs": error_logs[:100],  # pass subset to AI service
        }


validation_service = ValidationService()
