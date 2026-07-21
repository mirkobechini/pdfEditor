"""add report_count to bug_reports

Revision ID: 6b1f5a3e8c9d
Revises: 38a24e3207a2
Create Date: 2026-07-21 16:45:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6b1f5a3e8c9d'
down_revision: Union[str, None] = '38a24e3207a2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('bug_reports', sa.Column('report_count', sa.Integer(),
                  nullable=False, server_default=sa.text('1')))


def downgrade() -> None:
    op.drop_column('bug_reports', 'report_count')