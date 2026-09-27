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

# ─── Locate tesseract binary + language packs ───────────────────────────────
# The OCR feature needs the tesseract binary. We bundle it inside the sidecar
# so the end user does NOT need to install anything.
TESSERACT_BIN=""
for cand in "$TESSERACT_CMD" "/usr/bin/tesseract" "/usr/local/bin/tesseract" "/opt/homebrew/bin/tesseract"; do
    if [ -n "$cand" ] && [ -f "$cand" ]; then
        TESSERACT_BIN="$cand"
        break
    fi
done
if [ -z "$TESSERACT_BIN" ]; then
    echo "WARNING: tesseract binary not found. OCR will be unavailable in the desktop app."
    echo "Install it (e.g. 'brew install tesseract' or 'apt install tesseract-ocr') and rebuild."
else
    echo "Bundling tesseract: $TESSERACT_BIN"
fi

# Locate tessdata (language packs) next to the binary
TESSDATA_DIR=""
if [ -n "$TESSERACT_BIN" ]; then
    TESSDATA_DIR="$(dirname "$TESSERACT_BIN")/tessdata"
    [ -d "$TESSDATA_DIR" ] || TESSDATA_DIR=""
fi

# Build the PyInstaller args for bundling tesseract
BUNDLE_ARGS=()
if [ -n "$TESSERACT_BIN" ]; then
    BUNDLE_ARGS+=(--add-binary "$TESSERACT_BIN:tesseract")
fi
if [ -n "$TESSDATA_DIR" ]; then
    BUNDLE_ARGS+=(--add-data "$TESSDATA_DIR:tessdata")
fi

# Build with PyInstaller
echo "Running PyInstaller..."
$PYTHON -m PyInstaller \
    --name "fastapi-sidecar" \
    --onefile \
    --noconsole \
    --strip \
    --workpath "$PROJECT_ROOT/desktop/build-sidecar-tmp" \
    --specpath "$PROJECT_ROOT/desktop" \
    --distpath "$OUTPUT_DIR" \
    --paths "$BACKEND_DIR" \
    --hidden-import "fitz" \
    --collect-all "fitz" \
    --hidden-import "uvicorn" \
    --hidden-import "fastapi" \
    --hidden-import "sqlalchemy" \
    --hidden-import "alembic" \
    --hidden-import "pydantic" \
    --hidden-import "pydantic_settings" \
    --hidden-import "slowapi" \
    --hidden-import "google.auth" \
    --hidden-import "docx" \
    --hidden-import "reportlab" \
    --hidden-import "app.main" \
    --hidden-import "app.core.config" \
    --hidden-import "app.core.database" \
    --hidden-import "app.core.csrf" \
    --hidden-import "app.core.limiter" \
    --hidden-import "app.core.license_seed" \
    --hidden-import "app.models" \
    --hidden-import "app.repositories" \
    --hidden-import "app.services" \
    --hidden-import "app.api.v1" \
    --hidden-import "app.core.tesseract" \
    --hidden-import "pytesseract" \
    --hidden-import "PIL" \
    --add-data "$PROJECT_ROOT/desktop/.env.desktop:." \
    "${BUNDLE_ARGS[@]}" \
    "$ENTRY_POINT"

# Clean up temp build files
rm -rf "$PROJECT_ROOT/desktop/build-sidecar-tmp" "$PROJECT_ROOT/desktop/fastapi-sidecar.spec"

echo "=== Build complete! ==="
echo "Binary: $OUTPUT_DIR/fastapi-sidecar"