"""
CLI tool for development administration tasks.

WARNING: This tool is intended for DEVELOPMENT ONLY.
It is NOT included in production builds (Tauri/PyInstaller bundle).
In production, admin promotion is done exclusively via the API
by existing admin users.

Usage:
    # Promote a user to admin
    python cli.py make-admin <email>

    # Revoke admin from a user
    python cli.py make-admin <email> --remove

    # List all users
    python cli.py list-users
"""

import argparse
import sys

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.core.database import Base
from app.core.config import settings
from app.repositories.user_repo import UserRepository


def get_db_session():
    """Create a new database session using the configured database URL."""
    engine = create_engine(
        settings.DATABASE_URL,
        connect_args={"check_same_thread": False},
    )
    # Ensure all tables exist
    Base.metadata.create_all(bind=engine)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    return SessionLocal()


def make_admin(email: str, remove: bool = False):
    """Promote or demote a user to/from admin."""
    db = get_db_session()
    try:
        repo = UserRepository(db)
        user = repo.get_by_email(email)
        if not user:
            print(f"❌ User with email '{email}' not found.")
            sys.exit(1)

        if remove:
            if user.email == settings.SUPER_ADMIN_EMAIL:
                print(f"❌ Cannot revoke super admin privileges from '{email}'.")
                sys.exit(1)
            if not user.is_admin:
                print(f"ℹ️  User '{email}' is already not an admin.")
                return
            user.is_admin = False
            db.flush()
            db.refresh(user)
            print(f"✅ Admin privileges revoked from '{email}'.")
        else:
            if user.is_admin:
                print(f"ℹ️  User '{email}' is already an admin.")
                return
            user.is_admin = True
            db.flush()
            db.refresh(user)
            print(f"✅ User '{email}' is now an admin.")

        print(f"   (You may need to log out and log in again for changes to take effect.)")
    finally:
        db.close()


def list_users():
    """List all registered users."""
    db = get_db_session()
    try:
        repo = UserRepository(db)
        users = repo.get_all_users(limit=9999)
        if not users:
            print("No users found.")
            return

        print(f"\n{'Email':<35} {'Name':<20} {'Admin':<8} {'Tier':<12} {'Created'}")
        print("-" * 90)
        for u in users:
            admin_str = "✓" if u.is_admin else "—"
            created = u.created_at.strftime("%Y-%m-%d") if u.created_at else "—"
            print(f"{u.email:<35} {u.full_name:<20} {admin_str:<8} {u.license_tier:<12} {created}")
        print()
    finally:
        db.close()


def main():
    parser = argparse.ArgumentParser(
        description="PdfEditor development CLI",
        epilog="WARNING: For development use only. Not included in production builds.",
    )
    subparsers = parser.add_subparsers(dest="command", help="Available commands")

    # make-admin
    admin_parser = subparsers.add_parser("make-admin", help="Promote/revoke admin privileges")
    admin_parser.add_argument("email", help="User email address")
    admin_parser.add_argument(
        "--remove",
        action="store_true",
        help="Revoke admin privileges instead of granting",
    )

    # list-users
    subparsers.add_parser("list-users", help="List all registered users")

    args = parser.parse_args()

    if args.command == "make-admin":
        make_admin(args.email, args.remove)
    elif args.command == "list-users":
        list_users()
    else:
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()