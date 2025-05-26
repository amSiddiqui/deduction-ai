# services/session.py
"""High-level game/session orchestration."""

from __future__ import annotations

import uuid
from typing import Any

import db
from services import answer_checker
from services.question_bank import get_question_for_stage


class SessionService:
    """Facade used by API routes for managing game sessions and user progress."""

    MAX_STAGE = 3  # Defines the maximum stage a player can reach before winning.

    @staticmethod
    def join(name: str, start_new: bool = False) -> dict[str, Any]:
        """
        Registers a player for the game.

        If `start_new` is True and a user with the same `name` already exists,
        the existing user's record is deleted before creating a new one.
        This ensures a completely fresh game session for that name.

        If `start_new` is False:
            - If a user with the `name` exists, their session is resumed.
            - If no user with the `name` exists, a new user is created.

        Returns a dictionary containing the user's details and their current question.
        If the user has already completed all stages, 'question' will be None.
        """
        user = None
        stripped_name = name.strip()  # Ensure name is stripped before use

        existing_id = _find_user_id_by_name(stripped_name)

        if start_new:
            if existing_id:
                db.delete_user(existing_id)
            # Always create a new user when start_new is true
            new_user_id = db.create_user(stripped_name)
            user = db.get_user(new_user_id)
        else:  # Not starting a new game (start_new is False)
            if existing_id:
                user = db.get_user(existing_id)  # Try to resume

            if (
                user is None
            ):  # User not found for resume or get_user failed (e.g., ID was stale)
                new_user_id = db.create_user(stripped_name)
                user = db.get_user(new_user_id)

        assert user is not None, "User should be successfully created or retrieved."

        current_question = None
        if user["current_stage"] <= SessionService.MAX_STAGE:
            current_question = get_question_for_stage(user["current_stage"])
            if current_question is None:
                # This indicates a potential issue with the question bank for an active stage.
                print(
                    f"Warning: No question found for active stage {user['current_stage']} for user {user['id']}."
                )
        # If user["current_stage"] > MAX_STAGE, they've already won; current_question remains None.

        return {"user": user, "question": current_question}

    @classmethod
    def submit_answer(cls, user_id: uuid.UUID, answer: str) -> dict[str, Any]:
        """
        Validates a user's answer for their current stage.

        If the answer is correct, the user advances to the next stage.
        If the user completes the final stage, they achieve victory.
        Returns a dictionary with correctness, victory status, the next question (if any),
        and a message for the user.
        """
        user = db.get_user(user_id)
        if user is None:
            raise ValueError(f"Unknown user_id: {user_id}")

        current_stage = user["current_stage"]

        if current_stage > cls.MAX_STAGE:
            return {
                "correct": False,  # No answer to be correct against
                "victory": True,
                "question": None,
                "message": "You have already completed all challenges!",
            }

        current_question_details = get_question_for_stage(current_stage)
        if current_question_details is None:
            return {
                "correct": False,
                "victory": False,
                "question": None,
                "message": f"Error: No question available for stage {current_stage}. Please contact support.",
            }

        is_correct = answer_checker.DEFAULT_ANSWER_RULE(
            answer,
            current_question_details["answer"],
            current_stage,
        )
        response_message = ""
        next_question_data = None
        has_won = False

        if is_correct:
            db.increment_stat("correct_submissions")
            next_stage_number = current_stage + 1
            db.update_user_stage(user_id, next_stage_number)

            if next_stage_number > cls.MAX_STAGE:
                has_won = True
                response_message = "Congratulations! You've solved all puzzles!"
            else:
                next_question_data = get_question_for_stage(next_stage_number)
                response_message = "Correct! Moving to the next challenge."
                if next_question_data is None:
                    print(
                        f"Warning: No next question found for stage {next_stage_number} after correct answer for user {user_id}."
                    )
                    response_message = "Correct! However, an error occurred fetching the next question."
        else:
            db.increment_stat("wrong_submissions")
            next_question_data = (
                current_question_details  # User stays on the same question
            )
            response_message = "That's not quite it. Try a different approach!"

        return {
            "correct": is_correct,
            "victory": has_won,
            "question": next_question_data,
            "message": response_message,
        }


def _find_user_id_by_name(name: str) -> uuid.UUID | None:
    """
    Finds the ID of the first user (oldest by joined_at) with the given display name.

    Returns the user's UUID if found, otherwise `None`.
    The name is stripped of leading/trailing whitespace before searching.
    """
    with db.get_conn(readonly=True) as conn:
        row = conn.execute(
            "SELECT id FROM users WHERE name = ? ORDER BY joined_at ASC LIMIT 1;",
            (name.strip(),),
        ).fetchone()
        return row[0] if row and row[0] is not None else None
