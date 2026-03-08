"""
Rotas de refeições com proteção contra IDOR.
Paciente só acessa seus próprios dados.
Nutricionista acessa apenas pacientes vinculados.
"""

from fastapi import APIRouter, Depends, HTTPException

from app.auth.dependencies import get_current_user, require_role, AuthenticatedUser
from app.schemas.common_schemas import MealCreate, MealResponse
from app.services.supabase_client import get_supabase

router = APIRouter()


async def _check_patient_access(user: AuthenticatedUser, patient_id: str):
    """
    Verifica se o usuário tem acesso ao patient_id informado.
    Previne IDOR: paciente só vê seus dados, nutricionista só vê seus pacientes.
    """
    supabase = get_supabase()

    # Verificar role do usuário
    is_patient = supabase.rpc("has_role", {"_user_id": user.id, "_role": "patient"}).execute()
    is_nutritionist = supabase.rpc("has_role", {"_user_id": user.id, "_role": "nutritionist"}).execute()

    if is_patient.data is True:
        # Paciente: só acessa seus próprios dados
        if user.id != patient_id:
            raise HTTPException(403, "Acesso negado: você só pode ver seus próprios dados")
        return

    if is_nutritionist.data is True:
        # Nutricionista: verificar vínculo
        link = (
            supabase.table("nutritionist_patients")
            .select("id")
            .eq("nutritionist_id", user.id)
            .eq("patient_id", patient_id)
            .maybe_single()
            .execute()
        )
        if not link.data:
            raise HTTPException(403, "Paciente não está sob seus cuidados")
        return

    raise HTTPException(403, "Permissão insuficiente")


@router.get("/patients/{patient_id}/meals", response_model=list[MealResponse])
async def get_patient_meals(
    patient_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
):
    """Lista refeições de um paciente com proteção IDOR."""
    await _check_patient_access(user, patient_id)

    supabase = get_supabase()
    result = (
        supabase.table("meals")
        .select("*")
        .eq("patient_id", patient_id)
        .order("created_at", desc=True)
        .limit(50)
        .execute()
    )
    return result.data


@router.post("/patients/{patient_id}/meals", response_model=MealResponse)
async def create_meal(
    patient_id: str,
    payload: MealCreate,
    user: AuthenticatedUser = Depends(get_current_user),
):
    """Cria refeição para um paciente."""
    await _check_patient_access(user, patient_id)

    supabase = get_supabase()
    result = (
        supabase.table("meals")
        .insert({
            "patient_id": patient_id,
            "description": payload.description,
            "image_url": payload.image_url,
        })
        .execute()
    )
    return result.data[0]
