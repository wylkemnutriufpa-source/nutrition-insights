# Checklist Consolidado — Nutrition Dashboard (P0 + P1 + P2)

> Classificação: **Confirmado** = visto no código | **Validar** = precisa verificação manual no repo backend | **N/A** = não aplicável
>
> ⚠️ O backend (FastAPI) está fora deste workspace. Itens P2 não podem ser verificados automaticamente — requerem inspeção manual no repositório do servidor.
>
> Última atualização: 2026-03-08

---

## 1. Confirmado no Código

Itens verificados diretamente na base de código (compartilhados em análise anterior).

| # | Prioridade | Correção | Severidade | Impacto Real | Arquivo(s) | Status |
|---|-----------|----------|-----------|-------------|-----------|--------|
| P0-1 | P0 | Mover `logger` para o topo do arquivo | Crítica | `NameError` em runtime — endpoint `/analyze-meal` quebrado | `server.py` | ✅ Confirmado |
| P0-2 | P0 | Fail-open → fail-closed no feature enforcement | Crítica | Supabase offline → qualquer usuário acessa features premium | `features.py` | ✅ Confirmado |
| P0-3 | P0 | Remover `patient_id` e `user_type` do localStorage | Crítica | XSS pode roubar identidade/role do usuário | `AuthContext.js` + consumidores | ✅ Confirmado |
| P0-4 | P0 | CORS: mover antes das rotas + restringir origens | Crítica | Qualquer origem pode fazer requests autenticados | `server.py` | ✅ Confirmado |
| P1-5 | P1 | Rate limiting nos endpoints de IA | Alta | Abuso gera custo ilimitado com API de IA | `server.py`, `routes/ai_routes.py` | ✅ Confirmado |
| P1-6 | P1 | TTL de 1h no cache JWKS + refresh on failure | Alta | Chaves rotacionadas não são detectadas; tokens inválidos aceitos | `auth.py` / `jwt_utils.py` | ✅ Confirmado |

### Validação P0

- [ ] `POST /analyze-meal` não dá `NameError`
- [ ] Supabase offline → features retornam `403` (não `200`)
- [ ] Após login, `localStorage` não contém `patient_id` nem `user_type`
- [ ] Request de origem não listada recebe erro CORS
- [ ] Request de origem listada funciona normalmente

### Validação P1

- [ ] 11ª request para `/analyze-meal` em 1min → `429`
- [ ] 6ª request para `/analyze-body` em 1min → `429`
- [ ] Após 1h, JWKS é buscado novamente
- [ ] `InvalidSignatureError` → refresh automático antes de rejeitar

---

## 2. Precisa Validação Manual (Backend Externo)

> ⚠️ **Estes itens não podem ser verificados neste workspace.**
> O backend FastAPI está em repositório separado. Para cada item, execute o comando de verificação indicado no repo do servidor.

| # | Prioridade | Achado | Severidade | Como Verificar | Status |
|---|-----------|--------|-----------|---------------|--------|
| P2-8 | P2 | API key de IA possivelmente hardcoded | Alta | `grep -rn "sk-" . --include="*.py"` + verificar se `.env` está no `.gitignore` | 🔍 Validar no repo backend |
| P2-3 | P2 | IDOR — acesso a recursos de outros usuários | Alta | Buscar endpoints com `patient_id` na URL e verificar se há check de ownership antes do query | 🔍 Validar no repo backend |
| P2-2 | P2 | Falta de autorização por role | Alta | Verificar se `Depends(get_current_user)` é o único guard — buscar `Depends(` em `routes/*.py` | 🔍 Validar no repo backend |
| P2-1 | P2 | Endpoints de IA sem validação de input | Alta | Verificar schemas Pydantic dos endpoints `/analyze-meal` e `/analyze-body` — buscar `max_length` | 🔍 Validar no repo backend |
| P2-7 | P2 | Ausência de timeout nas chamadas à API de IA | Média | Buscar `httpx.AsyncClient(` ou `requests.post(` e verificar se `timeout=` está presente | 🔍 Validar no repo backend |

