"""
CLI script to bulk-import questions from a JSON file into the DuckDB question bank.

JSON format:
[
  {
    "stage": 1,
    "prompt": "Question text",
    "answer": "Correct answer"
  },
  ...
]
"""

import argparse
import json
import logging
import sys
from pathlib import Path
from uuid import uuid4

import db


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Import deduction questions from a JSON file into DuckDB."
    )
    parser.add_argument(
        "json_file",
        type=Path,
        help="Path to JSON file containing an array of question objects.",
    )
    parser.add_argument(
        "--clear", action="store_true", help="Drop existing questions before import."
    )
    parser.add_argument(
        "--verbose", action="store_true", help="Enable verbose logging."
    )
    return parser.parse_args()


def load_questions(json_path: Path) -> list[tuple[int, str, str]]:
    try:
        with json_path.open("r", encoding="utf-8") as f:
            data = json.load(f)
    except json.JSONDecodeError as e:
        logging.error("Failed to read JSON file: %s", e)
        sys.exit(1)

    if not isinstance(data, list):
        logging.error("JSON root must be a list of question objects.")
        sys.exit(1)

    questions = []
    for idx, entry in enumerate(data, start=1):
        if not all(k in entry for k in ("stage", "prompt", "answer")):
            logging.error("Entry %d missing required keys: %s", idx, entry)
            sys.exit(1)
        try:
            stage = int(entry["stage"])
            prompt = str(entry["prompt"]).strip()
            answer = str(entry["answer"]).strip()
        except Exception as e:
            logging.error("Invalid entry %d: %s", idx, e)
            sys.exit(1)
        questions.append((str(uuid4()), stage, prompt, answer))
    return questions


def main():
    args = parse_args()
    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(levelname)s: %(message)s",
    )

    if not args.json_file.exists():
        logging.error("JSON file does not exist: %s", args.json_file)
        sys.exit(1)

    questions = load_questions(args.json_file)

    with db.get_conn() as conn:
        if args.clear:
            logging.info("Clearing existing questions table...")
            conn.execute("DELETE FROM questions;")
        logging.info("Importing %d questions...", len(questions))
        conn.executemany(
            "INSERT INTO questions (id, stage, prompt, answer) VALUES (?, ?, ?, ?);",
            questions,
        )
        logging.info("Import completed successfully.")


if __name__ == "__main__":
    main()
