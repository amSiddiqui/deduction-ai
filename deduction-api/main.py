"""Deduction - FastAPI entrypoint.

All routes live here (kept in one file for the demo).
-----------------------------------------------------------------------------"""

from __future__ import annotations

import json
import uuid
from typing import Any, AsyncIterator, Dict, List, Optional

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import UUID4, BaseModel, Field

from config import get_logger, settings
from services import llm_client
from services.session import SessionService

logger = get_logger(__name__)

# --------------------------------------------------------------------------- #
# FastAPI app
# --------------------------------------------------------------------------- #
app = FastAPI(title="Deduction API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

STREAM_CHUNK_DELIMITER = "\u001e"  # ASCII Record Separator


# --------------------------------------------------------------------------- #
# Pydantic models
# --------------------------------------------------------------------------- #
class Message(BaseModel):
    """Message model for LLM API."""
    role: str
    content: str


# Update JoinRequest Pydantic model
class JoinRequest(BaseModel):
    """Request model for joining a game."""

    name: str = Field(..., min_length=1, max_length=50)
    start_new: Optional[bool] = False  # Add this field, defaults to False


# AttemptResponse might need a 'message' field if you added it in SessionService
class AttemptResponse(BaseModel):
    """Response model for submitting an answer."""

    correct: bool
    victory: bool
    question: Optional[Dict[str, Any]]
    message: Optional[str] = None  # Add if you include messages from backend


class JoinResponse(BaseModel):
    """Response model for joining a game."""
    user: Dict[str, Any]
    question: Optional[Dict[str, Any]]


class AttemptRequest(BaseModel):
    """Request model for submitting an answer."""
    user_id: UUID4
    answer: str


class ModelRunRequest(BaseModel):
    """Request model for LLM API call."""
    model: str
    messages: List[Message]


# --------------------------------------------------------------------------- #
# Routes
# --------------------------------------------------------------------------- #


# Update /join route
@app.post("/join", response_model=JoinResponse)
async def join_game(body: JoinRequest):
    """
    Join a game. If user exists and start_new is false, session is resumed.
    If start_new is true, a new game session is created even if name exists.
    """
    # Ensure default for start_new if body.start_new is None (though Pydantic default handles it)
    start_new_flag = body.start_new if body.start_new is not None else False
    payload = SessionService.join(body.name, start_new=start_new_flag)
    return JoinResponse(**payload)


@app.post("/attempt", response_model=AttemptResponse)
async def submit_attempt(body: AttemptRequest):
    """Submit an answer and get the next question."""
    result = SessionService.submit_answer(uuid.UUID(str(body.user_id)), body.answer)
    return AttemptResponse(**result)


@app.post("/model-run")
async def model_run(
    body: ModelRunRequest,
):  # Assuming ModelRunRequest includes user_id if needed for other logic
    """Proxy call to Anthropic with NDJSON streaming response."""
    model = body.model
    messages = [m.model_dump() for m in body.messages]

    if model not in (
        settings.claude_35_model,
        settings.claude_37_model,
    ):
        logger.error("Unsupported model requested: %s", model)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported model selected.",
        )

    async def _stream() -> AsyncIterator[bytes]:
        try:
            async for chunk_dict in llm_client.chat_completion_iter(
                model=model,
                messages=messages,
            ):
                if isinstance(chunk_dict, dict):
                    yield (json.dumps(chunk_dict) + STREAM_CHUNK_DELIMITER).encode(
                        "utf-8"
                    )
                else:
                    # This case should not be hit based on your statement about llm_client
                    logger.warning("llm_client yielded non-dict chunk: %s", chunk_dict)                    # Fallback: try to encode it anyway if it's a string, or handle error
                    if isinstance(chunk_dict, str):
                        yield (
                            json.dumps(
                                {
                                    "type": "error",
                                    "delta": "Unexpected string chunk from LLM client",
                                }
                            )
                            + STREAM_CHUNK_DELIMITER
                        ).encode("utf-8")

        except Exception:
            logger.exception("Error during LLM stream processing:")
            # Yield a final error object to the client if an exception occurs during streaming
            error_obj = {
                "type": "error",
                "error": "An internal error occurred while streaming the AI response.",
            }
            yield (json.dumps(error_obj) + STREAM_CHUNK_DELIMITER).encode("utf-8")

    return StreamingResponse(
        _stream(),
        status_code=status.HTTP_200_OK,
        media_type="application/x-ndjson",  # CORRECTED media type for NDJSON
    )


@app.get("/models")
async def list_models():
    """List available models."""
    return {
        "default": settings.claude_35_model,
        "options": [{
            "name": settings.claude_35_model,
            "display_name": "Claude 3.5 Haiku",
            "thinking": False,
        }, {
            "name": settings.claude_37_model,
            "display_name": "Claude 3.7 Sonnet",
            "thinking": True,
        }],
    }