### Comandos de Verificação Rápida

```bash
# No repositório do backend, execute:

# P2-8: API key exposure
grep -rn "sk-" . --include="*.py"
grep -rn "OPENAI_API_KEY" . --include="*.py"
cat .gitignore | grep -i env

# P2-3: IDOR
grep -rn "patient_id" routes/ --include="*.py"
# → Verificar se cada ocorrência tem check de ownership

# P2-2: Role authorization
grep -rn "Depends(get_current_user)" routes/ --include="*.py"
# → Se for o único Depends, falta role check

# P2-1: Input validation
grep -rn "max_length\|Field(" models/ schemas/ --include="*.py"
# → Se não houver resultados, falta validação

# P2-7: Timeout
grep -rn "timeout" services/ --include="*.py"
# → Se não houver resultados, falta timeout
```

---

## 3. Hipótese / Risco Potencial

Itens de severidade média baseados em padrões comuns. Menor prioridade.

| # | Prioridade | Achado | Severidade | Como Verificar | Status |
|---|-----------|--------|-----------|---------------|--------|
| P2-4 | P2 | Respostas de IA sem sanitização | Média | Buscar `dangerouslySetInnerHTML` no frontend + verificar se backend strip HTML da resposta | 🔍 Validar |
| P2-5 | P2 | Sem limite de upload de imagens | Média | Buscar endpoint de upload e verificar `MAX_FILE_SIZE` ou validação de content-type | 🔍 Validar |
| P2-6 | P2 | Logs com dados sensíveis | Média | Verificar middleware de logging — buscar `logger.info(` com body ou PII | 🔍 Validar |

---

## Ordem de Prioridade Geral

| Ordem | Item | Severidade | Status | Próximo Passo |
|-------|------|-----------|--------|---------------|
| 1 | P0-1 Logger | Crítica | ✅ Confirmado | Aplicar patch P0 |
| 2 | P0-2 Fail-closed | Crítica | ✅ Confirmado | Aplicar patch P0 |
| 3 | P0-3 localStorage | Crítica | ✅ Confirmado | Aplicar patch P0 |
| 4 | P0-4 CORS | Crítica | ✅ Confirmado | Aplicar patch P0 |
| 5 | P1-5 Rate limiting | Alta | ✅ Confirmado | Aplicar patch P1 |
| 6 | P1-6 JWKS TTL | Alta | ✅ Confirmado | Aplicar patch P1 |
| 7 | P2-8 API key | Alta | 🔍 Validar | Rodar `grep -rn "sk-"` no backend |
| 8 | P2-3 IDOR | Alta | 🔍 Validar | Inspecionar endpoints com `patient_id` |
| 9 | P2-2 Role auth | Alta | 🔍 Validar | Inspecionar `Depends(` nos routes |
| 10 | P2-1 Input validation | Alta | 🔍 Validar | Verificar schemas Pydantic |
| 11 | P2-7 Timeout IA | Média | 🔍 Validar | Buscar `timeout=` nas chamadas HTTP |
| 12 | P2-4 Sanitização | Média | 🔍 Validar | Buscar `dangerouslySetInnerHTML` |
| 13 | P2-5 Upload | Média | 🔍 Validar | Buscar endpoint de upload |
| 14 | P2-6 Logs | Média | 🔍 Validar | Inspecionar middleware de logging |

---

## Referências

- Patches P0: [`public/P0-patches.md`](./P0-patches.md)
- Patches P1: [`public/P1-patches.md`](./P1-patches.md)
- Auditoria P2: [`public/P2-auditoria-seguranca.md`](./P2-auditoria-seguranca.md)
- Patches P2 (críticos): [`public/P2-patches.md`](./P2-patches.md)
