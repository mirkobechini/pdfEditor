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
}
elseif (Get-Command "python" -ErrorAction SilentlyContinue) {
    $Python = (Get-Command "python").Source
}
else {
    Write-Error "Python not found. Install Python 3.10+ and try again."
    exit 1
}

# Install PyInstaller if missing
& $Python -m pip install pyinstaller 2>&1 | Out-Null

# ─── Locate tesseract binary + language packs ───────────────────────────────
# The OCR feature needs the tesseract binary. We bundle it inside the sidecar
# so the end user does NOT need to install anything.
$TesseractBin = ""
$TesseractCandidates = @(
    $env:TESSERACT_CMD,
    "C:\Program Files\Tesseract-OCR\tesseract.exe",
    "C:\Program Files\UB-Mannheim\Tesseract-OCR\tesseract.exe",
    "$env:LOCALAPPDATA\Programs\Tesseract-OCR\tesseract.exe"
)
foreach ($cand in $TesseractCandidates) {
    if ($cand -and (Test-Path $cand)) {
        $TesseractBin = $cand
        break
    }
}
if (-not $TesseractBin) {
    Write-Host "WARNING: tesseract binary not found. OCR will be unavailable in the desktop app." -ForegroundColor Yellow
    Write-Host "Install it (e.g. 'winget install UB-Mannheim.TesseractOCR') and rebuild." -ForegroundColor Yellow
} else {
    Write-Host "Bundling tesseract: $TesseractBin" -ForegroundColor Cyan
}

# Locate tessdata (language packs). Prefer the system tessdata dir next to the binary.
$TessdataDir = ""
if ($TesseractBin) {
    $TessdataDir = Join-Path (Split-Path $TesseractBin) "tessdata"
    if (-not (Test-Path $TessdataDir)) {
        $TessdataDir = ""
    }
}

# 11/11 (Mirko): ita.traineddata incluso DAL REPO (garantito, indipendente da
# rete/installazione tesseract del runner). Finiva nel bundle come tessdata/ita.
$RepoIta = Join-Path $PSScriptRoot "..\backend\resources\tessdata\ita.traineddata"
if (Test-Path $RepoIta) {
    $BundleArgs += "--add-data"
    $BundleArgs += "$RepoIta;tessdata"
    Write-Host "ita.traineddata incluso dal repo (garantito)" -ForegroundColor Green
} else {
    Write-Host "WARNING: backend/resources/tessdata/ita.traineddata non trovato; OCR italiano non disponibile" -ForegroundColor Yellow
}

# Build the PyInstaller args for bundling tesseract
$BundleArgs = @()
if ($TesseractBin) {
    $BundleArgs += "--add-binary"
    $BundleArgs += "$TesseractBin;tesseract"
}
if ($TessdataDir) {
    $BundleArgs += "--add-data"
    $BundleArgs += "$TessdataDir;tessdata"
}

# 11/11 (Mirko): OCRmyPDF -- bundla ghostscript + qpdf (best-effort, NON fatale).
# Se sul runner mancano, il build continua e l'OCR usa il fallback manuale.
$OcrBin = Join-Path $ProjectRoot "desktop\build-sidecar-ocrbin"
New-Item -ItemType Directory -Force -Path (Join-Path $OcrBin "bin") | Out-Null
$GsExe = $null
$gsCmd = Get-Command gswin64c.exe -ErrorAction SilentlyContinue
if ($gsCmd) { $GsExe = $gsCmd.Source }
if (-not $GsExe) {
    $found = Get-ChildItem "C:\Program Files\gs" -Recurse -Filter "gswin64c.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($found) { $GsExe = $found.FullName }
}
if ($GsExe) {
    Write-Host "Bundling Ghostscript: $GsExe" -ForegroundColor Cyan
    $gsDir = Split-Path $GsExe
    $gsRoot = Split-Path $gsDir -Parent
    Copy-Item $GsExe (Join-Path $OcrBin "bin") -Force
    Get-ChildItem $gsDir -Filter "*.dll" -ErrorAction SilentlyContinue | Copy-Item -Destination (Join-Path $OcrBin "bin") -Force
    $BundleArgs += "--add-binary"; $BundleArgs += (Join-Path $OcrBin "bin\gswin64c.exe;bin")
    $dll = Join-Path $OcrBin "bin\gsdll64.dll"
    if (Test-Path $dll) { $BundleArgs += "--add-binary"; $BundleArgs += "$dll;bin" }
    if (Test-Path (Join-Path $gsRoot "Resource")) {
        $BundleArgs += "--add-binary"; $BundleArgs += (Join-Path $gsRoot "Resource;bin/Resource")
    }
    if (Test-Path (Join-Path $gsRoot "fonts")) {
        $BundleArgs += "--add-binary"; $BundleArgs += (Join-Path $gsRoot "fonts;bin/fonts")
    }
} else {
    Write-Host "WARNING: Ghostscript non trovato; OCRmyPDF non disponibile (fallback manuale)" -ForegroundColor Yellow
}
$qpdfCmd = Get-Command qpdf.exe -ErrorAction SilentlyContinue
if ($qpdfCmd) {
    $qpdfExe = $qpdfCmd.Source
    Write-Host "Bundling qpdf: $qpdfExe" -ForegroundColor Cyan
    Copy-Item $qpdfExe (Join-Path $OcrBin "bin") -Force
    $qpdfDir = Split-Path $qpdfExe
    Get-ChildItem $qpdfDir -Filter "*.dll" -ErrorAction SilentlyContinue | Copy-Item -Destination (Join-Path $OcrBin "bin") -Force
    $BundleArgs += "--add-binary"; $BundleArgs += (Join-Path $OcrBin "bin\qpdf.exe;bin")
} else {
    Write-Host "WARNING: qpdf non trovato; OCRmyPDF non disponibile (fallback manuale)" -ForegroundColor Yellow
}

# Build with PyInstaller
Write-Host "Running PyInstaller..." -ForegroundColor Yellow
& $Python -m PyInstaller `
    --name "fastapi-sidecar" `
    --onefile `
    --noconsole `
    --workpath "$ProjectRoot\desktop\build-sidecar-tmp" `
    --specpath "$ProjectRoot\desktop" `
    --distpath $OutputDir `
    --paths "$BackendDir" `
    --hidden-import "fitz" `
    --collect-all "fitz" `
    --hidden-import "uvicorn" `
    --hidden-import "fastapi" `
    --hidden-import "sqlalchemy" `
    --hidden-import "alembic" `
    --hidden-import "pydantic" `
    --hidden-import "pydantic_settings" `
    --hidden-import "slowapi" `
    --hidden-import "google.auth" `
    --hidden-import "docx" `
    --hidden-import "reportlab" `
    --hidden-import "app.main" `
    --hidden-import "keyring" `
    --collect-all "keyring" `
    --hidden-import "ocrmypdf" `
    --collect-all "ocrmypdf" `
    --hidden-import "app.core.config" `
    --hidden-import "app.core.database" `
    --hidden-import "app.core.csrf" `
    --hidden-import "app.core.limiter" `
    --hidden-import "app.core.license_seed" `
    --hidden-import "app.models" `
    --hidden-import "app.repositories" `
    --hidden-import "app.services" `
    --hidden-import "app.api.v1" `
    --hidden-import "app.core.tesseract" `
    --hidden-import "pytesseract" `
    --hidden-import "PIL" `
    --add-data "$ProjectRoot\desktop\.env.desktop;." `
    $BundleArgs `
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