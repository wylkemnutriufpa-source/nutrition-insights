"""
Rotas de pacientes.
Apenas nutricionistas podem listar pacientes (os seus).
"""

from fastapi import APIRouter, Depends

from app.auth.dependencies import require_role, AuthenticatedUser
from app.schemas.common_schemas import PatientListResponse
from app.services.supabase_client import get_supabase

router = APIRouter()


@router.get("/patients", response_model=PatientListResponse)
async def list_patients(
    user: AuthenticatedUser = Depends(require_role(["nutritionist", "admin"])),
):
    """
    Lista pacientes vinculados ao nutricionista autenticado.
    Admin vê todos.
    """
    supabase = get_supabase()

    # Verificar se é admin
    is_admin = supabase.rpc("has_role", {"_user_id": user.id, "_role": "admin"}).execute()

    if is_admin.data is True:
        result = supabase.table("patients").select("*").execute()
    else:
        # Nutricionista: apenas seus pacientes
        result = (
            supabase.table("nutritionist_patients")
            .select("patient:patients(*)")
            .eq("nutritionist_id", user.id)
            .execute()
        )
        # Flatten join result
        result.data = [row["patient"] for row in result.data if row.get("patient")]

    return PatientListResponse(patients=result.data, total=len(result.data))
