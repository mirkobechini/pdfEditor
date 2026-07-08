"""add is_password_protected to pdf_documents

Revision ID: 6c82d728bff3
Revises: 450f3b0491f0
Create Date: 2026-06-27 14:17:42.569646
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6c82d728bff3'
down_revision: Union[str, None] = '450f3b0491f0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('pdf_documents') as batch_op:
        batch_op.add_column(sa.Column('is_password_protected', sa.Boolean(), nullable=False, server_default=sa.text('0')))


def downgrade() -> None:
    with op.batch_alter_table('pdf_documents') as batch_op:
        batch_op.drop_column('is_password_protected')
