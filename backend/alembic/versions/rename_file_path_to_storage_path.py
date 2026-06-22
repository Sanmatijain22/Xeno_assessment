"""rename_file_path_to_storage_path

Revision ID: rename_file_path_to_storage_path
Revises: a3f1c88d92bb
Create Date: 2026-06-19 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'rename_file_path_to_storage_path'
down_revision: Union[str, Sequence[str], None] = '94391cd3ad69'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Rename file_path to storage_path in uploaded_files table
    op.alter_column('uploaded_files', 'file_path', new_column_name='storage_path')


def downgrade() -> None:
    """Downgrade schema."""
    # Rename storage_path back to file_path
    op.alter_column('uploaded_files', 'storage_path', new_column_name='file_path')
