"""merge_heads

Revision ID: 905b5998cf48
Revises: 5d31b052e9b5, add_enhanced_validation_config
Create Date: 2026-06-19 17:23:26.972100

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '905b5998cf48'
down_revision: Union[str, Sequence[str], None] = ('5d31b052e9b5', 'add_enhanced_validation_config')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
