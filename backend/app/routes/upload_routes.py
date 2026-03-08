"""
Rota de upload de imagens com validação de tamanho, tipo e magic bytes.
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile

from app.auth.dependencies import get_current_user, AuthenticatedUser
from app.config import get_settings
from app.services.supabase_client import get_supabase

router = APIRouter()
settings = get_settings()

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_SIZE = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024


def _is_valid_image(header: bytes) -> bool:
    """Verifica magic bytes de formatos permitidos."""
    return (
        header[:3] == b"\xff\xd8\xff"          # JPEG
        or header[:8] == b"\x89PNG\r\n\x1a\n"  # PNG
        or header[:4] == b"RIFF"               # WebP
    )


@router.post("/upload-image")
async def upload_image(
    file: UploadFile,
    user: AuthenticatedUser = Depends(get_current_user),
):
    """Upload de imagem com validação rigorosa."""
    # 1. Validar content type
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(400, f"Tipo {file.content_type} não permitido. Use JPEG, PNG ou WebP.")

    # 2. Ler e validar tamanho
    contents = await file.read()
    if len(contents) > MAX_SIZE:
        raise HTTPException(400, f"Arquivo muito grande (máx {settings.MAX_UPLOAD_SIZE_MB}MB)")

    # 3. Validar magic bytes
    if len(contents) < 16 or not _is_valid_image(contents[:16]):
        raise HTTPException(400, "Arquivo não é uma imagem válida")

    # 4. Upload para Supabase Storage
    supabase = get_supabase()
    file_path = f"{user.id}/{file.filename}"

    result = supabase.storage.from_("meal-images").upload(
        file_path, contents, {"content-type": file.content_type}
    )

    public_url = supabase.storage.from_("meal-images").get_public_url(file_path)

    return {"url": public_url, "path": file_path}
