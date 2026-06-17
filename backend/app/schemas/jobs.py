import uuid
from typing import Optional
import msgspec


class UploadResponse(msgspec.Struct):
    """Returned immediately following file upload receipt."""
    job_id: str
    status: str


class JobStatusResponse(msgspec.Struct):
    """Returned by heartbeat progress endpoints."""
    job_id: str
    status: str


class JobDetailsResponse(msgspec.Struct):
    """Contains detailed record counters and completion data."""
    job_id: str
    uploaded_file_id: uuid.UUID
    status: str
    total_records: Optional[int]
    valid_records: Optional[int]
    invalid_records: Optional[int]
    clean_file_path: Optional[str]
    error_report_path: Optional[str]


class DownloadLinksResponse(msgspec.Struct):
    """Contains download links for processed output files."""
    job_id: str
    clean_transactions_url: Optional[str]
    error_report_url: Optional[str]
    chunks_urls: list[str]


class AIReportResponse(msgspec.Struct):
    """Matches data saved by Groq worker analytics."""
    quality_score: float
    common_errors: list[dict]
    country_analysis: dict
    recommendations: list[str]
    executive_summary: str


class JobListItem(msgspec.Struct):
    """Lightweight summary used in the jobs list endpoint."""
    job_id: str
    status: str
    total_records: Optional[int]
    valid_records: Optional[int]
    invalid_records: Optional[int]
