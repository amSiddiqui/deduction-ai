# services/question_bank.py
"""Question-bank helpers – fetch questions & bulk-import utility."""

from __future__ import annotations

import csv
from pathlib import Path
from typing import Any
from uuid import uuid4

import db


def get_question_for_stage(stage: int) -> dict[str, Any] | None:
    """Return the first question for the requested stage."""
    return db.fetch_question(stage)


# ----------------------------------------------------------------------
# CLI / admin helpers
# ----------------------------------------------------------------------
def import_from_csv(path: str | Path) -> None:
    """Bulk-insert questions from a CSV with header: stage,prompt,answer."""
    path = Path(path)
    with path.open(newline="", encoding="utf-8") as f, db.get_conn() as conn:
        reader = csv.DictReader(f)
        rows = [
            (str(uuid4()), int(r["stage"]), r["prompt"], r["answer"]) for r in reader
        ]
        conn.executemany(
            "INSERT INTO questions (id, stage, prompt, answer) VALUES (?, ?, ?, ?)",
            rows,
        )
