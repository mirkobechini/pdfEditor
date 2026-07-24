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


def _ensure_env():
    """Seed .env from bundled default if not present.
    Must run BEFORE any app imports because Settings reads .env at import time."""
    base_path = _get_base_path()
    bundled_env = os.path.join(base_path, ".env.desktop")
    target_env = os.path.join(os.getcwd(), ".env")
    if not os.path.exists(target_env) and os.path.exists(bundled_env):
        shutil.copy2(bundled_env, target_env)
        print(f"[sidecar] Created default .env")


# Ensure .env exists before any app imports
_ensure_env()

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

    uvicorn.run(
        "app.main:app",
        host=host,
        port=port,
        log_level="info",
    )


if __name__ == "__main__":
    main()