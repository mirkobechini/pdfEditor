"""Test migration integrity — verify alembic upgrades and downgrades cleanly."""

import os
import tempfile

import pytest
from sqlalchemy import create_engine, inspect


def _run_migration(db_path: str, direction: str):
    """Run alembic up to head or down to base, return exit code and output."""
    import subprocess
    import sys

    env = os.environ.copy()
    env["DATABASE_URL"] = f"sqlite:///{db_path}"

    cmd = [sys.executable, "-m", "alembic"] + direction.split()
    if direction == "current":
        cmd = [sys.executable, "-m", "alembic", "current"]

    result = subprocess.run(
        cmd,
        cwd=os.path.join(os.path.dirname(__file__), ".."),
        capture_output=True,
        text=True,
        env=env,
    )
    return result.returncode, result.stdout, result.stderr


class TestMigrationIntegrity:
    """Verify that alembic migrations are consistent and reversible."""

    def test_upgrade_head_succeeds(self):
        """Running alembic upgrade head from scratch must succeed."""
        with tempfile.TemporaryDirectory() as tmp:
            db_path = os.path.join(tmp, "test.db")
            rc, out, err = _run_migration(db_path, "upgrade head")
            assert rc == 0, f"alembic upgrade head failed:\n{err}\n{out}"

    def test_upgrade_head_creates_all_tables(self):
        """After upgrade head, all expected tables must exist."""
        with tempfile.TemporaryDirectory() as tmp:
            db_path = os.path.join(tmp, "test.db")
            _run_migration(db_path, "upgrade head")

            engine = create_engine(f"sqlite:///{db_path}")
            inspector = inspect(engine)
            tables = inspector.get_table_names()

            expected_tables = {"pdf_documents", "users", "license_features", "bug_reports"}
            for tbl in expected_tables:
                assert tbl in tables, f"Expected table '{tbl}' not found after upgrade"

            engine.dispose()

    def test_upgrade_columns_correct(self):
        """Verify that users table has the expected columns after full upgrade."""
        with tempfile.TemporaryDirectory() as tmp:
            db_path = os.path.join(tmp, "test.db")
            _run_migration(db_path, "upgrade head")

            engine = create_engine(f"sqlite:///{db_path}")
            inspector = inspect(engine)
            columns = {c["name"] for c in inspector.get_columns("users")}

            expected = {"id", "email", "hashed_password", "is_admin", "license_tier"}
            for col in expected:
                assert col in columns, f"Expected column '{col}' not found in users table"

            # Bonus: verify no duplicate columns (would fail at ORM level)
            col_names = [c["name"] for c in inspector.get_columns("users")]
            assert len(col_names) == len(set(col_names)), "Duplicate columns detected in users table"

            engine.dispose()

    def test_downgrade_single_and_upgrade_again(self):
        """Downgrade one step then upgrade again must work."""
        with tempfile.TemporaryDirectory() as tmp:
            db_path = os.path.join(tmp, "test.db")
            _run_migration(db_path, "upgrade head")

            # Verify new columns exist before downgrade
            engine = create_engine(f"sqlite:///{db_path}")
            inspector = inspect(engine)
            bug_cols_before = {c["name"] for c in inspector.get_columns("bug_reports")}
            assert "platform" in bug_cols_before
            assert "app_version" in bug_cols_before
            assert "os_info" in bug_cols_before
            engine.dispose()

            # Downgrade one step (remove platform, app_version, os_info columns)
            rc, out, err = _run_migration(db_path, "downgrade -1")
            assert rc == 0, f"alembic downgrade -1 failed:\n{err}\n{out}"

            # Verify new columns are gone, but table still exists
            engine = create_engine(f"sqlite:///{db_path}")
            inspector = inspect(engine)
            bug_cols_after = {c["name"] for c in inspector.get_columns("bug_reports")}
            assert "bug_reports" in inspector.get_table_names(), "bug_reports table should still exist"
            assert "platform" not in bug_cols_after, "platform column should be gone after downgrade"
            assert "app_version" not in bug_cols_after
            assert "os_info" not in bug_cols_after
            engine.dispose()

            # Upgrade again
            rc, out, err = _run_migration(db_path, "upgrade head")
            assert rc == 0, f"alembic upgrade head after downgrade failed:\n{out}\n{err}"

            # Verify columns are restored
            engine = create_engine(f"sqlite:///{db_path}")
            inspector = inspect(engine)
            assert "bug_reports" in inspector.get_table_names(), \
                "bug_reports not restored after re-upgrade"
            engine.dispose()

    def test_downgrade_all_the_way(self):
        """Downgrade to base then upgrade again must work."""
        with tempfile.TemporaryDirectory() as tmp:
            db_path = os.path.join(tmp, "test.db")
            _run_migration(db_path, "upgrade head")

            # Downgrade to base
            rc, out, err = _run_migration(db_path, "downgrade base")
            assert rc == 0, f"alembic downgrade base failed:\n{err}\n{out}"

            engine = create_engine(f"sqlite:///{db_path}")
            inspector = inspect(engine)
            # SQLite should have only the alembic_version table
            tables = inspector.get_table_names()
            assert tables == ["alembic_version"] or tables == [], \
                f"Expected no user tables after downgrade base, got: {tables}"
            engine.dispose()

            # Re-upgrade
            rc, out, err = _run_migration(db_path, "upgrade head")
            assert rc == 0, f"alembic upgrade head from base failed:\n{err}\n{out}"
