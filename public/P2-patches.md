# P2 — Patches de Correção (Achados Críticos)

> Patches apenas para achados de severidade **Alta** que precisam validação manual.
> Aplique após confirmar que o padrão vulnerável existe no seu código.
> Cada seção = 1 commit isolado.

---

## 8. API Key Exposure Hardening

**Achado:** P2-8 — API key possivelmente hardcoded ou em `.env` commitado.  
**Severidade:** Alta  
**Status:** Validar — aplicar se confirmado.

### 8a. Garantir que `.env` está no `.gitignore`

```diff
 # .gitignore — adicionar se não existir

+.env
+.env.*
+.env.local
+.env.production
```

### 8b. Carregar API key de forma segura

```diff
 # server.py ou services/ai_service.py

-AI_API_KEY = "sk-proj-abc123..."
+import os
+
+AI_API_KEY = os.environ.get("OPENAI_API_KEY")
+if not AI_API_KEY:
+    raise RuntimeError("OPENAI_API_KEY not configured — set via environment variable")
```

### 8c. Verificar histórico do git

```bash
# Buscar chaves vazadas em commits anteriores
git log --all -p | grep -i "sk-" | head -20

# Se encontrar: revogar a chave IMEDIATAMENTE no painel do provider
# e gerar uma nova chave
```

**Teste:**
- [ ] `grep -r "sk-" .` não retorna resultados em arquivos de código
- [ ] `.env` está listado no `.gitignore`
- [ ] Aplicação inicia corretamente com a variável de ambiente configurada
- [ ] API key tem spending limit configurado no painel do provider

---

## 9. IDOR Hardening

**Achado:** P2-3 — Acesso a recursos de outros usuários via manipulação de IDs.  
**Severidade:** Alta  
**Status:** Validar — aplicar em cada endpoint que recebe `patient_id` como parâmetro.

### 9a. Adicionar verificação de ownership

```diff
 # routes/meal_routes.py (ou qualquer endpoint com patient_id na URL)

 @router.get("/patients/{patient_id}/meals")
 async def get_patient_meals(
     patient_id: str,
     user=Depends(get_current_user)
 ):
+    user_type = user.user_metadata.get("user_type")
+    user_patient_id = user.user_metadata.get("patient_id")
+
+    # Paciente só acessa seus próprios dados
+    if user_type == "patient" and user_patient_id != patient_id:
+        raise HTTPException(status_code=403, detail="Access denied")
+
+    # Nutricionista: verificar vínculo com o paciente
+    if user_type == "nutritionist":
+        is_linked = await check_nutritionist_patient_link(user.id, patient_id)
+        if not is_linked:
+            raise HTTPException(status_code=403, detail="Patient not in your care")
+
     # ... buscar dados normalmente
```

### 9b. Função auxiliar de verificação de vínculo

```diff
 # services/patient_service.py ou utils/auth_helpers.py

+from supabase import Client
+
+async def check_nutritionist_patient_link(
+    nutritionist_id: str,
+    patient_id: str
+) -> bool:
+    """Verifica se o nutricionista tem vínculo ativo com o paciente."""
+    result = await supabase.from_("nutritionist_patients") \
+        .select("id") \
+        .eq("nutritionist_id", nutritionist_id) \
+        .eq("patient_id", patient_id) \
+        .eq("active", True) \
+        .execute()
+    return len(result.data) > 0
```

**Teste:**
- [ ] Paciente A tenta acessar `/patients/{paciente_B_id}/meals` → recebe `403`
- [ ] Paciente A acessa `/patients/{seu_proprio_id}/meals` → recebe `200`
- [ ] Nutricionista acessa paciente vinculado → `200`
- [ ] Nutricionista acessa paciente NÃO vinculado → `403`

---

## 10. Authorization by Role Gaps

**Achado:** P2-2 — `Depends(get_current_user)` valida apenas autenticação, não role.  
**Severidade:** Alta  
**Status:** Validar — aplicar se endpoints não verificam `user_type`.

### 10a. Criar dependency de role

```diff
 # auth.py — adicionar após get_current_user

+from fastapi import Depends, HTTPException, status
+
+def require_role(allowed_roles: list[str]):
+    """Dependency que verifica role do usuário autenticado."""
+    async def _check(user=Depends(get_current_user)):
+        user_role = user.user_metadata.get("user_type")
+        if user_role not in allowed_roles:
+            raise HTTPException(
+                status_code=status.HTTP_403_FORBIDDEN,
+                detail="Insufficient permissions"
+            )
+        return user
+    return _check
```

### 10b. Aplicar nos endpoints sensíveis

```diff
 # routes/patient_routes.py

-@router.get("/patients")
-async def list_patients(user=Depends(get_current_user)):
+@router.get("/patients")
+async def list_patients(user=Depends(require_role(["nutritionist", "admin"]))):
     # ... lógica existente
```

```diff
 # routes/ai_routes.py

-@router.post("/analyze-meal")
-async def analyze_meal(request: Request, meal: MealRequest, user=Depends(get_current_user)):
+@router.post("/analyze-meal")
+async def analyze_meal(request: Request, meal: MealRequest, user=Depends(require_role(["patient", "nutritionist"]))):
     # ... lógica existente
```

