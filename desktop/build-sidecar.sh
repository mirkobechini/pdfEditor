#!/bin/bash
# Build script: FastAPI backend sidecar (macOS / Linux)
# Run from the repository root.
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"
ENTRY_POINT="$PROJECT_ROOT/desktop/run_backend.py"
OUTPUT_DIR="$PROJECT_ROOT/desktop/src-tauri/binaries"
REQUIREMENTS="$BACKEND_DIR/requirements.txt"

mkdir -p "$OUTPUT_DIR"

echo "=== Building FastAPI sidecar (macOS/Linux) ==="
echo "Entry point: $ENTRY_POINT"
echo "Output: $OUTPUT_DIR"

# Detect Python
PYTHON="python3"
if [ -f "$BACKEND_DIR/.venv/bin/python" ]; then
    PYTHON="$BACKEND_DIR/.venv/bin/python"
    echo "Using venv Python: $PYTHON"
elif command -v python3 &>/dev/null; then
    PYTHON="$(command -v python3)"
elif command -v python &>/dev/null; then
    PYTHON="$(command -v python)"
else
    echo "ERROR: Python not found."
    exit 1
fi

# Install PyInstaller if missing
$PYTHON -m pip install pyinstaller --quiet

# Build with PyInstaller
echo "Running PyInstaller..."
$PYTHON -m PyInstaller \
    --name "fastapi-sidecar" \
    --onefile \
    --workpath "$PROJECT_ROOT/desktop/build-sidecar-tmp" \
    --specpath "$PROJECT_ROOT/desktop" \
    --distpath "$OUTPUT_DIR" \
    --hidden-import "fitz" \
    --hidden-import "uvicorn.logging" \
    --hidden-import "uvicorn.loops.auto" \
    --hidden-import "uvicorn.protocols.http.auto" \
    --hidden-import "app.core.config" \
    --hidden-import "app.core.database" \
    --hidden-import "app.core.limiter" \
    --hidden-import "app.core.csrf" \
    --hidden-import "app.core.license_seed" \
    --hidden-import "app.models" \
    --hidden-import "app.repositories" \
    --hidden-import "app.services" \
    --hidden-import "app.api.v1" \
    --hidden-import "slowapi" \
    --hidden-import "bcrypt" \
    --hidden-import "aiofiles" \
    --hidden-import "pydantic" \
    --hidden-import "pydantic_settings" \
    --hidden-import "sqlalchemy" \
    --hidden-import "alembic" \
    --hidden-import "boto3" \
    --hidden-import "google.auth" \
    --hidden-import "requests" \
    --hidden-import "psycopg" \
    --collect-all "fitz" \
    --collect-all "app" \
    --add-data "$BACKEND_DIR/app/*:app/" \
    --add-data "$BACKEND_DIR/alembic.ini:." \
    --add-data "$BACKEND_DIR/alembic/:alembic/" \
    --add-data "$BACKEND_DIR/storage/pdfs/:storage/pdfs/" \
    --add-data "$BACKEND_DIR/storage/snapshots/:storage/snapshots/" \
    --runtime-tmpdir "." \
    "$ENTRY_POINT"

# Clean up temp build files
rm -rf "$PROJECT_ROOT/desktop/build-sidecar-tmp" "$PROJECT_ROOT/desktop/fastapi-sidecar.spec"

echo "=== Build complete! ==="
echo "Binary: $OUTPUT_DIR/fastapi-sidecar"