"""Tesseract binary discovery and configuration.

The OCR feature needs the `tesseract` binary (the actual OCR engine), not
just the `pytesseract` Python wrapper. This module centralizes how the
binary is located so it works across:

- **Web (Render)**: installed via `apt-get` in `render.yaml` → found in PATH.
- **Desktop (PyInstaller sidecar)**: bundled inside the sidecar and extracted
  to a known location → found via `TESSERACT_CMD` env var set by
  `run_backend.py`.
- **Local dev**: installed by the developer → found in PATH or common
  install locations.

It also configures `TESSDATA_PREFIX` so the language packs (eng/ita/fra/deu/spa)
are found even when bundled inside the sidecar.
"""

import os
import shutil
import sys

# Language packs bundled with the sidecar (must match the UI language list)
SUPPORTED_LANGS = ("eng", "ita", "fra", "deu", "spa")


def _is_frozen() -> bool:
    """Return True when running inside a PyInstaller bundle."""
    return hasattr(sys, "_MEIPASS")


def _bundle_base() -> str:
    """Return the PyInstaller extraction dir (or empty string when not frozen)."""
    if _is_frozen():
        return sys._MEIPASS  # type: ignore[attr-defined]
    return ""


def _candidate_paths() -> list[str]:
    """Return candidate absolute paths for the tesseract binary, best first."""
    candidates: list[str] = []

    # 1. Explicit env var (set by run_backend.py in the sidecar)
    env_cmd = os.environ.get("TESSERACT_CMD")
    if env_cmd:
        candidates.append(env_cmd)

    # 2. Bundled inside the PyInstaller sidecar
    base = _bundle_base()
    if base:
        if sys.platform == "win32":
            candidates.append(os.path.join(base, "tesseract", "tesseract.exe"))
        else:
            candidates.append(os.path.join(base, "tesseract", "tesseract"))

    # 3. Common install locations (Windows)
    if sys.platform == "win32":
        candidates.extend(
            [
                r"C:\Program Files\Tesseract-OCR\tesseract.exe",
                r"C:\Program Files\UB-Mannheim\Tesseract-OCR\tesseract.exe",
                os.path.expanduser(r"~\AppData\Local\Programs\Tesseract-OCR\tesseract.exe"),
            ]
        )

    return candidates


def configure_tesseract() -> str | None:
    """Locate the tesseract binary and configure pytesseract + tessdata.

    Returns the resolved binary path, or None if tesseract is not found.
    """
    import pytesseract

    # 1. Try explicit candidates first
    for path in _candidate_paths():
        if path and os.path.isfile(path):
            pytesseract.pytesseract.tesseract_cmd = path
            _configure_tessdata()
            return path

    # 2. Fall back to PATH lookup (e.g. web deploy via apt-get)
    which = shutil.which("tesseract")
    if which:
        pytesseract.pytesseract.tesseract_cmd = which
        _configure_tessdata()
        return which

    return None


def _configure_tessdata() -> None:
    """Point TESSDATA_PREFIX at bundled language packs when present.

    In the sidecar, the .traineddata files are bundled under
    `<bundle>/tessdata/`. In dev, the system tessdata is used.
    """
    base = _bundle_base()
    if not base:
        return
    bundled_tessdata = os.path.join(base, "tessdata")
    if os.path.isdir(bundled_tessdata):
        os.environ["TESSDATA_PREFIX"] = bundled_tessdata