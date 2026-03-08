"""
Middleware de logging seguro.
Nunca loga body de requests em rotas sensíveis.
"""

import logging
import time

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

logger = logging.getLogger("app.access")

SENSITIVE_PATHS = {"/api/analyze-meal", "/api/analyze-body", "/api/patients"}


class SafeLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start = time.perf_counter()
        response = await call_next(request)
        elapsed_ms = round((time.perf_counter() - start) * 1000)

        path = request.url.path
        log_msg = f"{request.method} {path} -> {response.status_code} ({elapsed_ms}ms)"

        if any(path.startswith(s) for s in SENSITIVE_PATHS):
            logger.info(log_msg)  # sem IP, sem body
        else:
            logger.info(f"{log_msg} client={request.client.host if request.client else 'unknown'}")

        return response
