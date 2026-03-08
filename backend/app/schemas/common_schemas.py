"""
Schemas para refeições e pacientes.
"""

from pydantic import BaseModel, Field, field_validator
from datetime import datetime
import re


class MealCreate(BaseModel):
    description: str = Field(..., min_length=1, max_length=2000)
    image_url: str | None = Field(None, max_length=500)

    @field_validator("description")
    @classmethod
    def sanitize(cls, v: str) -> str:
        v = v.strip()
        v = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", "", v)
        if not v:
            raise ValueError("Descrição não pode ser vazia")
        return v


class MealResponse(BaseModel):
    id: str
    patient_id: str
    description: str
    image_url: str | None = None
    analysis: str | None = None
    created_at: datetime


class PatientResponse(BaseModel):
    id: str
    email: str
    name: str | None = None
    created_at: datetime


class PatientListResponse(BaseModel):
    patients: list[PatientResponse]
    total: int
