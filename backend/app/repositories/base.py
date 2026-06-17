from typing import Generic, TypeVar, Type, Optional, Sequence
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.database import Base

ModelT = TypeVar("ModelT", bound=Base)

class BaseRepository(Generic[ModelT]):
    """Generic CRUD operations repository wrapper."""
    def __init__(self, session: AsyncSession, model: Type[ModelT]):
        self.session = session
        self.model = model

    async def get_by_id(self, id_val) -> Optional[ModelT]:
        """Fetch singular database entity by key."""
        return await self.session.get(self.model, id_val)

    async def get_all(self) -> Sequence[ModelT]:
        """Query entire rows list for this entity."""
        stmt = select(self.model)
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def create(self, entity: ModelT) -> ModelT:
        """Persist new model row."""
        self.session.add(entity)
        await self.session.flush()
        return entity

    async def delete(self, entity: ModelT) -> None:
        """Purge model row."""
        await self.session.delete(entity)
        await self.session.flush()
