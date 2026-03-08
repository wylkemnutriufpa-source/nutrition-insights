"""
Rotas de análise por IA.
Todos os inputs são validados via Pydantic.
Respostas são sanitizadas antes de retornar.
"""

from fastapi import APIRouter, Depends

from app.auth.dependencies import get_current_user, require_role, AuthenticatedUser
from app.schemas.ai_schemas import (
    MealAnalysisRequest,
    MealAnalysisResponse,
    BodyAnalysisRequest,
    BodyAnalysisResponse,
)
from app.services.ai_service import call_openai

router = APIRouter()


@router.post("/analyze-meal", response_model=MealAnalysisResponse)
async def analyze_meal(
    payload: MealAnalysisRequest,
    user: AuthenticatedUser = Depends(require_role(["patient", "nutritionist"])),
):
    """Analisa uma refeição descrita pelo usuário."""
    prompt = f"Analise nutricionalmente esta refeição: {payload.description}"
    if payload.image_url:
        prompt += f"\nImagem: {payload.image_url}"

    analysis = await call_openai(
        prompt=prompt,
        system_prompt="Você é um nutricionista. Responda em português com análise calórica e de macronutrientes.",
    )

    return MealAnalysisResponse(analysis=analysis)


@router.post("/analyze-body", response_model=BodyAnalysisResponse)
async def analyze_body(
    payload: BodyAnalysisRequest,
    user: AuthenticatedUser = Depends(require_role(["patient", "nutritionist"])),
):
    """Analisa composição corporal."""
    bmi = payload.weight_kg / ((payload.height_cm / 100) ** 2)

    prompt = (
        f"Paciente: {payload.height_cm}cm, {payload.weight_kg}kg, IMC {bmi:.1f}."
    )
    if payload.notes:
        prompt += f" Observações: {payload.notes}"

    analysis = await call_openai(
        prompt=prompt,
        system_prompt="Você é um nutricionista. Dê recomendações em português.",
    )

    return BodyAnalysisResponse(
        bmi=round(bmi, 2),
        analysis=analysis,
    )
