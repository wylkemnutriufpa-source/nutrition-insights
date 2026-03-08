# Checklist Consolidado — Nutrition Dashboard (P0 + P1 + P2)

> Classificação: **Confirmado** = visto no código | **Validar** = precisa verificação manual | **Opcional** = hipótese/risco potencial
>
> Última atualização: 2026-03-08

---

## 1. Confirmado no Código

Itens verificados diretamente na base de código existente.

| # | Prioridade | Correção | Severidade | Impacto Real | Arquivo(s) | Status |
|---|-----------|----------|-----------|-------------|-----------|--------|
| P0-1 | P0 | Mover `logger` para o topo do arquivo | Crítica | `NameError` em runtime — endpoint `/analyze-meal` quebrado | `server.py` | Confirmado |
| P0-2 | P0 | Fail-open → fail-closed no feature enforcement | Crítica | Supabase offline → qualquer usuário acessa features premium | `features.py` | Confirmado |
| P0-3 | P0 | Remover `patient_id` e `user_type` do localStorage | Crítica | XSS pode roubar identidade/role do usuário | `AuthContext.js` + consumidores | Confirmado |
| P0-4 | P0 | CORS: mover antes das rotas + restringir origens | Crítica | Qualquer origem pode fazer requests autenticados | `server.py` | Confirmado |
| P1-5 | P1 | Rate limiting nos endpoints de IA | Alta | Abuso gera custo ilimitado com API de IA | `server.py`, `routes/ai_routes.py` | Confirmado |
| P1-6 | P1 | TTL de 1h no cache JWKS + refresh on failure | Alta | Chaves rotacionadas não são detectadas; tokens inválidos aceitos | `auth.py` / `jwt_utils.py` | Confirmado |

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

## 2. Precisa Validação Manual

Itens com alta probabilidade baseados na arquitetura, mas que precisam de inspeção no código real para confirmar.

| # | Prioridade | Achado | Severidade | Impacto Real | Arquivo(s) | Status |
|---|-----------|--------|-----------|-------------|-----------|--------|
| P2-1 | P2 | Endpoints de IA sem validação de input | Alta | Prompt injection, payload oversized (custo), stored XSS | `routes/ai_routes.py`, schemas | Validar |
| P2-2 | P2 | Falta de autorização por role nos endpoints | Alta | Paciente acessa endpoints de nutricionista e vice-versa | `routes/*.py`, `auth.py` | Validar |
| P2-3 | P2 | IDOR — acesso a recursos de outros usuários | Alta | Paciente A acessa dados de Paciente B alterando ID na URL | `routes/meal_routes.py`, `routes/patient_routes.py` | Validar |
| P2-7 | P2 | Ausência de timeout nas chamadas à API de IA | Média | Request pendurado indefinidamente, DoS sob carga | Serviço de IA (`services/ai_service.py` ou similar) | Validar |
| P2-8 | P2 | API key de IA possivelmente hardcoded ou em .env commitado | Alta | Acesso à API key → custo ilimitado para atacante | `server.py`, `services/ai_service.py`, `.env` | Validar |

### Validação P2 (manual)

- [ ] Verificar se endpoints de IA têm Pydantic schemas com `max_length`
- [ ] Verificar se `Depends(get_current_user)` valida role além de autenticação
- [ ] Verificar se endpoints com `patient_id` na URL validam ownership
- [ ] Verificar se chamadas à API de IA têm timeout explícito
- [ ] Verificar se `.env` está no `.gitignore` e nenhum arquivo commitado contém `sk-`
- [ ] Verificar se API key tem spending limit no painel do provider

---

## 3. Hipótese / Risco Potencial

Itens baseados em padrões comuns de vulnerabilidade. Risco real depende da implementação específica.

| # | Prioridade | Achado | Severidade | Impacto Real | Arquivo(s) | Status |
|---|-----------|--------|-----------|-------------|-----------|--------|
| P2-4 | P2 | Respostas de IA retornadas sem sanitização | Média | Stored XSS se frontend usa `dangerouslySetInnerHTML` | `routes/ai_routes.py`, componentes React | Opcional |
| P2-5 | P2 | Sem limite de tamanho/tipo no upload de imagens | Média | DoS por upload de 100MB+, arquivos não-imagem disfarçados | Endpoint de upload | Opcional |
| P2-6 | P2 | Logs podem conter dados sensíveis de pacientes | Média | Violação LGPD/HIPAA se logs forem acessados por terceiros | `server.py`, middleware de logging | Opcional |

### Validação Hipóteses

- [ ] Verificar se frontend renderiza resposta de IA com `dangerouslySetInnerHTML`
- [ ] Verificar se existe endpoint de upload e se tem validação de tamanho/tipo
- [ ] Verificar se middleware de logging inclui body de requests sensíveis

---

## Ordem de Prioridade Geral

| Ordem | Item | Prioridade | Severidade | Classificação |
|-------|------|-----------|-----------|---------------|
| 1 | P0-1 Logger | P0 | Crítica | Confirmado |
| 2 | P0-2 Fail-closed | P0 | Crítica | Confirmado |
| 3 | P0-3 localStorage | P0 | Crítica | Confirmado |
| 4 | P0-4 CORS | P0 | Crítica | Confirmado |
| 5 | P1-5 Rate limiting | P1 | Alta | Confirmado |
| 6 | P1-6 JWKS TTL | P1 | Alta | Confirmado |
| 7 | P2-8 API key exposure | P2 | Alta | Validar |
| 8 | P2-3 IDOR | P2 | Alta | Validar |
| 9 | P2-2 Role authorization | P2 | Alta | Validar |
| 10 | P2-1 Input validation IA | P2 | Alta | Validar |
| 11 | P2-7 Timeout IA | P2 | Média | Validar |
| 12 | P2-4 Sanitização resposta IA | P2 | Média | Opcional |
| 13 | P2-5 Limite upload | P2 | Média | Opcional |
| 14 | P2-6 Logs sensíveis | P2 | Média | Opcional |

---

## Referências

- Patches P0: [`public/P0-patches.md`](./P0-patches.md)
- Patches P1: [`public/P1-patches.md`](./P1-patches.md)
- Auditoria P2: [`public/P2-auditoria-seguranca.md`](./P2-auditoria-seguranca.md)
- Patches P2 (críticos): [`public/P2-patches.md`](./P2-patches.md)
