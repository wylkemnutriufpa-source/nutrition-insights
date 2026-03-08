# P2 — Auditoria de Segurança Adicional

> Achados além dos patches P0/P1. Foco em vulnerabilidades exploráveis.
> Baseado na análise do código e arquitetura inferida do projeto.

---

## Achado 1: Endpoints de IA sem validação de input

**Severidade:** Alta  
**Impacto real:** Prompt injection, payload oversized gerando custo elevado na API de IA, possível exfiltração de dados via prompt crafted.  
**Arquivo(s):** `routes/ai_routes.py`, models/schemas de request  

**Detalhes:**  
Os endpoints `/analyze-meal` e `/analyze-body` provavelmente aceitam texto livre do usuário que é repassado diretamente ao modelo de IA. Sem validação:
- Um atacante pode enviar payloads de 1MB+ por request
- Prompt injection pode manipular a resposta da IA
- Strings maliciosas podem ser armazenadas e exibidas sem sanitização (stored XSS)

**Correção mínima:**

```python
# schemas.py ou models.py

from pydantic import BaseModel, Field, validator
import re

class MealRequest(BaseModel):
    description: str = Field(..., min_length=1, max_length=2000)
    image_url: str | None = Field(None, max_length=500)

    @validator("description")
    def sanitize_description(cls, v):
        # Remover caracteres de controle, manter apenas texto legível
        v = v.strip()
        if not v:
            raise ValueError("Description cannot be empty")
        return v

    @validator("image_url")
    def validate_image_url(cls, v):
        if v and not v.startswith(("https://", "http://localhost")):
            raise ValueError("Invalid image URL scheme")
        return v

class BodyRequest(BaseModel):
    height_cm: float = Field(..., gt=30, lt=300)
    weight_kg: float = Field(..., gt=5, lt=500)
    notes: str | None = Field(None, max_length=1000)
```

---

## Achado 2: Falta de autorização por role nos endpoints

**Severidade:** Alta  
**Impacto real:** Qualquer usuário autenticado pode acessar endpoints administrativos. Um paciente pode acessar dados de outros pacientes ou funcionalidades de nutricionista.  
**Arquivo(s):** `routes/*.py`, `auth.py`  

**Detalhes:**  
O `Depends(get_current_user)` valida apenas que o usuário está autenticado, mas não verifica o `user_type` (nutricionista vs paciente). Endpoints como listagem de pacientes, relatórios, ou configurações podem estar acessíveis a qualquer usuário logado.

**Correção mínima:**

```python
# auth.py — adicionar dependency de role

from fastapi import Depends, HTTPException, status

def require_role(allowed_roles: list[str]):
    """Dependency que verifica role do usuário autenticado."""
    async def _check(user=Depends(get_current_user)):
        user_role = user.user_metadata.get("user_type")
        if user_role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions"
            )
        return user
    return _check

# Uso nos endpoints:
@router.get("/patients")
async def list_patients(user=Depends(require_role(["nutritionist", "admin"]))):
    ...

@router.get("/my-meals")
async def my_meals(user=Depends(require_role(["patient", "nutritionist"]))):
    ...
```

> ⚠️ **IMPORTANTE:** Não confie apenas em `user_metadata` do JWT para roles críticas. Valide contra uma tabela `user_roles` no banco (ver padrão descrito nos patches P0).

---

## Achado 3: IDOR — Acesso a recursos de outros usuários

**Severidade:** Alta  
**Impacto real:** Paciente A pode acessar refeições/dados de Paciente B alterando o `patient_id` na URL ou body da request.  
**Arquivo(s):** `routes/meal_routes.py`, `routes/patient_routes.py`, qualquer endpoint que receba `patient_id` como parâmetro  

**Detalhes:**  
Se os endpoints aceitam `patient_id` como parâmetro sem verificar se o usuário autenticado tem permissão para acessar aquele paciente específico, qualquer usuário pode enumerar IDs e acessar dados alheios.

**Correção mínima:**

