from typing import Optional, Sequence
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.jobs import ProcessingJobs, UploadedFiles
from app.models.logs import ValidationLogs
from app.models.ai import AIReports
from app.repositories.base import BaseRepository

class JobsRepository(BaseRepository[ProcessingJobs]):
    """Handles async persistence operations for processing state machines."""
    def __init__(self, session: AsyncSession):
        super().__init__(session, ProcessingJobs)

    async def create_file_metadata(self, file_meta: UploadedFiles) -> UploadedFiles:
        """Saves physical file registration details to database."""
        self.session.add(file_meta)
        await self.session.flush()
        return file_meta

    async def get_uploaded_file(self, file_id) -> Optional[UploadedFiles]:
        """Fetch metadata for stored files."""
        return await self.session.get(UploadedFiles, file_id)

    async def bulk_log_validation_errors(self, logs: list[ValidationLogs]) -> None:
        """Stores a batch of failed row assertions into PostgreSQL."""
        self.session.add_all(logs)
        await self.session.flush()

    async def get_validation_logs(self, job_id: str) -> Sequence[ValidationLogs]:
        """Queries entire row error logs matching batch identifier."""
        stmt = select(ValidationLogs).where(ValidationLogs.job_id == job_id).order_by(ValidationLogs.row_number)
        res = await self.session.execute(stmt)
        return res.scalars().all()

    async def save_ai_report(self, report: AIReports) -> AIReports:
        """Saves Gemini output model attributes into DB."""
        self.session.add(report)
        await self.session.flush()
        return report

    async def get_ai_report(self, job_id: str) -> Optional[AIReports]:
        """Lookup report model matching job code."""
        stmt = select(AIReports).where(AIReports.job_id == job_id)
        res = await self.session.execute(stmt)
        return res.scalars().first()
