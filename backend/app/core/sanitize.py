"""Security utilities — sanitization, validation helpers."""

import re


def sanitize_filename(filename: str) -> str:
    """Sanitize a filename for safe use in Content-Disposition headers.
    
    Removes:
    - Non-printable characters (control chars)
    - Quotes (single and double)
    - CRLF sequences (header injection)
    """
    # Remove control characters
    filename = re.sub(r'[\x00-\x1f\x7f-\x9f]', '', filename)
    # Remove quotes and CRLF
    filename = filename.replace('"', '').replace("'", "")
    filename = filename.replace('\r', '').replace('\n', '')
    return filename