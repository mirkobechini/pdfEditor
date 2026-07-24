"""
Entry point for PyInstaller-bundled FastAPI backend.

This script is NOT used in development — only in the Tauri desktop app
where the backend runs as a sidecar process.
"""
import os
import sys
import uvicorn


def main():
    # Ensure we're in the right directory for relative paths (SQLite, storage)
    os.chdir(os.path.dirname(os.path.abspath(__file__)))

    port = int(os.environ.get("SIDECAR_PORT", "7723"))
    host = os.environ.get("SIDECAR_HOST", "127.0.0.1")

    sys.argv = ["uvicorn", "app.main:app", "--host", host, "--port", str(port), "--log-level", "info"]

    uvicorn.run(
        "app.main:app",
        host=host,
        port=port,
        log_level="info",
    )


if __name__ == "__main__":
    main()