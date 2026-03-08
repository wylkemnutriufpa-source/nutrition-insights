# NutriApp Backend — Referência Segura

> Implementação FastAPI paralela para comparação com o backend principal.
> **Não é frontend.** Não gera UI. Apenas lógica de servidor.

---

## Arquitetura

```
backend/
├── app/
│   ├── main.py              ← Entrypoint FastAPI + middleware
│   ├── config.py             ← Settings via env vars (pydantic-settings)
│   ├── auth/
│   │   └── dependencies.py   ← JWT validation + role guards
│   ├── routes/
│   │   ├── ai_routes.py      ← /analyze-meal, /analyze-body
│   │   ├── meal_routes.py     ← CRUD refeições (c/ proteção IDOR)
│   │   ├── patient_routes.py  ← Listagem pacientes (role-gated)
│   │   └── upload_routes.py   ← Upload imagem (validação tipo/tamanho)
│   ├── schemas/
│   │   ├── ai_schemas.py      ← Pydantic models p/ endpoints IA
│   │   └── common_schemas.py  ← Models p/ meals, patients
│   ├── services/
│   │   ├── ai_service.py      ← Chamada OpenAI c/ timeout + sanitização
│   │   └── supabase_client.py ← Cliente Supabase singleton
│   ├── middleware/
│   │   └── logging_middleware.py ← Log seguro (sem PII)
│   └── utils/
│       └── sanitize.py        ← Sanitização HTML/XSS
├── tests/
│   └── test_core.py          ← Testes de schemas, sanitização, upload
├── requirements.txt
├── pytest.ini
└── README.md                 ← Este arquivo
```

---

## Princípios de Segurança Implementados

| Achado P2 | Mitigação | Arquivo |
|-----------|-----------|---------|
| **P2-8 API Key exposure** | Env vars via pydantic-settings, zero hardcode | `config.py` |
| **P2-3 IDOR** | `_check_patient_access()` valida ownership | `meal_routes.py` |
| **P2-2 Authorization by role** | `require_role()` consulta tabela `user_roles` via RPC | `auth/dependencies.py` |
| **P2-1 Input validation** | Pydantic schemas com max_length, validators | `schemas/*.py` |
| **P2-7 AI timeout** | `httpx` + `asyncio.wait_for` com 30s timeout | `services/ai_service.py` |
| **P2-4 XSS response** | `sanitize_ai_response()` em toda resposta IA | `services/ai_service.py` |
| **P2-5 Upload limits** | Validação content-type + tamanho + magic bytes | `routes/upload_routes.py` |
| **P2-6 Log PII** | Middleware nunca loga body em rotas sensíveis | `middleware/logging_middleware.py` |

---

## Tabelas Supabase Assumidas

> ⚠️ Estas tabelas são **referência**. Confirme se existem no seu banco real.

| Tabela | Campos principais | Nota |
|--------|-------------------|------|
| `user_roles` | `user_id`, `role` (enum: admin, nutritionist, patient) | **Obrigatória** — roles nunca em user_metadata |
| `patients` | `id`, `email`, `name`, `created_at` | Dados do paciente |
| `nutritionist_patients` | `nutritionist_id`, `patient_id` | Vínculo N:1 |
| `meals` | `id`, `patient_id`, `description`, `image_url`, `analysis`, `created_at` | Refeições |

### RPC necessária

```sql
-- Já deve existir no banco (ver patches P0)
create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;
```

---

## Setup

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Configurar .env
cp .env.example .env  # editar com suas credenciais

# Rodar
uvicorn app.main:app --reload --port 8000

# Testes
pytest -v
```

### .env necessário

```env
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...
SUPABASE_JWT_SECRET=your-jwt-secret
OPENAI_API_KEY=sk-...
APP_ENV=development
```

---

## Comparação com Backend Atual

Use este backend como referência para auditar o principal:

1. **Auth:** Compare `auth/dependencies.py` com seu `auth.py` atual
2. **IDOR:** Verifique se `_check_patient_access()` existe nos seus endpoints de meals
3. **Roles:** Confirme que `require_role()` é usado em todos os endpoints sensíveis
4. **Schemas:** Compare validações de input com seus models atuais
5. **Timeouts:** Verifique se chamadas à OpenAI têm timeout explícito

---

> Gerado em 2026-03-08 como implementação de referência paralela.
