"""
Autenticação JWT e dependencies de autorização.

Fluxo:
1. get_current_user → valida JWT do header Authorization
2. require_role(["admin"]) → verifica role na tabela user_roles (NÃO em user_metadata)

⚠️ Roles NUNCA são lidas de user_metadata ou localStorage.
   Sempre consultadas via tabela user_roles com security definer function.
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

from app.config import get_settings
from app.services.supabase_client import get_supabase

security = HTTPBearer()
settings = get_settings()


class AuthenticatedUser:
    """Representa um usuário autenticado com dados do JWT."""

    def __init__(self, id: str, email: str, raw_token: str):
        self.id = id
        self.email = email
        self.raw_token = raw_token


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> AuthenticatedUser:
    """
    Valida JWT do Supabase e retorna o usuário autenticado.
    Falha fechada: qualquer erro → 401.
    """
    token = credentials.credentials
    try:
        payload = jwt.decode(
            token,
            settings.SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated",
        )
        user_id = payload.get("sub")
        email = payload.get("email", "")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token inválido: sub ausente",
            )
        return AuthenticatedUser(id=user_id, email=email, raw_token=token)
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido ou expirado",
        )


def require_role(allowed_roles: list[str]):
    """
    Dependency factory que verifica role do usuário na tabela user_roles.

    Uso:
        @router.get("/admin-only")
        async def admin_endpoint(user=Depends(require_role(["admin"]))):
            ...

    ⚠️ Consulta a tabela user_roles via RPC has_role (security definer).
       Não usa user_metadata do JWT.
    """

    async def _check_role(
        user: AuthenticatedUser = Depends(get_current_user),
    ) -> AuthenticatedUser:
        supabase = get_supabase()

        for role in allowed_roles:
            result = supabase.rpc(
                "has_role", {"_user_id": user.id, "_role": role}
            ).execute()
            if result.data is True:
                return user

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permissão insuficiente",
        )

    return _check_role
