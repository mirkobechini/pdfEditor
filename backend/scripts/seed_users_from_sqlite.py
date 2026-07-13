#!/usr/bin/env python3
"""
One-shot script: migrate users (and their PDF documents) from the local SQLite
database to the PostgreSQL database on Render.

Usage:
    # Set DATABASE_URL to the PostgreSQL connection string (Render), then run:
    python scripts/seed_users_from_sqlite.py

    # Dry-run (no writes):
    python scripts/seed_users_from_sqlite.py --dry-run

    # Only migrate PDFs that exist in the storage/pdfs folder:
    python scripts/seed_users_from_sqlite.py --skip-missing-pdfs

WARNING:
    This script OVERWRITES existing users in PostgreSQL if they have the same
    email address. Run with --dry-run first to see what will happen.
"""

import argparse
import os
import sys
import uuid
from datetime import datetime, timezone

# Add backend root to path so we can import app modules
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import MetaData, Table, create_engine, inspect, select, text
from sqlalchemy.orm import sessionmaker

from app.core.config import settings as app_settings

# ── SQLite (source) ──────────────────────────────────────────────────────────

SQLITE_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "pdf_editor.db",
)

# ── Colors for terminal ──────────────────────────────────────────────────────

GREEN = "\033[92m"
YELLOW = "\033[93m"
RED = "\033[91m"
CYAN = "\033[96m"
RESET = "\033[0m"


def info(msg: str) -> None:
    print(f"{CYAN}[INFO]{RESET} {msg}")


def ok(msg: str) -> None:
    print(f"{GREEN}[OK]{RESET} {msg}")


def warn(msg: str) -> None:
    print(f"{YELLOW}[WARN]{RESET} {msg}")


def err(msg: str) -> None:
    print(f"{RED}[ERROR]{RESET} {msg}")


def get_sqlite_engine():
    """Create engine and connect to local SQLite database."""
    if not os.path.exists(SQLITE_PATH):
        err(f"SQLite database not found at: {SQLITE_PATH}")
        info("Run the backend locally first to create the database.")
        sys.exit(1)

    engine = create_engine(f"sqlite:///{SQLITE_PATH}")
    return engine


def get_pg_engine():
    """Create engine for PostgreSQL (from DATABASE_URL env var or app settings)."""
    db_url = os.environ.get("DATABASE_URL") or app_settings.DATABASE_URL
    if "postgresql" not in db_url:
        err(f"DATABASE_URL does not point to PostgreSQL: {db_url[:50]}...")
        info("Set DATABASE_URL environment variable to your Render PostgreSQL connection string.")
        sys.exit(1)

    # Ensure psycopg v3 dialect
    if "postgresql://" in db_url and "+psycopg" not in db_url:
        db_url = db_url.replace("postgresql://", "postgresql+psycopg://", 1)

    engine = create_engine(db_url, pool_pre_ping=True)
    return engine


def get_users_from_sqlite(sqlite_engine) -> list[dict]:
    """Read all users from SQLite."""
    inspector = inspect(sqlite_engine)
    if "users" not in inspector.get_table_names():
        err("No 'users' table found in SQLite database.")
        return []

    metadata = MetaData()
    users_table = Table("users", metadata, autoload_with=sqlite_engine)

    with sqlite_engine.connect() as conn:
        rows = conn.execute(select(users_table)).fetchall()
        columns = [c.name for c in users_table.columns]
        users = [dict(zip(columns, row)) for row in rows]

    info(f"Found {len(users)} user(s) in SQLite.")
    for u in users:
        print(f"  - {u['email']:40s} | admin={u['is_admin']} | tier={u['license_tier']}")

    return users


def get_pdfs_from_sqlite(sqlite_engine) -> list[dict]:
    """Read all PDF documents from SQLite."""
    inspector = inspect(sqlite_engine)
    if "pdf_documents" not in inspector.get_table_names():
        info("No 'pdf_documents' table found in SQLite. Skipping PDF migration.")
        return []

    metadata = MetaData()
    pdfs_table = Table("pdf_documents", metadata, autoload_with=sqlite_engine)

    with sqlite_engine.connect() as conn:
        rows = conn.execute(select(pdfs_table)).fetchall()
        columns = [c.name for c in pdfs_table.columns]
        pdfs = [dict(zip(columns, row)) for row in rows]

    info(f"Found {len(pdfs)} PDF document(s) in SQLite.")
    return pdfs


def get_pg_user_ids(pg_engine) -> set[str]:
    """Get all user emails already in PostgreSQL."""
    with pg_engine.connect() as conn:
        result = conn.execute(text("SELECT email FROM users"))
        return {row[0] for row in result.fetchall()}


