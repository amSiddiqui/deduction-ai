# services/answer_checker.py
"""Simple answer-checking utilities.

The logic is deliberately lightweight so new rules or an LLM
self-evaluation step can be swapped in without touching the rest
of the codebase.
"""

import re
from typing import Callable


def _normalise(text: str) -> str:
    """Lower-case, collapse whitespace and strip punctuation for comparison."""
    text = re.sub(r"[\\W_]+", " ", text.lower())  # keep alphanumerics
    return " ".join(text.split())  # collapse spaces


def exact_match(user_answer: str, canonical: str) -> bool:
    """Return *True* if the normalised answers are identical."""
    return _normalise(user_answer) == _normalise(canonical)


# Default rule used by SessionService
DEFAULT_ANSWER_RULE: Callable[[str, str], bool] = exact_match
