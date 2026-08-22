"""add password_cache table

Revision ID: 9a1b2c3d4e5f
Revises: 8a1b2c3d4e5f
Create Date: 2026-08-22 16:45:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9a1b2c3d4e5f'
down_revision: Union[str, None] = '8a1b2c3d4e5f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('password_cache',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('pdf_id', sa.String(length=36), nullable=False),
        sa.Column('password', sa.String(length=255), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['pdf_id'], ['pdf_documents.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('pdf_id'),
    )
    op.create_index('ix_password_cache_pdf_id', 'password_cache', ['pdf_id'])


def downgrade() -> None:
    op.drop_index('ix_password_cache_pdf_id', table_name='password_cache')
    op.drop_table('password_cache')
