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
    print(f"[sidecar] Base path: {base_path}")
    print(f"[sidecar] Bundled env: {bundled_env} exists={os.path.exists(bundled_env)}")
    print(f"[sidecar] Target env: {target_env} exists={os.path.exists(target_env)}")
    if os.path.exists(target_env):
        # Remove old .env so fresh .env.desktop is always used
        os.remove(target_env)
        print(f"[sidecar] Removed old .env")
    if os.path.exists(bundled_env):
        shutil.copy2(bundled_env, target_env)
        print(f"[sidecar] Created default .env from .env.desktop")


# Ensure .env exists before any app imports
_ensure_env()


def _configure_bundled_tesseract():
    """Point pytesseract at the tesseract binary bundled inside the sidecar.

    The binary and language packs are added to the PyInstaller bundle under
    `tesseract/` and `tessdata/`. We set TESSERACT_CMD and TESSDATA_PREFIX so
    `app.core.tesseract.configure_tesseract()` finds them without the user
    installing anything.
    """
    base_path = _get_base_path()
    if sys.platform == "win32":
        binary = os.path.join(base_path, "tesseract", "tesseract.exe")
    else:
        binary = os.path.join(base_path, "tesseract", "tesseract")
    if os.path.isfile(binary):
        os.environ["TESSERACT_CMD"] = binary
        print(f"[sidecar] Bundled tesseract: {binary}")
    tessdata = os.path.join(base_path, "tessdata")
    if os.path.isdir(tessdata):
        os.environ["TESSDATA_PREFIX"] = tessdata
        print(f"[sidecar] Bundled tessdata: {tessdata}")


def _configure_bundled_ocr_tools():
    """11/11 (Mirko): OCRmyPDF nel sidecar.

    Ghostscript + qpdf vengono bundlati dal build-sidecar sotto `bin/` (vedi
    build-sidecar.ps1). Li mettiamo in PATH e impostiamo GS_PROG/QPDF cosi'
    OCRmyPDF li trova senza che l'utente installi nulla. Se mancano (bundle
    best-effort fallito), il tool OCR ricade sul metodo manuale.
    """
    base_path = _get_base_path()
    bin_dir = os.path.join(base_path, "bin")
    if os.path.isdir(bin_dir):
        os.environ["PATH"] = bin_dir + os.pathsep + os.environ.get("PATH", "")
        print(f"[sidecar] OCR tools bin: {bin_dir}")
    gs = os.path.join(bin_dir, "gswin64c.exe")
    if os.path.isfile(gs):
        os.environ["GS_PROG"] = gs
        print(f"[sidecar] Ghostscript: {gs}")
    qpdf = os.path.join(bin_dir, "qpdf.exe")
    if os.path.isfile(qpdf):
        os.environ["QPDF"] = qpdf
        print(f"[sidecar] qpdf: {qpdf}")
    # tesseract su PATH: OCRmyPDF lo cerca anche via 'tesseract' (non solo env)
    tess_bin = os.path.join(base_path, "tesseract")
    if os.path.isdir(tess_bin):
        os.environ["PATH"] = tess_bin + os.pathsep + os.environ.get("PATH", "")


_configure_bundled_tesseract()
_configure_bundled_ocr_tools()

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