```python
# Em cada endpoint que recebe patient_id:

@router.get("/patients/{patient_id}/meals")
async def get_patient_meals(
    patient_id: str,
    user=Depends(get_current_user)
):
    user_type = user.user_metadata.get("user_type")
    user_patient_id = user.user_metadata.get("patient_id")

    # Paciente só acessa seus próprios dados
    if user_type == "patient" and user_patient_id != patient_id:
        raise HTTPException(status_code=403, detail="Access denied")

    # Nutricionista: verificar se o paciente pertence a ele
    if user_type == "nutritionist":
        is_linked = await check_nutritionist_patient_link(user.id, patient_id)
        if not is_linked:
            raise HTTPException(status_code=403, detail="Patient not in your care")

    # ... buscar dados
```

---

## Achado 4: Respostas da IA retornadas sem sanitização

**Severidade:** Média  
**Impacto real:** Se a resposta da IA contiver HTML/JS malicioso (via prompt injection ou dados corrompidos), e o frontend renderizar com `dangerouslySetInnerHTML` ou similar, há risco de stored XSS.  
**Arquivo(s):** `routes/ai_routes.py` (backend), componentes React que exibem resultados  

**Correção mínima (backend):**

```python
# utils/sanitize.py

import re

def sanitize_ai_response(text: str) -> str:
    """Remove tags HTML e caracteres perigosos da resposta da IA."""
    # Remover tags HTML
    text = re.sub(r'<[^>]+>', '', text)
    # Remover javascript: URIs
    text = re.sub(r'javascript:', '', text, flags=re.IGNORECASE)
    return text.strip()

# No endpoint:
result = await call_ai_model(prompt)
result["analysis"] = sanitize_ai_response(result["analysis"])
return result
```

**Correção mínima (frontend):**

```jsx
// NUNCA fazer isso com resposta de IA:
// <div dangerouslySetInnerHTML={{ __html: aiResponse }} />

// Em vez disso, renderizar como texto:
<p className="whitespace-pre-wrap">{aiResponse}</p>
```

---

## Achado 5: Sem limite de tamanho no upload de imagens

**Severidade:** Média  
**Impacto real:** Upload de arquivos grandes (100MB+) pode causar DoS no servidor, esgotar storage do Supabase, e gerar custos. Também risco de upload de arquivos não-imagem disfarçados.  
**Arquivo(s):** Endpoint de upload (provavelmente `routes/upload_routes.py` ou integração direta com Supabase Storage)  

**Correção mínima:**

```python
# No endpoint de upload

from fastapi import UploadFile, HTTPException

MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB
ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp"}

@router.post("/upload-image")
async def upload_image(
    file: UploadFile,
    user=Depends(get_current_user)
):
    # Validar content type
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(400, f"File type {file.content_type} not allowed")

    # Validar tamanho (ler em chunks para não estourar memória)
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(400, "File too large (max 5MB)")

    # Validar magic bytes (header do arquivo)
    if not _is_valid_image(contents[:16]):
        raise HTTPException(400, "File is not a valid image")

    # ... upload para Supabase Storage

def _is_valid_image(header: bytes) -> bool:
    """Verifica magic bytes de formatos permitidos."""
    return (
        header[:3] == b'\xff\xd8\xff' or      # JPEG
        header[:8] == b'\x89PNG\r\n\x1a\n' or  # PNG
        header[:4] == b'RIFF'                   # WebP
    )
```

---

## Achado 6: Logs podem conter dados sensíveis de pacientes

**Severidade:** Média  
**Impacto real:** Se requests com dados de saúde (refeições, peso, medidas) forem logados em texto plano, há violação de privacidade (LGPD/HIPAA) e risco se logs forem acessados por terceiros.  
**Arquivo(s):** `server.py`, qualquer middleware de logging  

**Correção mínima:**

```python
# middleware/logging_middleware.py

import logging
from starlette.middleware.base import BaseHTTPMiddleware

SENSITIVE_PATHS = ["/api/analyze-meal", "/api/analyze-body", "/api/patients"]

class SafeLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        # Logar apenas método + path + status, NUNCA o body
        response = await call_next(request)

        log_msg = f"{request.method} {request.url.path} -> {response.status_code}"

        if request.url.path in SENSITIVE_PATHS:
            # Não logar query params nem headers de auth
            logging.info(log_msg)
        else:
            logging.info(f"{log_msg} from={request.client.host}")

        return response

# server.py
app.add_middleware(SafeLoggingMiddleware)
```

