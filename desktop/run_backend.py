"""
Entry point for PyInstaller-bundled FastAPI backend.

This script is NOT used in development — only in the Tauri desktop app
where the backend runs as a sidecar process.
"""
import os
import sys
import shutil


def _get_base_path() -> str:
    """Return the base path where app data is extracted (PyInstaller temp dir)."""
    if hasattr(sys, "_MEIPASS"):
        return sys._MEIPASS
    return os.path.dirname(os.path.abspath(__file__))


def _get_app_data_dir() -> str:
    """Return the persistent app data directory (survives reinstalls)."""
    if sys.platform == "win32":
        base = os.environ.get("APPDATA", os.path.expanduser("~"))
        return os.path.join(base, "PdfEditor")
    return os.path.join(os.path.expanduser("~"), ".local", "share", "PdfEditor")


def _ensure_app_dirs():
    """Create persistent data directories and set env vars BEFORE Settings import.
    
    This ensures the SQLite database and PDF storage survive reinstalls.
    """
    data_dir = _get_app_data_dir()
    os.makedirs(data_dir, exist_ok=True)
    os.makedirs(os.path.join(data_dir, "storage", "pdfs"), exist_ok=True)
    os.makedirs(os.path.join(data_dir, "storage", "snapshots"), exist_ok=True)
    
    # Set env vars before Settings is imported (override .env defaults)
    # This ensures the app data dir is used even if .env.desktop has a relative path
    db_path = os.path.join(data_dir, "pdfeditor.db").replace(os.sep, "/")
    os.environ["DATABASE_URL"] = f"sqlite:///{db_path}"
    os.environ["UPLOAD_DIR"] = os.path.join(data_dir, "storage", "pdfs")
    
    print(f"[sidecar] App data dir: {data_dir}")
    print(f"[sidecar] Database: {db_path}")
    print(f"[sidecar] Storage: {os.environ.get('UPLOAD_DIR')}")


def _ensure_env():
    """Seed .env from bundled default if not present.
    Must run BEFORE any app imports because Settings reads .env at import time."""
    base_path = _get_base_path()
    bundled_env = os.path.join(base_path, ".env.desktop")
    target_env = os.path.join(os.getcwd(), ".env")
    print(f"[sidecar] Base path: {base_path}")
    print(f"[sidecar] Bundled env: {bundled_env} exists={os.path.exists(bundled_env)}")
    print(f"[sidecar] Target env: {target_env} exists={os.path.exists(target_env)}")
    if not os.path.exists(target_env) and os.path.exists(bundled_env):
        shutil.copy2(bundled_env, target_env)
        print(f"[sidecar] Created default .env from .env.desktop")
    elif os.path.exists(target_env):
        print(f"[sidecar] Using existing .env")


# Ensure .env exists and data dirs are set before any app imports
_ensure_env()
_ensure_app_dirs()

import uvicorn  # noqa: E402

# Force PyInstaller to trace all dependencies of the app package.
# Without this, string-based imports (uvicorn.run("app.main:app")) are invisible.
import app.main  # noqa: F401, E402
import app.core.config  # noqa: F401, E402
import app.core.database  # noqa: F401, E402
import app.core.csrf  # noqa: F401, E402
import app.core.limiter  # noqa: F401, E402
import app.core.license_seed  # noqa: F401, E402
import app.models  # noqa: F401, E402
import app.repositories  # noqa: F401, E402
import app.services  # noqa: F401, E402
import app.api.v1  # noqa: F401, E402


def main():
    base_path = _get_base_path()
    os.chdir(base_path)
    # Ensure the base path (where app/ package lives) is on sys.path
    if base_path not in sys.path:
        sys.path.insert(0, base_path)

    port = int(os.environ.get("SIDECAR_PORT", "7723"))
    host = os.environ.get("SIDECAR_HOST", "127.0.0.1")

    print(f"[sidecar] Starting on {host}:{port}")
    print(f"[sidecar] CORS origins: {os.environ.get('ALLOWED_ORIGINS', 'default')}")
    print(f"[sidecar] Google client ID configured: {bool(os.environ.get('NEXT_PUBLIC_GOOGLE_CLIENT_ID'))}")

    uvicorn.run(
        "app.main:app",
        host=host,
        port=port,
        log_level="info",
    )


if __name__ == "__main__":
    main()