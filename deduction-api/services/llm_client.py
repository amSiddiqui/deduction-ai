"""Async Anthropic wrapper with streaming + “thinking” support.

Correctly uses Anthropic API features for system prompts, temperature,
and structured thinking.
"""

from __future__ import annotations

import asyncio
from typing import AsyncIterator, Dict, List, Optional, Union

import anthropic
from anthropic.types import RawContentBlockDeltaEvent, TextDelta

from config import Settings, get_logger, settings

logger = get_logger(__name__)
# logger.setLevel(logging.DEBUG)


# --------------------------------------------------------------------------- #
# Client Singleton
# --------------------------------------------------------------------------- #
_client_lock = asyncio.Lock()
_client: anthropic.AsyncAnthropic | None = None


async def _get_client() -> anthropic.AsyncAnthropic:
    """Get the Anthropic async client, initializing it if necessary."""
    global _client
    logger.debug("_get_client called. Current _client: %s", _client)
    if _client is None:
        async with _client_lock:
            if _client is None:
                logger.info("Initializing Anthropic AsyncAnthropic client.")
                _client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
            else:
                logger.debug("Client already initialized by another coroutine.")
    else:
        logger.debug("Returning existing Anthropic client.")
    return _client


# --------------------------------------------------------------------------- #
# Internal Helper for Model-Specific Options
# --------------------------------------------------------------------------- #
def _get_model_specific_options(model_name: str, current_settings: Settings) -> dict:
    """
    Determines temperature and 'thinking' configuration based on the model.
    """
    logger.debug(
        "_get_model_specific_options called with model_name=%s, llm_reasoning_budget=%s",
        model_name,
        current_settings.llm_reasoning_budget,
    )
    options: Dict[str, Union[float, dict]] = {}
    is_reasoning_model_type = model_name == current_settings.claude_37_model

    if is_reasoning_model_type:
        logger.debug("Model is reasoning model type.")
        if current_settings.llm_reasoning_budget >= 1024:
            options["thinking"] = {
                "type": "enabled",
                "budget_tokens": current_settings.llm_reasoning_budget,
            }
            options["temperature"] = 1.0
            logger.debug(
                "Enabled 'thinking' for %s with budget %s.",
                model_name,
                current_settings.llm_reasoning_budget,
            )
        else:
            logger.warning(
                "Reasoning model %s selected, but llm_reasoning_budget (%s) is less than 1024. "
                "'thinking' feature will be disabled. Consider increasing the budget.",
                model_name,
                current_settings.llm_reasoning_budget,
            )
            options["temperature"] = 0.1
    else:
        logger.debug("Model is traditional model type.")
        options["temperature"] = 0.1

    logger.debug("Model options resolved: %s", options)
    return options


async def chat_completion_iter(
    *,
    model: str,
    messages: List[Dict[str, str]],
    system_prompt: Optional[str] = None,
    max_tokens: Optional[int] = None,
) -> AsyncIterator[Union[str, Dict[str, str]]]:
    """
    Makes a streamed call to the Anthropic API.

    Yields:
        - str: Chunks of text for traditional models.
        - Dict[str, str]: Structured chunks like {"type": "thinking", "delta": "..."}
                          or {"type": "final", "delta": "..."} for reasoning models
                          with 'thinking' enabled.
    """
    logger.info(
        "chat_completion_iter called with model=%s, system_prompt=%s, max_tokens=%s",
        model,
        system_prompt,
        max_tokens,
    )
    resolved_max_tokens = max_tokens or settings.llm_max_tokens
    logger.debug("Resolved max_tokens: %s", resolved_max_tokens)
    model_opts = _get_model_specific_options(model, settings)
    logger.debug("Model options: %s", model_opts)

    api_params = {
        "model": model,
        "max_tokens": resolved_max_tokens,
        "messages": messages,
        "stream": True,
        **model_opts,
    }
    if system_prompt:
        api_params["system"] = system_prompt

    logger.info("API params for chat_completion_iter: %s", api_params)
    client = await _get_client()
    logger.info("Sending streamed request to Anthropic API.")
    stream = await client.messages.create(**api_params)  # type: ignore
    logger.info("Stream opened.")
    if model == settings.claude_37_model and "thinking" in model_opts:
        logger.debug("Streaming for reasoning model with 'thinking' enabled.")
        async for event in stream:
            logger.debug("Received event: %s", event)
            if isinstance(event, RawContentBlockDeltaEvent):
                logger.debug("ContentBlockDeltaEvent: %s", event.delta)
                if event.delta.type == "text_delta":
                    text_chunk = event.delta.text
                    yield {"type": "text", "delta": text_chunk}
                elif event.delta.type == "thinking_delta":
                    yield {"type": "thinking", "delta": event.delta.thinking}
    else:
        logger.debug(
            "Streaming for traditional model or reasoning model without 'thinking'."
        )
        async for event in stream:
            logger.debug("Received event: %s", event)
            if isinstance(event, RawContentBlockDeltaEvent) and isinstance(
                event.delta, TextDelta
            ):
                logger.debug("Yielding text chunk: %s", event.delta.text)
                yield {"type": "text", "delta": event.delta.text}
