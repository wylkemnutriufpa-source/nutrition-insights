"""
Sanitização de texto.
"""

import re


def sanitize_html(text: str) -> str:
    """Remove tags HTML e javascript URIs."""
    text = re.sub(r"<[^>]+>", "", text)
    text = re.sub(r"javascript:", "", text, flags=re.IGNORECASE)
    return text.strip()
