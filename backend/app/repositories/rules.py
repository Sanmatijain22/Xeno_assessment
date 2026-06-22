from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.rules import CountryRules
from app.repositories.base import BaseRepository

class CountryRulesRepository(BaseRepository[CountryRules]):
    """Repository managing Postgres mappings of validation logic."""
    def __init__(self, session: AsyncSession):
        super().__init__(session, CountryRules)

    async def get_by_code(self, country_code: str) -> Optional[CountryRules]:
        """Lookup active rule by code (e.g. IN, US, SG)."""
        stmt = select(self.model).where(
            self.model.country_code == country_code,
            self.model.is_active == True
        )
        result = await self.session.execute(stmt)
        return result.scalars().first()
