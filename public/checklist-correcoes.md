# Checklist de Correções — Nutrition Dashboard

> Marque com `[x]` conforme aplicar cada patch.

---

## P0 — Críticas (aplicar imediatamente)

| # | Correção | Arquivo(s) | Status |
|---|----------|-----------|--------|
| 1 | [ ] Mover `logger` para o topo do arquivo | `server.py` | |
| 2 | [ ] Fail-open → fail-closed no feature enforcement | `features.py` | |
| 3 | [ ] Remover `patient_id` e `user_type` do localStorage | `AuthContext.js` + componentes consumidores | |
| 4 | [ ] CORS: mover antes das rotas + restringir origens | `server.py` | |

### Validação P0

- [ ] `POST /analyze-meal` não dá `NameError`
- [ ] Supabase offline → features retornam `403` (não `200`)
- [ ] Após login, `localStorage` não contém `patient_id` nem `user_type`
- [ ] Request de origem não listada recebe erro CORS
- [ ] Request de origem listada funciona normalmente

---

## P1 — Importantes (aplicar em seguida)

| # | Correção | Arquivo(s) | Status |
|---|----------|-----------|--------|
| 5 | [ ] Rate limiting nos endpoints de IA (slowapi) | `server.py`, `routes/ai_routes.py` | |
| 6 | [ ] TTL de 1h no cache JWKS + refresh on failure | `auth.py` / `jwt_utils.py` | |

### Validação P1

- [ ] 11ª request para `/analyze-meal` em 1min → `429`
- [ ] 6ª request para `/analyze-body` em 1min → `429`
- [ ] Após 1h, JWKS é buscado novamente
- [ ] `InvalidSignatureError` → refresh automático antes de rejeitar

---

## Fora de escopo (backlog)

| Item | Prioridade |
|------|-----------|
| Migração CRA → Vite | P2 |
| Consolidação MongoDB + PostgreSQL | P2 |
| `on_event` → `lifespan` (deprecation) | P3 |
| Rotas duplicadas menores | P3 |

---

## Referências

- Patches P0: [`public/P0-patches.md`](./P0-patches.md)
- Patches P1: [`public/P1-patches.md`](./P1-patches.md)

> Última atualização: 2026-03-08
