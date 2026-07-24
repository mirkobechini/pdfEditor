"""Security utilities — sanitization, validation helpers."""

import re

# Per RFC 6266, il parametro filename= accetta solo caratteri ASCII stampabili
# esclusi i caratteri "pericolosi" per l'header HTTP.
# Allowlist: lettere, numeri, spazi, trattini, underscore, punti, e altri sicuri
_SAFE_FILENAME_RE = re.compile(r'[^a-zA-Z0-9 _\-.,()@!+#$%&~\[\]=:]')


def sanitize_filename(filename: str) -> str:
    """Sanitize a filename for safe use in Content-Disposition headers.
    
    Keeps only ASCII printable characters safe for HTTP headers.
    Removes:
    - Non-printable and non-ASCII characters (control chars, Unicode)
    - Quotes (single and double) — would break the quoted filename value
    - CRLF sequences (header injection)
    - Semicolons — in Content-Disposition, ; separates parameters
    - Backslashes — could escape the closing quote
    
    Returns an empty string if nothing safe remains.
    """
    if not isinstance(filename, str):
        return ""
    # Remove all characters not in the safe allowlist
    filename = _SAFE_FILENAME_RE.sub('', filename)
    # Trim whitespace
    filename = filename.strip()
    # Prevent empty or dot-only filenames
    if not filename or filename in ('.', '..'):
        return "file"
    return filename