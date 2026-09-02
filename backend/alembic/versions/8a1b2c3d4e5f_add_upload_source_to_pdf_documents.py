"""add upload_source to pdf_documents

Revision ID: 8a1b2c3d4e5f
Revises: b069b95ef6e9
Create Date: 2026-08-21 22:35:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8a1b2c3d4e5f'
down_revision: Union[str, None] = 'b069b95ef6e9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('pdf_documents', sa.Column('upload_source', sa.String(length=20), nullable=False, server_default='web'))


def downgrade() -> None:
    op.drop_column('pdf_documents', 'upload_source')
