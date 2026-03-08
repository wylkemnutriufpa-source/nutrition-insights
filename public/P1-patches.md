# P1 — Patches de Correção

> Aplique após os patches P0. Cada seção = 1 commit isolado.

---

## 5. Rate Limiting nos Endpoints de IA

**Problema:** Endpoints `/analyze-meal` e `/analyze-body` sem limite de requisições — risco de abuso e custo elevado com APIs de IA.

### 5a. Instalar dependência

```bash
pip install slowapi
```

### 5b. Configurar rate limiter global

```diff
 # server.py — imports (topo do arquivo)

 from fastapi import FastAPI
+from slowapi import Limiter, _rate_limit_exceeded_handler
+from slowapi.util import get_remote_address
+from slowapi.errors import RateLimitExceeded

+limiter = Limiter(key_func=get_remote_address)
 app = FastAPI()
+app.state.limiter = limiter
+app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
```

### 5c. Aplicar limite nos endpoints de IA

```diff
 # routes/ai_routes.py (ou onde estiverem definidos os endpoints)

+from slowapi import Limiter
+from slowapi.util import get_remote_address
+
+limiter = Limiter(key_func=get_remote_address)

-@router.post("/analyze-meal")
-async def analyze_meal(request: MealRequest, user=Depends(get_current_user)):
+@router.post("/analyze-meal")
+@limiter.limit("10/minute")
+async def analyze_meal(request: Request, meal: MealRequest, user=Depends(get_current_user)):
     # ... lógica existente
```

```diff
-@router.post("/analyze-body")
-async def analyze_body(request: BodyRequest, user=Depends(get_current_user)):
+@router.post("/analyze-body")
+@limiter.limit("5/minute")
+async def analyze_body(request: Request, body: BodyRequest, user=Depends(get_current_user)):
     # ... lógica existente
```

> **Nota:** O `slowapi` exige que o primeiro parâmetro seja `request: Request` (do Starlette) para extrair o IP. Renomeie o parâmetro do body se houver conflito de nome.

### 5d. (Opcional) Limite por usuário autenticado em vez de IP

```diff
 # Para limitar por user_id em vez de IP:

+def get_user_id(request: Request) -> str:
+    # Extrair do token JWT já validado pelo Depends
+    user = request.state.user if hasattr(request.state, "user") else None
+    if user and hasattr(user, "id"):
+        return str(user.id)
+    return get_remote_address(request)

-limiter = Limiter(key_func=get_remote_address)
+limiter = Limiter(key_func=get_user_id)
```

**Teste:** Enviar 11 requests para `/analyze-meal` em 1 minuto → a 11ª deve retornar `429 Too Many Requests`.

---

## 6. TTL no Cache JWKS

**Problema:** O cache de JWKS (JSON Web Key Set) do Supabase não expira, podendo usar chaves revogadas/rotacionadas indefinidamente.

### 6a. Implementar cache com TTL

```diff
 # auth.py ou jwt_utils.py — onde o JWKS é buscado

-import httpx
+import httpx
+import time

-_jwks_cache = None
+_jwks_cache = None
+_jwks_cache_timestamp = 0
+JWKS_TTL_SECONDS = 3600  # 1 hora

 async def get_jwks():
-    global _jwks_cache
-    if _jwks_cache is not None:
+    global _jwks_cache, _jwks_cache_timestamp
+    now = time.time()
+    if _jwks_cache is not None and (now - _jwks_cache_timestamp) < JWKS_TTL_SECONDS:
         return _jwks_cache
 
     jwks_url = f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json"
     async with httpx.AsyncClient() as client:
         response = await client.get(jwks_url)
         response.raise_for_status()
         _jwks_cache = response.json()
+        _jwks_cache_timestamp = now
         return _jwks_cache
```

### 6b. (Opcional) Fallback com refresh forçado em caso de erro de validação

```diff
 # auth.py — na função de validação do JWT

 async def validate_jwt(token: str):
     try:
         jwks = await get_jwks()
         # ... validação com a chave
     except jwt.InvalidSignatureError:
+        # Chave pode ter sido rotacionada — forçar refresh do cache
+        global _jwks_cache, _jwks_cache_timestamp
+        _jwks_cache = None
+        _jwks_cache_timestamp = 0
+        jwks = await get_jwks()
+        # Tentar validar novamente com chaves atualizadas
+        # ... repetir validação
+        # Se falhar novamente, aí sim rejeitar o token
         raise HTTPException(status_code=401, detail="Invalid token")
```

**Teste:**
1. Fazer login → request autenticado funciona
2. Esperar >1h (ou reduzir TTL para teste) → próximo request deve buscar JWKS novo
3. Simular `InvalidSignatureError` → deve tentar refresh antes de rejeitar

---

## Resumo P1

| # | Arquivo | Mudança | Risco |
|---|---------|---------|-------|
| 5 | `server.py` + `routes/ai_routes.py` | Rate limiting com slowapi | Baixo — nova dependência, testar 429 |
| 6 | `auth.py` / `jwt_utils.py` | TTL de 1h no cache JWKS + refresh on failure | Baixo — testar fluxo de login |

> **Dependência nova:** `slowapi` (wrapper de `limits` para FastAPI/Starlette).
> 
> **Limites sugeridos:**
> - `/analyze-meal`: 10 req/min por IP (ou user)
> - `/analyze-body`: 5 req/min por IP (ou user)
> - JWKS TTL: 3600s (1 hora)
> 
> Ajuste os valores conforme o perfil de uso real da aplicação.
