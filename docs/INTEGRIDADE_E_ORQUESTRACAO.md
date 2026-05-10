# 🛡️ Levantamento de Integridade & Plano de Orquestração — FitJourney

> Documento operacional. **Não introduz código novo.** Apenas mapeia o que existe hoje, marca status real e define guardrails para que nada que está funcionando seja regredido.
>
> Data do levantamento: 2026-05-10

---

## PARTE 1 — Levantamento do que já existe

### 1. Testes existentes

| Camada | Onde vive | Quantidade | Status |
|---|---|---|---|
| Unitários (Vitest) — motor & helpers | `src/test/*.test.ts`, `src/features/**/*.test.ts` | ~40 arquivos | ✅ Funcional (rodam via `bun run test`) |
| Componentes / fluxos React (Vitest + jsdom) | `src/__tests__/*.test.tsx`, `src/pages/__tests__/*.test.tsx`, `src/tests/*.test.tsx` | ~25 arquivos | ✅ Funcional |
| Integração (Vitest) | `src/test/onboardingBlocking*.integration.test.ts`, `src/tests/error_contract.test.ts` | 3 arquivos | ✅ Funcional |
| Smoke API | `src/tests/smoke_api.test.ts` | 1 | ✅ Funcional |
| E2E (Playwright) | `e2e/*.spec.ts` | 71 specs | ✅ Funcional (rodam via `bun run test:e2e`) |
| Contratos críticos | `src/features/security/services/__tests__/criticalContracts.test.ts` | 1 | ✅ Funcional — **não pode quebrar** |
| Schema integrity | `scripts/verify-snapshot.mjs`, `scripts/test-determinism.mjs` (CI: `.github/workflows/schema-check.yml`) | — | ✅ Funcional |
| Cobertura | `bun run test:coverage` (thresholds 70% statements/branches/functions/lines em `vitest.config.ts`) | — | ✅ Configurada — não medida nesta auditoria (sem execução) |

CI pipeline ativo: `.github/workflows/ci.yml` (lint → typecheck → unit → integração → smoke → e2e) e `schema-check.yml`.

### 2. Motores