**Teste:**
- [ ] Paciente tenta `GET /patients` → recebe `403`
- [ ] Nutricionista acessa `GET /patients` → recebe `200`
- [ ] Usuário sem `user_type` no JWT → recebe `403` em todos os endpoints protegidos

---

## 11. Input Validation for AI Endpoints

**Achado:** P2-1 — Endpoints de IA aceitam texto livre sem validação.  
**Severidade:** Alta  
**Status:** Validar — aplicar se schemas não têm `max_length`.

### 11a. Criar/atualizar schemas Pydantic

```diff
 # schemas.py ou models.py

+from pydantic import BaseModel, Field, validator
+
+class MealRequest(BaseModel):
+    description: str = Field(..., min_length=1, max_length=2000)
+    image_url: str | None = Field(None, max_length=500)
+
+    @validator("description")
+    def sanitize_description(cls, v):
+        v = v.strip()
+        if not v:
+            raise ValueError("Description cannot be empty")
+        # Bloquear padrões comuns de prompt injection
+        injection_patterns = ["ignore previous", "system:", "assistant:"]
+        lower_v = v.lower()
+        for pattern in injection_patterns:
+            if pattern in lower_v:
+                raise ValueError("Invalid input detected")
+        return v
+
+    @validator("image_url")
+    def validate_image_url(cls, v):
+        if v and not v.startswith(("https://", "http://localhost")):
+            raise ValueError("Invalid image URL scheme")
+        return v
+
+class BodyRequest(BaseModel):
+    height_cm: float = Field(..., gt=30, lt=300)
+    weight_kg: float = Field(..., gt=5, lt=500)
+    notes: str | None = Field(None, max_length=1000)
```

**Teste:**
- [ ] Request com `description` de 5000 chars → recebe `422`
- [ ] Request com `description` vazio → recebe `422`
- [ ] Request com `image_url` usando `javascript:` → recebe `422`
- [ ] Request com texto contendo "ignore previous instructions" → recebe `422`
- [ ] Request válido → funciona normalmente

---

## 12. Timeout for AI Calls

**Achado:** P2-7 — Chamadas à API de IA sem timeout explícito.  
**Severidade:** Média  
**Status:** Validar — aplicar se não houver timeout configurado.

### 12a. Adicionar timeout nas chamadas

```diff
 # services/ai_service.py (ou onde a API de IA é chamada)

-import httpx
+import httpx
+import asyncio
+from fastapi import HTTPException

+AI_TIMEOUT_SECONDS = 30

 async def call_ai_model(prompt: str, model: str = "gpt-4") -> dict:
-    async with httpx.AsyncClient() as client:
-        response = await client.post(
-            "https://api.openai.com/v1/chat/completions",
-            json={"model": model, "messages": [{"role": "user", "content": prompt}]},
-            headers={"Authorization": f"Bearer {AI_API_KEY}"},
-        )
-        return response.json()
+    try:
+        async with httpx.AsyncClient(timeout=AI_TIMEOUT_SECONDS) as client:
+            response = await asyncio.wait_for(
+                client.post(
+                    "https://api.openai.com/v1/chat/completions",
+                    json={"model": model, "messages": [{"role": "user", "content": prompt}]},
+                    headers={"Authorization": f"Bearer {AI_API_KEY}"},
+                ),
+                timeout=AI_TIMEOUT_SECONDS
+            )
+            response.raise_for_status()
+            return response.json()
+    except (httpx.TimeoutException, asyncio.TimeoutError):
+        raise HTTPException(504, "AI service timeout — try again later")
+    except httpx.HTTPStatusError as e:
+        raise HTTPException(502, f"AI service error: {e.response.status_code}")
```

**Teste:**
- [ ] Simular timeout (mock API com delay >30s) → recebe `504`
- [ ] API retorna erro 500 → recebe `502` (não erro genérico)
- [ ] Request normal → funciona dentro do tempo

---

## Resumo de Patches P2

| # | Patch | Severidade | Arquivo(s) | Pré-condição |
|---|-------|-----------|-----------|-------------|
| 8 | API key hardening | Alta | `server.py`, `.gitignore` | Confirmar que key está exposta |
| 9 | IDOR hardening | Alta | `routes/meal_routes.py`, `routes/patient_routes.py` | Confirmar que ownership não é verificado |
| 10 | Role authorization | Alta | `auth.py`, `routes/*.py` | Confirmar que `get_current_user` não verifica role |
| 11 | Input validation IA | Alta | `schemas.py`, `routes/ai_routes.py` | Confirmar que schemas não têm `max_length` |
| 12 | Timeout IA | Média | `services/ai_service.py` | Confirmar que não há timeout explícito |

> **IMPORTANTE:** Cada patch deve ser aplicado apenas APÓS confirmar que a vulnerabilidade existe no código real. Não aplicar cegamente.
>
> Ordem sugerida: 8 → 9 → 10 → 11 → 12
