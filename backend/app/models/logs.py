from __future__ import annotations

from typing import TYPE_CHECKING, Optional
from sqlalchemy import BigInteger, String, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.database import Base

if TYPE_CHECKING:
    from app.models.jobs import ProcessingJobs


class ValidationLogs(Base):
    __tablename__ = "validation_logs"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    job_id: Mapped[str] = mapped_column(
        ForeignKey("processing_jobs.id", ondelete="CASCADE"), 
        nullable=False, 
        index=True
    )
    row_number: Mapped[int] = mapped_column(Integer, nullable=False)
    column_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    error_message: Mapped[str] = mapped_column(String(512), nullable=False)
    error_type: Mapped[str] = mapped_column(
        String(50), 
        index=True, 
        comment="missing_field | negative_value | invalid_phone | ..."
    )

    # Relationships
    job: Mapped[ProcessingJobs] = relationship(
        "ProcessingJobs", 
        back_populates="validation_logs"
    )
