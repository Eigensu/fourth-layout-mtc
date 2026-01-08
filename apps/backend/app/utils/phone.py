from typing import Optional


def normalize_mobile(value: Optional[str]) -> Optional[str]:
    """Normalize a phone input to digits-only string.

    - Strips all non-digit characters
    - Returns None if input is None or no digits present
    - Trims leading zeros conservatively (kept as provided)
    """
    if value is None:
        return None
    digits = "".join(ch for ch in value if ch.isdigit())
    return digits or None


def validate_mobile_length(digits: str, min_len: int = 10, max_len: int = 15) -> bool:
    """Basic length validation for digits-only phone numbers."""
    return min_len <= len(digits) <= max_len
