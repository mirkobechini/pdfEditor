# Build script: FastAPI backend sidecar (Windows)
# Run from the repository root.
# Requires: Python, PyInstaller, and the backend/ virtual environment.

$ErrorActionPreference = "Stop"

$ProjectRoot = Resolve-Path "$PSScriptRoot\.."
$BackendDir = Join-Path $ProjectRoot "backend"
$EntryPoint = Join-Path $ProjectRoot "desktop\run_backend.py"
$OutputDir = Join-Path $ProjectRoot "desktop\src-tauri\binaries"
$Requirements = Join-Path $BackendDir "requirements.txt"

# Ensure output directory exists
New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null

Write-Host "=== Building FastAPI sidecar (Windows) ===" -ForegroundColor Cyan
Write-Host "Entry point: $EntryPoint"
Write-Host "Output: $OutputDir"

# Detect Python interpreter
$Python = "python"
if (Test-Path "$BackendDir\.venv\Scripts\python.exe") {
    $Python = "$BackendDir\.venv\Scripts\python.exe"
    Write-Host "Using venv Python: $Python"
} elseif (Get-Command "python" -ErrorAction SilentlyContinue) {
    $Python = (Get-Command "python").Source
} else {
    Write-Error "Python not found. Install Python 3.10+ and try again."
    exit 1
}

# Install PyInstaller if missing
& $Python -m pip install pyinstaller 2>&1 | Out-Null

# Build with PyInstaller
Write-Host "Running PyInstaller..." -ForegroundColor Yellow
& $Python -m PyInstaller `
    --name "fastapi-sidecar" `
    --onefile `
    --workpath "$ProjectRoot\desktop\build-sidecar-tmp" `
    --specpath "$ProjectRoot\desktop" `
    --distpath $OutputDir `
    --hidden-import "fitz" `
    --hidden-import "uvicorn.logging" `
    --hidden-import "uvicorn.loops.auto" `
    --hidden-import "uvicorn.protocols.http.auto" `
    --hidden-import "app.core.config" `
    --hidden-import "app.core.database" `
    --hidden-import "app.core.limiter" `
    --hidden-import "app.core.csrf" `
    --hidden-import "app.core.license_seed" `
    --hidden-import "app.models" `
    --hidden-import "app.repositories" `
    --hidden-import "app.services" `
    --hidden-import "app.api.v1" `
    --hidden-import "slowapi" `
    --hidden-import "bcrypt" `
    --hidden-import "aiofiles" `
    --hidden-import "pydantic" `
    --hidden-import "pydantic_settings" `
    --hidden-import "sqlalchemy" `
    --hidden-import "alembic" `
    --hidden-import "boto3" `
    --hidden-import "google.auth" `
    --hidden-import "requests" `
    --hidden-import "psycopg" `
    --collect-all "fitz" `
    --collect-all "app" `
    --add-data "$BackendDir\app\*;app\" `
    --add-data "$BackendDir\alembic.ini;." `
    --add-data "$BackendDir\alembic\;alembic\" `
    --add-data "$BackendDir\storage\pdfs\;storage\pdfs\" `
    --add-data "$BackendDir\storage\snapshots\;storage\snapshots\" `
    --runtime-tmpdir "." `
    $EntryPoint

# Clean up temp build files
if (Test-Path "$ProjectRoot\desktop\build-sidecar-tmp") {
    Remove-Item -Recurse -Force "$ProjectRoot\desktop\build-sidecar-tmp"
}
if (Test-Path "$ProjectRoot\desktop\fastapi-sidecar.spec") {
    Remove-Item -Force "$ProjectRoot\desktop\fastapi-sidecar.spec"
}

Write-Host "=== Build complete! ===" -ForegroundColor Green
Write-Host "Binary: $OutputDir\fastapi-sidecar.exe"