---

## Achado 7: Ausência de timeout nas chamadas à API de IA

**Severidade:** Média  
**Impacto real:** Se a API de IA (OpenAI/outro) demorar ou travar, o request do usuário fica pendurado indefinidamente, consumindo conexão do servidor. Sob carga, isso derruba o backend.  
**Arquivo(s):** Serviço/função que chama a API de IA  

**Correção mínima:**

```python
# services/ai_service.py

import httpx
import asyncio
from fastapi import HTTPException

AI_TIMEOUT_SECONDS = 30

async def call_ai_model(prompt: str, model: str = "gpt-4") -> dict:
    try:
        async with httpx.AsyncClient(timeout=AI_TIMEOUT_SECONDS) as client:
            response = await asyncio.wait_for(
                client.post(
                    "https://api.openai.com/v1/chat/completions",
                    json={"model": model, "messages": [{"role": "user", "content": prompt}]},
                    headers={"Authorization": f"Bearer {AI_API_KEY}"},
                ),
                timeout=AI_TIMEOUT_SECONDS
            )
            response.raise_for_status()
            return response.json()
    except (httpx.TimeoutException, asyncio.TimeoutError):
        raise HTTPException(504, "AI service timeout — try again")
    except httpx.HTTPStatusError as e:
        raise HTTPException(502, f"AI service error: {e.response.status_code}")
```

---

## Achado 8: API key de IA possivelmente hardcoded ou em .env sem rotação

**Severidade:** Alta  
**Impacto real:** Se a API key da OpenAI (ou similar) estiver no código-fonte ou em `.env` commitado, qualquer pessoa com acesso ao repo pode usá-la, gerando custos ilimitados.  
**Arquivo(s):** `server.py`, `services/ai_service.py`, `.env`  

**Correção mínima:**

```python
# Verificar que .env NÃO está no repositório
# .gitignore DEVE conter:
# .env
# .env.*

# Usar secrets do Supabase ou variáveis de ambiente do deploy:
import os

AI_API_KEY = os.environ.get("OPENAI_API_KEY")
if not AI_API_KEY:
    raise RuntimeError("OPENAI_API_KEY not configured")

# Em produção: usar Supabase Vault ou secret manager do cloud provider
# NUNCA fazer: AI_API_KEY = "sk-proj-abc123..."
```

**Checklist:**
- [ ] `.env` está no `.gitignore`
- [ ] Nenhum arquivo commitado contém `sk-` ou API keys
- [ ] Key é carregada de variável de ambiente
- [ ] Key tem spending limit configurado no painel da OpenAI

---

## Resumo

| # | Achado | Severidade | Esforço |
|---|--------|-----------|---------|
| 1 | Input sem validação nos endpoints de IA | Alta | Baixo |
| 2 | Sem autorização por role | Alta | Médio |
| 3 | IDOR — acesso a dados de outros usuários | Alta | Médio |
| 4 | Resposta de IA sem sanitização (XSS) | Média | Baixo |
| 5 | Upload sem limite de tamanho/tipo | Média | Baixo |
| 6 | Logs com dados sensíveis de pacientes | Média | Baixo |
| 7 | Sem timeout nas chamadas de IA | Média | Baixo |
| 8 | API key possivelmente exposta | Alta | Baixo |

---

## Ordem de prioridade sugerida

1. **Achado 8** — verificar exposição de API key (risco financeiro imediato)
2. **Achado 3** — IDOR (acesso a dados de outros pacientes)
3. **Achado 2** — autorização por role
4. **Achado 1** — validação de input nos endpoints de IA
5. **Achado 7** — timeout nas chamadas de IA
6. **Achado 5** — limite de upload
7. **Achado 4** — sanitização de resposta de IA
8. **Achado 6** — sanitização de logs

> Última atualização: 2026-03-08
