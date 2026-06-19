"""add_valid_currencies_to_country_rules

Revision ID: add_valid_currencies
Revises: 905b5998cf48
Create Date: 2026-06-19
"""
from alembic import op

revision = 'add_valid_currencies'
down_revision = '905b5998cf48'
branch_labels = None
depends_on = None


def upgrade():
    op.execute("""
        ALTER TABLE country_rules
        ADD COLUMN IF NOT EXISTS valid_currencies JSONB
    """)


def downgrade():
    op.execute("""
        ALTER TABLE country_rules
        DROP COLUMN IF EXISTS valid_currencies
    """)
