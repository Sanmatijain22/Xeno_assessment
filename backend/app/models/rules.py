from __future__ import annotations

import uuid
from sqlalchemy import String, Boolean, Index, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.models.database import Base


class CountryRules(Base):
    __tablename__ = "country_rules"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    # ISO 3166-1 alpha-2 codes are 2 chars; using 10 gives headroom for
    # any non-standard internal codes without risking truncation errors.
    country_code: Mapped[str] = mapped_column(
        String(10),
        nullable=False,
        index=True
    )
    country_name: Mapped[str] = mapped_column(String(100), nullable=False)
    phone_regex: Mapped[str] = mapped_column(String(255), nullable=False)
    date_format: Mapped[str] = mapped_column(String(50), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    __table_args__ = (
        # Only one *active* rule is allowed per country code.
        # Archived (is_active=False) rows are excluded so historical rules
        # can be retained without violating the constraint.
        Index(
            "uq_country_rules_active_code",
            "country_code",
            unique=True,
            postgresql_where=text("is_active = TRUE"),
        ),
    )