def seed_users(users: list[dict], pg_engine, dry_run: bool = False) -> int:
    """Insert/update users into PostgreSQL. Returns count of inserted/updated users."""
    if not users:
        info("No users to migrate.")
        return 0

    existing_emails = get_pg_user_ids(pg_engine)
    info(f"PostgreSQL already has {len(existing_emails)} user(s).")

    count = 0
    Session = sessionmaker(bind=pg_engine)

    for user_data in users:
        email = user_data["email"]
        action = "UPDATE" if email in existing_emails else "INSERT"

        if dry_run:
            warn(f"[DRY-RUN] Would {action}: {email}")
            count += 1
            continue

        # Ensure UUID is a string (SQLite might return it as UUID object)
        user_id = str(user_data["id"]) if user_data["id"] else str(uuid.uuid4())
        created_at = user_data.get("created_at") or datetime.now(timezone.utc)
        updated_at = user_data.get("updated_at") or datetime.now(timezone.utc)

        # Convert to timezone-naive for PostgreSQL compatibility
        if hasattr(created_at, "tzinfo") and created_at.tzinfo is not None:
            created_at = created_at.replace(tzinfo=None)
        if hasattr(updated_at, "tzinfo") and updated_at.tzinfo is not None:
            updated_at = updated_at.replace(tzinfo=None)

        session = Session()
        try:
            if email in existing_emails:
                # Update existing user
                session.execute(
                    text("""
                        UPDATE users SET
                            hashed_password = :password,
                            full_name = :full_name,
                            is_active = :is_active,
                            is_admin = :is_admin,
                            license_tier = :license_tier,
                            license_tier_source = :license_tier_source,
                            google_id = :google_id,
                            updated_at = :updated_at
                        WHERE email = :email
                    """),
                    {
                        "password": user_data["hashed_password"],
                        "full_name": user_data["full_name"],
                        "is_active": bool(user_data["is_active"]),
                        "is_admin": bool(user_data["is_admin"]),
                        "license_tier": user_data.get("license_tier", "free"),
                        "license_tier_source": user_data.get("license_tier_source", "admin"),
                        "google_id": user_data.get("google_id"),
                        "updated_at": updated_at,
                        "email": email,
                    },
                )
                ok(f"UPDATED: {email}")
            else:
                # Insert new user
                session.execute(
                    text("""
                        INSERT INTO users (
                            id, email, hashed_password, full_name,
                            is_active, is_admin, license_tier, license_tier_source,
                            google_id, created_at, updated_at
                        ) VALUES (
                            :id, :email, :password, :full_name,
                            :is_active, :is_admin, :license_tier, :license_tier_source,
                            :google_id, :created_at, :updated_at
                        )
                    """),
                    {
                        "id": user_id,
                        "email": email,
                        "password": user_data["hashed_password"],
                        "full_name": user_data["full_name"],
                        "is_active": bool(user_data["is_active"]),
                        "is_admin": bool(user_data["is_admin"]),
                        "license_tier": user_data.get("license_tier", "free"),
                        "license_tier_source": user_data.get("license_tier_source", "admin"),
                        "google_id": user_data.get("google_id"),
                        "created_at": created_at,
                        "updated_at": updated_at,
                    },
                )
                ok(f"INSERTED: {email}")

            session.commit()
            count += 1
        except Exception as e:
            session.rollback()
            err(f"Failed to migrate {email}: {e}")
        finally:
            session.close()

    return count


