"""add user_id to pdf_documents

Revision ID: 450f3b0491f0
Revises: 5eec22a141a3
Create Date: 2026-06-26 22:39:59.905186
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '450f3b0491f0'
down_revision: Union[str, None] = '5eec22a141a3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # SQLite cannot add a NOT NULL column directly. Steps:
    # 1. Add as nullable
    # 2. Give existing rows a default user_id placeholder
    # 3. Make it NOT NULL
    op.add_column('pdf_documents', sa.Column('user_id', sa.String(length=36), nullable=True))
    op.execute("UPDATE pdf_documents SET user_id = '00000000-0000-0000-0000-000000000000' WHERE user_id IS NULL")
    op.alter_column('pdf_documents', 'user_id', nullable=False)
    op.create_index(op.f('ix_pdf_documents_user_id'), 'pdf_documents', ['user_id'], unique=False)
    op.create_foreign_key('fk_pdf_documents_user_id', 'pdf_documents', 'users', ['user_id'], ['id'])


def downgrade() -> None:
    op.drop_constraint('fk_pdf_documents_user_id', 'pdf_documents', type_='foreignkey')
    op.drop_index(op.f('ix_pdf_documents_user_id'), table_name='pdf_documents')
    op.drop_column('pdf_documents', 'user_id')
