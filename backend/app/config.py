"""
Configuração centralizada via variáveis de ambiente.
Nenhum secret é hardcoded.
"""

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Supabase
    SUPABASE_URL: str
    SUPABASE_SERVICE_KEY: str  # service_role — NUNCA expor no frontend
    SUPABASE_JWT_SECRET: str

    # OpenAI
    OPENAI_API_KEY: str

    # App
    APP_ENV: str = "development"
    CORS_ORIGINS: list[str] = ["http://localhost:5173"]
    AI_TIMEOUT_SECONDS: int = 30
    MAX_UPLOAD_SIZE_MB: int = 5

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
