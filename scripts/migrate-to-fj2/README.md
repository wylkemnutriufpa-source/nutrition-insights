# Migração FJ1.0 → FJ2.0 (pacientes)

Script **local** (não edge function) que migra pacientes do FJ1.0 (este projeto) para o FJ2.0.

## O que migra

Por paciente:
- `full_name` (de `profiles.full_name`)
- `email` (de `auth.users.email`)
- `nutritionist_id` (mapeado por email FJ1.0 → FJ2.0, falha-duro se ausente)
- `created_at` original (preservado)
- `source_legacy_id` = `auth.users.id` do FJ1.0 (idempotência)

E também:
- Cria `auth.users` no FJ2.0 com senha aleatória descartada, `email_confirm=true`
- Seta `app_metadata.needs_password_change=true` (write-only via service_role)
- Insere `patient_consents` com `consent_type='legacy_migration_v1'`, `consent_version='fj1.0'`, `accepted_at` = `created_at` original
- Gera **recovery link** por paciente e grava em CSV pra envio posterior

**Não migra:** telefone, sexo, data de nascimento, status, planos, anamneses, check-ins. Paciente refaz a anamnese V2 ao entrar.

## Pré-requisitos no FJ2.0 (já feitos pelo agente do destino)

- ✅ `patients.source_legacy_id text` com UNIQUE parcial
- ✅ Tabela `patient_consents` existe
- ✅ Sem trigger em `patients.created_at`

## Setup

```bash
cd scripts/migrate-to-fj2
cp .env.example .env
# Edite .env com as duas service_role keys
```

**Onde pegar as keys:**
- FJ1.0 (origem): Cloud → Settings → API Keys → service_role
- FJ2.0 (destino): mesmo caminho no projeto FitJourney2.0

⚠️ **Nunca commitar `.env`.** Já está no `.gitignore` deste subdir.

## Execução

### 1. DryRun obrigatório (relatório sem escrever)

```bash
bun --env-file=scripts/migrate-to-fj2/.env run scripts/migrate-to-fj2/migrate-patients.ts
```

Sai relatório:
- total de pacientes na origem
- nutris ausentes no destino (BLOQUEIO)
- colisões de email já existentes no FJ2.0 (skip)
- já migrados (source_legacy_id existente, skip)
- pacientes prontos pra migrar
- distribuição por nutricionista

**Se houver bloqueio (nutri ausente), aborte e crie o nutri manualmente no FJ2.0 antes de seguir.**

### 2. Execução real

```bash
DRY_RUN=false bun run scripts/migrate-to-fj2/migrate-patients.ts
```

Gera dois arquivos em `scripts/migrate-to-fj2/output/`:
- `report-<timestamp>.json` — auditoria completa
- `recovery-links-<timestamp>.csv` — emails + links de definição de senha (uma linha por paciente)

### 3. Envio dos recovery links

O CSV tem: `email,full_name,recovery_link,expires_at`. Você escolhe:
- **Lovable Emails (FJ2.0):** importa o CSV num batch script de email (transactional) lá no destino
- **Manual:** envia via Mailchimp/Resend/Gmail em batches

Cada link é válido por 24h (padrão do Supabase `generateLink`). Pode regerar pra quem não clicar.

### 4. Rotação de chaves (obrigatório pós-migração)

- No FJ1.0: ferramenta `supabase--rotate_api_keys` aqui
- No FJ2.0: mesma coisa no destino
- Apague o `.env` local

## Idempotência

Reexecutável. `source_legacy_id` é UNIQUE no destino — pacientes já migrados são pulados, não duplicam.

## O que NÃO faz

- Não cria nutricionistas no destino (falha-duro se ausente)
- Não envia email automaticamente (gera CSV)
- Não migra planos/anamneses/check-ins
- Não promete que paciente vai conseguir logar (precisa clicar no recovery link primeiro)
