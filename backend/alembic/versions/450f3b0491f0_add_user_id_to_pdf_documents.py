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
    # SQLite doesn't support ALTER COLUMN, so use batch_alter_table
    with op.batch_alter_table('pdf_documents') as batch_op:
        batch_op.add_column(sa.Column('user_id', sa.String(length=36), nullable=True))

    op.execute("UPDATE pdf_documents SET user_id = '00000000-0000-0000-0000-000000000000' WHERE user_id IS NULL")

    with op.batch_alter_table('pdf_documents') as batch_op:
        batch_op.alter_column('user_id', nullable=False)
        batch_op.create_index('ix_pdf_documents_user_id', ['user_id'])
        batch_op.create_foreign_key('fk_pdf_documents_user_id', 'users', ['user_id'], ['id'])


def downgrade() -> None:
    with op.batch_alter_table('pdf_documents') as batch_op:
        batch_op.drop_constraint('fk_pdf_documents_user_id', type_='foreignkey')
        batch_op.drop_index('ix_pdf_documents_user_id')
        batch_op.drop_column('user_id')
