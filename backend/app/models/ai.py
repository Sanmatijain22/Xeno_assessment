from __future__ import annotations

import uuid
from typing import TYPE_CHECKING
from sqlalchemy import Float, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.database import Base

if TYPE_CHECKING:
    from app.models.jobs import ProcessingJobs


class AIReports(Base):
    __tablename__ = "ai_reports"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), 
        primary_key=True, 
        default=uuid.uuid4
    )
    job_id: Mapped[str] = mapped_column(
        ForeignKey("processing_jobs.id", ondelete="CASCADE"), 
        unique=True, 
        nullable=False, 
        index=True
    )
    quality_score: Mapped[float] = mapped_column(Float, nullable=False)
    common_errors: Mapped[list] = mapped_column(JSONB, nullable=False)
    country_analysis: Mapped[dict] = mapped_column(JSONB, nullable=False)
    recommendations: Mapped[list] = mapped_column(JSONB, nullable=False)
    executive_summary: Mapped[str] = mapped_column(Text, nullable=False)

    # Relationships
    job: Mapped[ProcessingJobs] = relationship(
        "ProcessingJobs", 
        back_populates="ai_report"
    )
