# db.py
"""Deduction backend - DuckDB helper

Creates/opens a file-based DuckDB database and guarantees that the required
schema exists.  *No* user chat transcripts are persisted - only minimal game
state and aggregate stats.
"""

from __future__ import annotations

import os
import uuid
from contextlib import contextmanager
from pathlib import Path
from typing import Any, Iterator, Sequence

import duckdb

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
DEFAULT_DB_FILE = "deduction.duckdb"
DB_PATH = Path(os.getenv("DED_DB_FILE", DEFAULT_DB_FILE)).expanduser().resolve()

# ---------------------------------------------------------------------------
# Schema - expanded easily later by appending to _SCHEMA.
# ---------------------------------------------------------------------------
_SCHEMA: Sequence[str] = [
    # Registered participants and their current progress.
    """
    CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY,
        name TEXT NOT NULL,
        current_stage INTEGER NOT NULL DEFAULT 1,
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """,
    # Question bank.  New questions can be INSERTed any time without migration.
    """
    CREATE TABLE IF NOT EXISTS questions (
        id TEXT PRIMARY KEY,
        stage INTEGER NOT NULL,
        prompt TEXT NOT NULL,
        answer TEXT NOT NULL  -- canonical correct answer
    );
    """,
    # Lightweight app-level counters (e.g. total_attempts, total_wins).
    """
    CREATE TABLE IF NOT EXISTS stats (
        key TEXT PRIMARY KEY,
        value BIGINT DEFAULT 0
    );
    """,
]

# ---------------------------------------------------------------------------
# Connection helpers
# ---------------------------------------------------------------------------


def _apply_migrations(conn: duckdb.DuckDBPyConnection) -> None:
    """Run idempotent DDL statements to ensure the schema exists."""
    for ddl in _SCHEMA:
        conn.execute(ddl)


def _initialise_db() -> None:
    """Create the DB file (if missing) and apply migrations once at import time."""
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with duckdb.connect(str(DB_PATH)) as conn:  # Ensure DB_PATH is string for connect
        _apply_migrations(conn)


_initialise_db()


@contextmanager
def get_conn(readonly: bool = False) -> Iterator[duckdb.DuckDBPyConnection]:
    """
    Yield a DuckDB connection.

    Parameters
    ----------
    readonly : bool, optional
        Open the database in read-only mode when `True`.
    """
    conn = duckdb.connect(str(DB_PATH), read_only=readonly)  # Ensure DB_PATH is string
    try:
        yield conn
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# Convenience CRUD helpers (thin wrappers - business logic lives in services)
# ---------------------------------------------------------------------------


def create_user(name: str) -> uuid.UUID:
    """
    Creates a new user with the given name and returns their unique ID.
    A new UUID is generated for each user.
    The user's current stage defaults to 1.
    """
    user_id = uuid.uuid4()
    with get_conn() as conn:
        conn.execute(
            "INSERT INTO users (id, name) VALUES (?, ?);",
            (user_id, name.strip()),  # DuckDB handles UUID to string conversion
        )
    return user_id


def get_user(user_id: uuid.UUID) -> dict[str, Any] | None:
    """
    Retrieves a user's details by their unique ID.

    Returns `None` if no user is found with the given ID.
    Otherwise, returns a dictionary with 'id', 'name', and 'current_stage'.
    """
    with get_conn(readonly=True) as conn:
        row = conn.execute(
            "SELECT id, name, current_stage FROM users WHERE id = ?;",
            (user_id,),  # DuckDB handles UUID to string conversion
        ).fetchone()
        if row is None:
            return None
        return {"id": row[0], "name": str(row[1]), "current_stage": int(row[2])}


def update_user_stage(user_id: uuid.UUID, new_stage: int) -> None:
    """Updates the current stage for the specified user."""
    with get_conn() as conn:
        conn.execute(
            "UPDATE users SET current_stage = ? WHERE id = ?;",
            (new_stage, user_id),  # DuckDB handles UUID to string conversion
        )


def delete_user(user_id: uuid.UUID) -> None:
    """
    Deletes a user and all their associated data from the users table.
    """
    with get_conn() as conn:
        conn.execute(
            "DELETE FROM users WHERE id = ?;",
            (user_id,),  # DuckDB handles UUID to string conversion
        )


def fetch_question(stage: int) -> dict[str, Any] | None:
    """
    Fetches the question details for a given stage.

    Returns `None` if no question is found for the stage.
    Otherwise, returns a dictionary with 'id', 'prompt', and 'answer'.
    """
    with get_conn(readonly=True) as conn:
        row = conn.execute(
            "SELECT id, prompt, answer FROM questions WHERE stage = ? LIMIT 1;",
            (stage,),
        ).fetchone()
        if row is None:
            return None
        return {"id": str(row[0]), "prompt": str(row[1]), "answer": str(row[2])}


def increment_stat(key: str, delta: int = 1) -> None:
    """
    Increments an application-level statistic by a given delta.
    If the statistic key does not exist, it is created.
    """
    with get_conn() as conn:
        conn.execute(
            "INSERT INTO stats (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = stats.value + EXCLUDED.value;",
            (key, delta),  # Use EXCLUDED.value for the update part
        )
