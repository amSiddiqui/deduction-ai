# config.py
"""Centralised settings loaded from *.env* (or system env vars).

Env keys
--------
ANTHROPIC_API_KEY           mandatory, your Claude key
LLM_MAX_TOKENS              soft cap for each call             (default 1024)
LLM_REASONING_BUDGET        thinking budget for 3.7 Sonnet     (default 4096)

Model names can be overridden too; useful if Anthropic bumps the
version suffixes again.
"""

from __future__ import annotations

import logging

from pydantic_settings import BaseSettings
from rich.logging import RichHandler


class Settings(BaseSettings):
    anthropic_api_key: str
    llm_max_tokens: int = 1028
    llm_reasoning_budget: int = 1024

    claude_35_model: str = "claude-3-5-haiku-latest"
    claude_37_model: str = "claude-3-7-sonnet-latest"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()  # type: ignore


def get_logger(name: str) -> logging.Logger:
    logger = logging.getLogger(name)
    if not logger.hasHandlers():
        handler = RichHandler(
            rich_tracebacks=True, show_time=True, show_level=True, show_path=True
        )
        formatter = logging.Formatter("%(message)s")
        handler.setFormatter(formatter)
        logger.addHandler(handler)
        logger.setLevel(logging.INFO)
        logger.propagate = False
    return logger