| Motor | Localização | Status | Isolamento |
|---|---|---|---|
| **NutriCore V3 / IFJ Engine** (motor clínico oficial) | `src/lib/nutricore_v2/`, `supabase/functions/generate-meal-plan/`, Strategy Consultant | ✅ Funcional | ✅ Isolado: editor V3 grava em `v3_drafts` e só promove para `meal_plans` via `promoteDraftToMealPlan` |
| **Editor V3 (Elite)** | `src/features/editor-v3/` | ✅ Funcional | ✅ Nunca escreve direto em `meal_plans` (mem://arquitetura/editor-v3-persistencia-hibrida-v3-drafts-v1-0-0) |
| **Motor V2 legado** (`MealPlanEditorV2Entry`, `FitJourney2`) | `src/pages/MealPlanEditorV2Entry.tsx`, `src/modules/FitJourney2/` | ✅ Funcional (legado, usado em rotas antigas) | ✅ Isolado do V3 — não compartilha service nem store |

**Conclusão:** V2 e V3 são **independentes**. Não há import cruzado de stores, hooks de draft ou serviços de persistência entre eles.

### 3. Fluxos que funcionam (✅)

- Onboarding de novo paciente (link público `/intake/:token` + auto-cadastro).
- Paciente existente entrando no onboarding (guard `useOnboardingGuard` redireciona para etapa pendente).
- Modo Consultório → cadastro presencial → sincronização para `profiles` (trigger `trg_sync_journey_from_pipeline` + função `sync_patient_data_to_profile`, migration `20260510104203`).
- Editor V3 → gerar plano (Strategy Consultant) → salvar em `v3_drafts` → promover para `meal_plans` → publicar.
- Paciente vê plano em `/my-diet` (rota canônica, mem://arquitetura/rotas-canonicas-de-acesso-do-paciente).
- Substituições com base em equivalência calórica/macros (NutriCore V2 helpers).
- PWA + Realtime (`postgres_changes` invalidando React Query NetworkOnly).

### 4. Fluxos comprovadamente quebrados HOJE

- ⚠️ Runtime atual: `Failed to fetch dynamically imported module: ClientDashboard-*.js` no preview publicado — **chunk antigo cacheado** (resolve no próximo deploy / hard refresh; não é regressão de código).
- Nenhum outro fluxo identificado como quebrado nesta auditoria.

---

## PARTE 2 — Plano de Orquestração

Objetivo: blindar o que já funciona. Sem features novas, sem refactors.

### G1. Triggers de sincronização — proteção contra remoção

Triggers/funções que **nunca** podem ser dropadas sem migration de substituição equivalente:

| Origem | Destino | Mecanismo (existente) |
|---|---|---|
| Modo Consultório (`onboarding_pipelines`) | `profiles` | `trg_sync_journey_from_pipeline` + `sync_patient_data_to_profile()` |
| Avaliação Física (`physical_assessments`) | `profiles` | `sync_patient_data_to_profile()` (consolidada) |
| Anamnese (`patient_anamnesis`) | `profiles` | `sync_patient_data_to_profile()` |
| Onboarding (`onboarding_pipelines`) | `journey_status` em `profiles` | `fn_sync_journey_on_pipeline_change` (mem://arquitetura/sync-pipeline-journey-status-v1-0-0) |
| Vínculo paciente ↔ workspace | `user_tenants` | `trg_ensure_patient_tenant_membership_from_link` + `create_patient_canonical` |

**Regra operacional:** qualquer migration que toque essas funções/triggers deve referenciar este documento e re-executar `src/test/criticalContracts.test.ts` + `src/test/onboardingBlocking.integration.test.ts`.

### G2. RLS — paciente sempre lê o próprio perfil

Garantir que estas policies permaneçam ativas em `profiles`:

- `SELECT` permitido quando `auth.uid() = user_id`.
- `UPDATE` permitido quando `auth.uid() = user_id` (campos próprios).
- Profissional acessa via `has_role('admin')` ou via vínculo em `user_tenants` / `nutritionist_patients` (mem://seguranca/isolamento-multi-tenant-imutavel).

**Nunca:** policy com `USING (false)` em `profiles` para o próprio `user_id`. Nunca remover o vínculo `user_tenants` do paciente sem reemissão imediata via `create_patient_canonical`.

### G3. Isolamento V2 ↔ V3

- V3 só importa de `src/features/editor-v3/**`, `src/lib/nutricore_v2/**`, `supabase/functions/generate-meal-plan/**`.
- V2 só importa de `src/modules/FitJourney2/**` e `src/pages/MealPlanEditor*V2*`.
- Proibido: novo arquivo em `src/features/editor-v3/` importar `src/modules/FitJourney2/` (e vice-versa). Verificável com:
  ```
  rg "from ['\"].*FitJourney2" src/features/editor-v3
  rg "from ['\"].*features/editor-v3" src/modules/FitJourney2
  ```
  Ambos devem retornar **vazio**.

### G4. Teste de sanidade por build

Já existe e cobre os 4 pontos pedidos — **manter rodando no CI** (`.github/workflows/ci.yml`):

| Verificação | Teste responsável (existente) |
|---|---|
| Paciente consegue logar | `e2e/auth.spec.ts`, `src/pages/__tests__/PatientRegisterFlow.test.tsx` |
| Paciente vê o próprio perfil | `e2e/patient-plan-visibility.spec.ts`, `src/__tests__/patientFullJourney.test.tsx` |
| Dashboard carrega sem erro | `e2e/critical-flows.spec.ts`, `src/test/criticalFlows.test.ts`, `src/test/safeguards.test.ts` |
| Nutri abre Editor V3 | `e2e/editor-v3.spec.ts`, `src/__tests__/editorV3RoutingIntegrity.test.ts` |
| Contratos imutáveis | `src/features/security/services/__tests__/criticalContracts.test.ts` |
| Schema do banco | `.github/workflows/schema-check.yml` (`schema:verify` + `test-determinism`) |

**Ação:** nenhum arquivo novo. Apenas garantir que esses jobs continuem **obrigatórios** no merge para `main` (já são, pelo `needs:` encadeado no workflow).

### G5. Checklist antes de qualquer PR que toque banco/auth/motor

1. `bun run lint && bun run typecheck`
2. `bunx vitest run src/features/security/services/__tests__/criticalContracts.test.ts`
3. `bun run test` (Vitest completo)
4. `bun run schema:verify`
5. Se mexeu em RLS/triggers: revisar este documento + memórias `mem://seguranca/isolamento-multi-tenant-imutavel` e `mem://arquitetura/freeze-inteligente-contratos-criticos`.

---

## Resumo executivo

- **Tudo que está funcionando hoje permanece intocado.**
- Motores V2 e V3 já estão isolados — auditável por `rg`.
- Triggers de sincronização estão consolidados em `sync_patient_data_to_profile()` + `trg_sync_journey_from_pipeline` (migration `20260510104203`).
- Bateria de testes de sanidade já existe e roda no CI; não é necessário criar nada novo.
- Este documento é a referência operacional: violar qualquer guardrail (G1–G5) = rejeitar o PR.
