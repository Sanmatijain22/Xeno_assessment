"""add_valid_currencies_to_country_rules

Revision ID: add_valid_currencies
Revises: 905b5998cf48
Create Date: 2026-06-19
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy import inspect

revision = 'add_valid_currencies'
down_revision = '905b5998cf48'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    inspector = inspect(conn)
    columns = [col['name'] for col in inspector.get_columns('country_rules')]
    if 'valid_currencies' not in columns:
        op.add_column('country_rules',
            sa.Column('valid_currencies', postgresql.JSONB(), nullable=True))


def downgrade() -> None:
    op.drop_column('country_rules', 'valid_currencies')