def seed_pdfs(pdfs: list[dict], pg_engine, user_email_map: dict, dry_run: bool = False, skip_missing: bool = False) -> int:
    """Insert PDF documents into PostgreSQL. Returns count of inserted PDFs."""
    if not pdfs:
        return 0

    storage_dir = app_settings.UPLOAD_DIR
    count = 0
    Session = sessionmaker(bind=pg_engine)

    for pdf_data in pdfs:
        pdf_id = str(pdf_data["id"]) if pdf_data["id"] else str(uuid.uuid4())

        # Check if the storage file exists
        storage_filename = pdf_data.get("storage_filename", "")
        if storage_filename:
            file_path = os.path.join(storage_dir, storage_filename)
            if not os.path.exists(file_path):
                msg = f"Storage file missing: {storage_filename} (PDF {pdf_data.get('original_filename', 'unknown')})"
                if skip_missing:
                    warn(f"SKIPPING (missing file): {pdf_data.get('original_filename', 'unknown')}")
                    continue
                else:
                    warn(msg)

        created_at = pdf_data.get("created_at") or datetime.now(timezone.utc)
        updated_at = pdf_data.get("updated_at") or datetime.now(timezone.utc)
        if hasattr(created_at, "tzinfo") and created_at.tzinfo is not None:
            created_at = created_at.replace(tzinfo=None)
        if hasattr(updated_at, "tzinfo") and updated_at.tzinfo is not None:
            updated_at = updated_at.replace(tzinfo=None)

        if dry_run:
            warn(f"[DRY-RUN] Would INSERT PDF: {pdf_data.get('original_filename', 'unknown')} (user_id={pdf_data.get('user_id', '?')})")
            count += 1
            continue

        session = Session()
        try:
            session.execute(
                text("""
                    INSERT INTO pdf_documents (
                        id, user_id, original_filename, storage_filename,
                        file_size, page_count, title, author,
                        is_password_protected, created_at, updated_at
                    ) VALUES (
                        :id, :user_id, :original_filename, :storage_filename,
                        :file_size, :page_count, :title, :author,
                        :is_password_protected, :created_at, :updated_at
                    )
                    ON CONFLICT (id) DO UPDATE SET
                        updated_at = :updated_at
                """),
                {
                    "id": pdf_id,
                    "user_id": str(pdf_data["user_id"]),
                    "original_filename": pdf_data["original_filename"],
                    "storage_filename": pdf_data["storage_filename"],
                    "file_size": pdf_data["file_size"],
                    "page_count": pdf_data.get("page_count", 0),
                    "title": pdf_data.get("title"),
                    "author": pdf_data.get("author"),
                    "is_password_protected": bool(pdf_data.get("is_password_protected", False)),
                    "created_at": created_at,
                    "updated_at": updated_at,
                },
            )
            session.commit()
            ok(f"PDF: {pdf_data.get('original_filename', 'unknown')}")
            count += 1
        except Exception as e:
            session.rollback()
            err(f"Failed to migrate PDF {pdf_data.get('original_filename', 'unknown')}: {e}")
        finally:
            session.close()

    return count


def main():
    parser = argparse.ArgumentParser(
        description="Migrate users and PDFs from SQLite to PostgreSQL",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be done without making changes",
    )
    parser.add_argument(
        "--skip-pdfs",
        action="store_true",
        help="Skip PDF document migration (users only)",
    )
    parser.add_argument(
        "--skip-missing-pdfs",
        action="store_true",
        help="Skip PDFs whose storage file is missing instead of warning",
    )
    args = parser.parse_args()

    print("=" * 60)
    print("  SQLite → PostgreSQL User/PDF Migration")
    print("=" * 60)

    if args.dry_run:
        warn("DRY-RUN MODE: No changes will be made.\n")

    # ── Step 1: Connect to SQLite ──
    print("\n── Step 1: Connecting to SQLite ──")
    sqlite_engine = get_sqlite_engine()
    ok("Connected to SQLite.")

    # ── Step 2: Read users ──
    print("\n── Step 2: Reading users from SQLite ──")
    users = get_users_from_sqlite(sqlite_engine)

    # ── Step 3: Connect to PostgreSQL ──
    print("\n── Step 3: Connecting to PostgreSQL ──")
    db_url = os.environ.get("DATABASE_URL") or app_settings.DATABASE_URL
    info(f"Using DATABASE_URL: {db_url[:50]}...")
    pg_engine = get_pg_engine()
    ok("Connected to PostgreSQL.")

    # ── Step 4: Migrate users ──
    print("\n── Step 4: Migrating users ──")
    migrated = seed_users(users, pg_engine, dry_run=args.dry_run)
    info(f"Migrated {migrated} user(s).")

    # ── Step 5: Migrate PDFs ──
    if not args.skip_pdfs:
        print("\n── Step 5: Migrating PDF documents ──")
        pdfs = get_pdfs_from_sqlite(sqlite_engine)
        migrated_pdfs = seed_pdfs(pdfs, pg_engine, {}, dry_run=args.dry_run, skip_missing=args.skip_missing_pdfs)
        info(f"Migrated {migrated_pdfs} PDF(s).")
    else:
        info("Skipping PDF migration (--skip-pdfs).")

    # ── Summary ──
    print("\n" + "=" * 60)
    if args.dry_run:
        warn("DRY-RUN completed. No changes were made.")
    else:
        ok(f"Migration completed: {migrated} user(s) migrated.")
        if not args.skip_pdfs:
            info(f"  PDFs: {migrated_pdfs if not args.skip_pdfs else 'skipped'}")
        print()
        info("Next steps:")
        info("  1. Verify on Render: login with your existing email/password")
        info("  2. If Google OAuth is configured, login with Google")
        info("  3. Check that your PDFs appear in the sidebar")
    print("=" * 60)


if __name__ == "__main__":
    main()