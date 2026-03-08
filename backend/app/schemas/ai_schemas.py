"""
Schemas Pydantic para endpoints de IA.
Validação rigorosa de input para prevenir prompt injection e payloads oversized.
"""

from pydantic import BaseModel, Field, field_validator
import re


class MealAnalysisRequest(BaseModel):
    description: str = Field(..., min_length=1, max_length=2000)
    image_url: str | None = Field(None, max_length=500)

    @field_validator("description")
    @classmethod
    def sanitize_description(cls, v: str) -> str:
        v = v.strip()
        # Remover caracteres de controle (exceto newline/tab)
        v = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", "", v)
        if not v:
            raise ValueError("Descrição não pode ser vazia")
        return v

    @field_validator("image_url")
    @classmethod
    def validate_image_url(cls, v: str | None) -> str | None:
        if v and not v.startswith(("https://",)):
            raise ValueError("URL deve usar HTTPS")
        return v


class MealAnalysisResponse(BaseModel):
    analysis: str
    calories_estimate: float | None = None
    macros: dict | None = None


class BodyAnalysisRequest(BaseModel):
    height_cm: float = Field(..., gt=30, lt=300)
    weight_kg: float = Field(..., gt=5, lt=500)
    age: int | None = Field(None, gt=0, lt=150)
    notes: str | None = Field(None, max_length=1000)

    @field_validator("notes")
    @classmethod
    def sanitize_notes(cls, v: str | None) -> str | None:
        if v:
            v = v.strip()
            v = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", "", v)
        return v or None


class BodyAnalysisResponse(BaseModel):
    bmi: float
    analysis: str
    recommendations: list[str] = []
