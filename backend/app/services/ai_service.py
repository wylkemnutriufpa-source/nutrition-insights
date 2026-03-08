"""
Serviço de chamadas à API de IA.
Inclui timeout, tratamento de erro e sanitização de resposta.
"""

import asyncio
import re
import logging

import httpx
from fastapi import HTTPException

from app.config import get_settings

logger = logging.getLogger("app.ai_service")
settings = get_settings()


def sanitize_ai_response(text: str) -> str:
    """Remove tags HTML e URIs perigosas da resposta da IA."""
    text = re.sub(r"<[^>]+>", "", text)
    text = re.sub(r"javascript:", "", text, flags=re.IGNORECASE)
    text = re.sub(r"on\w+\s*=", "", text, flags=re.IGNORECASE)
    return text.strip()


async def call_openai(prompt: str, system_prompt: str = "") -> str:
    """
    Chama a API da OpenAI com timeout explícito.
    Retorna texto sanitizado.
    """
    timeout = settings.AI_TIMEOUT_SECONDS
    messages = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    messages.append({"role": "user", "content": prompt})

    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await asyncio.wait_for(
                client.post(
                    "https://api.openai.com/v1/chat/completions",
                    json={
                        "model": "gpt-4",
                        "messages": messages,
                        "max_tokens": 1000,
                        "temperature": 0.3,
                    },
                    headers={
                        "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
                        "Content-Type": "application/json",
                    },
                ),
                timeout=timeout,
            )
            response.raise_for_status()
            data = response.json()
            raw_text = data["choices"][0]["message"]["content"]
            return sanitize_ai_response(raw_text)

    except (httpx.TimeoutException, asyncio.TimeoutError):
        logger.warning("OpenAI timeout após %ds", timeout)
        raise HTTPException(504, "Serviço de IA indisponível — tente novamente")
    except httpx.HTTPStatusError as e:
        logger.error("OpenAI HTTP error: %d", e.response.status_code)
        raise HTTPException(502, f"Erro no serviço de IA: {e.response.status_code}")
    except Exception as e:
        logger.exception("Erro inesperado na chamada de IA")
        raise HTTPException(500, "Erro interno ao processar análise")
