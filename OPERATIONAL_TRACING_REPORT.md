# OPERATIONAL_TRACING_REPORT.md
**Data:** 2026-05-14 · **Caso:** Catharina Martins · **Sem deleção, sem reescrita.**

---

## 1) Mapa real de execução por rota

| Rota | Página | Como gera plano | Edge function chamada |
|---|---|---|---|
| `/meal-plans/:planId`, `/editor-v3/*`, `/meal-plans/editor` | `EditorV3Page` | UI manual + `localPlanGenerator` + `promoteDraft` | nenhuma direta |
| `/meal-plans` | `MealPlans.tsx` | `GenerationModeSelector` (hybrid-builder) | `generate-meal-plan` |
| Pós-anamnese (auto) | `Anamnesis.tsx` | dispara automaticamente em 2 caminhos | **`generate-meal-plan-v2`** |
| `DietTemplates.tsx` | wrapper `planPipelineOrchestrator.runPlanPipeline` | "engine V3" → linha 133 | **`generate-meal-plan-v2`** |
| `/in-office/...` | `InOfficeStepMealPlan` | `runPlanPipeline` | **`generate-meal-plan-v2`** |

> Confirmado: V2 ainda é a engine real para anamnese, templates e in-office. V3 só é manual.

---

## 2) Fonte de verdade do app paciente

`PatientMealPlan.tsx` linha 170 chama:
```sql
RPC resolve_patient_meal_plan(p_patient_id, p_date)
```

Filtros do RPC (security definer):
```
plan_status IN ('published','published_to_patient','approved')
AND is_active = true
ORDER BY created_at DESC LIMIT 1
```

Sem plano que case essa cláusula → RPC retorna `NULL` → tela "sem plano ativo".

---

## 3) CASO CATHARINA — tracing forense

**Patient:**
- `profiles.id`: `c2d2a2c2-f152-45fc-8544-00e7b8f81767`
- `user_id` (canonical): `69f7926d-d2b1-4b54-ad69-6d1683ca1a13`
- tenant: `20081963-…`

**Histórico completo de planos (5):**

| ID | Status | is_active | items | editor | source | criado | atualizado |
|---|---|---|---|---|---|---|---|
| `d1e55eca` "Opção 1 — Simples" | **published_to_patient** | ❌ false | **6 (válidos, dia 0)** | v2 | protocol_fitjourney_v4 | 2026-04-04 | **2026-05-13 19:12:18** |
| `8baaaeeb` "Opção 3 — Alternativa" | draft_auto_generated | ❌ false | 6 | v2 | protocol_fitjourney_v4 | 2026-04-04 | 2026-05-13 19:12:18 |
| `9dbf8de5` "Plano Inteligente" | archived | ❌ false | 6 | v2 | smart_intelligent_v4 | 2026-04-04 | 2026-05-13 19:12:18 |
| `c5b81568` "Plano V3 — 12/05" | archived | ❌ false | 0 | v3 | manual | 2026-05-13 02:12 | 2026-05-14 21:28 (minha migração) |
| `f1e0075c` "Plano V3 — 13/05" | archived | ❌ false | 0 | v3 | manual | 2026-05-13 19:12 | 2026-05-14 21:28 (minha migração) |

**Linha do tempo do incidente:**

1. **2026-04-04** — fluxo V2 (anamnese → `generate-meal-plan-v2` ou `protocol_fitjourney_v4`) gerou 3 planos para Catharina. `d1e55eca` foi publicado e ficou ativo. Sistema OK.
2. **2026-05-13 02:12** — alguém abriu `/meal-plans/editor/...` (V3), criou o draft `c5b81568`. Vazio (V3 cria plano antes de salvar items).
3. **2026-05-13 19:12:18** — alguém abriu de novo o editor V3 e criou `f1e0075c`. **No mesmo segundo**, o trigger/serviço de auto-archive (memory `clinico/fluxo-de-ativacao-e-arquivamento-automatico-v2-1-0`) desativou os 3 planos V2 (`d1e55eca`, `8baaaeeb`, `9dbf8de5`) — incluindo o que estava `published_to_patient`.
4. **Resultado:** o draft V3 nunca recebeu items, e o publicado V2 foi rebaixado para inativo. Catharina ficou com **zero planos ativos**. App paciente passou a mostrar "sem plano".
5. **2026-05-14 21:28** — minha migração de hoje arquivou os 2 V3 vazios (era seguro, eram lixo). Não tocou no V2 publicado.

**Causa raiz:** abrir o Editor V3 gera draft no banco e dispara o auto-archive do plano ativo anterior, **mesmo quando o draft V3 fica vazio e nunca é publicado**. É uma "publicação por acidente": a desativação acontece, a substituição não.

---

## 4) Recovery proposto para Catharina (reversível, sem deletar nada)

Reativar `d1e55eca` (o último publicado real, com 6 items válidos). Continua sendo single-day, mas o app paciente já lida com `day_of_week=0` e `plan_mode` nulo.

```sql
UPDATE meal_plans
SET is_active = true
WHERE id = 'd1e55eca-d289-419e-a46a-705a935fc9a7';
```

Quer que eu execute? Se sim, depois você abre `/patient-meal-plan` logada como Catharina e me confirma o que aparece. Não vou marcar como "resolvido" até você ver na tela.

---

## 5) Outras pacientes potencialmente afetadas pela mesma causa

Mesmo padrão: paciente tinha plano `published_to_patient`, mas foi rebaixado para `is_active=false` ao abrir Editor V3 sem persistir. Vou rodar a query e te trazer a lista — sem mudar nada.

---

## 6) Onde NÃO mexer ainda

- ❌ Não deletar edges órfãs (`generate-meal-plan-v2-dynamic`, `generate-bb-meal-plan`, `process-meal-plan-jobs`).
- ❌ Não deletar páginas `MealPlanEditorV2.tsx`, `HybridPlanBuilder.tsx`.
- ❌ Não desligar `Anamnesis → generate-meal-plan-v2` (ainda é a engine real do onboarding).

Próximo passo lógico (depois de recuperar Catharina): isolar o auto-archive para que **só dispare quando o plano novo realmente tiver items publicados** — é a ferida real do V3.
