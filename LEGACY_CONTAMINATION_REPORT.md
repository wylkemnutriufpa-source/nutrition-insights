# LEGACY_CONTAMINATION_REPORT.md
**Data:** 2026-05-14 · **Escopo:** mapa real de V2/legacy ainda interferindo no V3

---

## 1) EDGE FUNCTIONS — quem está vivo

| Edge | Status | Callers em `src/` (produção) |
|---|---|---|
| `generate-meal-plan` | 🟢 **ATIVO** (idempotente, faz DELETE→INSERT) | `MealPlans.tsx`, `GenerationModeSelector` (5×), `SmartPlanGenerator`, `BBPlanGenerator` |
| `generate-meal-plan-v2` | 🟡 **ATIVO** (acabei de patchear DELETE→INSERT) | `planPipelineOrchestrator.ts`, **`Anamnesis.tsx` (2×)** |
| `validate-meal-plan` | 🟢 **ATIVO** | `mealPlanValidationFlow`, `AutoFixButton`, `MealPlanEditorV2`, `PlanAuditPanel` |
| `generate-meal-plan-v2-dynamic` | 🪦 **MORTO** | nenhum caller no `src/` |
| `generate-bb-meal-plan` | 🪦 **MORTO** | nenhum caller (apesar do nome, `BBPlanGenerator` chama `generate-meal-plan`) |
| `process-meal-plan-jobs` | 🪦 **MORTO** | nenhum caller no `src/` |

---

## 2) PÁGINAS / ROTAS — o que está montado

| Arquivo | Rota? | Categoria |
|---|---|---|
| `features/editor-v3/EditorV3Page` | ✅ `/meal-plans/:planId`, `/editor-v3/*`, `/meal-plans/editor*` | 🟢 **V3 PURO** |
| `pages/MealPlans.tsx` | ✅ `/meal-plans` | 🟠 **PARALELO V2** — usa `hybrid-builder` + chama `generate-meal-plan` direto |
| `pages/V3LibrarySandbox.tsx` | ✅ `/sandbox-v3` (admin + flag) | 🟢 **V3 isolado** |
| `pages/MealPlanEditorV2.tsx` | ❌ **sem rota** | 🪦 **MORTO mas importável** (ainda compila no bundle se importado) |
| `pages/MealPlanEditorV2Entry.tsx` | ❌ sem rota | 🪦 **MORTO** |
| `pages/HybridPlanBuilder.tsx` | ❌ sem rota | 🪦 **MORTO** |

> A rota `/meal-plans` continua viva e usa `GenerationModeSelector` (do `hybrid-builder`) renderizado num painel à direita. Isso é a porta de entrada V2 que ainda existe pra quem cai nessa página.

---

## 3) STORES / COMPONENTES LEGADOS — ainda referenciados

| Caminho | Estado | Quem ainda importa |
|---|---|---|
| `src/stores/mealPlanEditorV2Store.ts` | 🟠 **VIVO** | `meal-editor-v2/*`, `hybrid-builder/*`, `MealPlans.tsx`, `MealPlanEditorV2.tsx` |
| `src/components/meal-editor-v2/*` (30 arquivos) | 🟠 **VIVO** | `hybrid-builder/*`, `MealPlans.tsx`, `meal-simplification/*`, `patient/MealDetail*`, `PlanAuditPanel`, `MealPlanEditorV2.tsx` |
| `src/components/hybrid-builder/*` | 🟠 **VIVO** | `MealPlans.tsx` (rota viva), `DietTemplates.tsx`, `HybridPlanBuilder.tsx` (rota morta), `MealPlanEditorV2.tsx` (rota morta) |
| `src/lib/planPipelineOrchestrator.ts` | 🟠 **WRAPPER → V2** | `DietTemplates.tsx`, `autoFixEngine.ts`, `MealPlanEditorV2.tsx` (morto), `InOfficeStepMealPlan.tsx`, testes |
| `src/lib/assistedPlanGenerator.ts`, `mealPlanAutoGenerator.ts`, `strategyAdvisor.ts` | 🟡 **VIVO** (sem invoke direto, mas chama outros) | grep não achou `functions.invoke` direto — auditar em separado |

---

## 4) FALLBACKS HÍBRIDOS / LEITURAS DUPLAS

- **`Anamnesis.tsx`** — após salvar a anamnese, dispara `generate-meal-plan-v2` automaticamente em **2 caminhos** (pipeline mode + standard flow). Todo paciente novo nasce passando pela V2.
- **`planPipelineOrchestrator.runPlanPipeline()`** — apresentado como "engine central V3", mas na linha 133 chama `generate-meal-plan-v2`. Falsamente unificado.
- **`MealPlans.tsx`** — fluxo paralelo: lê `meal_plans` direto e gera via `generate-meal-plan` sem passar pelo Editor V3.
- **Editor V3 tem brecha de escrita direta**: `src/features/editor-v3/services/localPlanGenerator.ts:132` faz `supabase.from('meal_plan_items').insert(...)` — viola o contrato "Editor V3 NUNCA escreve direto na clínica" (memory `arquitetura/editor-v3-persistencia-hibrida-v3-drafts-v1-0-0`). A via legítima é só `promoteDraft`.

---

## 5) CLASSIFICAÇÃO FINAL

### 🟢 SEGURO (V3 puro)
- `features/editor-v3/EditorV3Page` (rota canônica)
- `features/editor-v3/services/promoteDraft.ts`
- Edge `generate-meal-plan` (idempotente, com DELETE-then-INSERT)

### 🟡 CONTAMINADO (vivo, mas funcional após o patch)
- Edge `generate-meal-plan-v2` (idempotência adicionada hoje)
- `planPipelineOrchestrator.ts` (wrapper que ainda aponta pra V2)
- `Anamnesis.tsx` (geração automática via V2)

### 🟠 RISCO CRÍTICO (caminho paralelo ao V3, ainda em rota)
- `pages/MealPlans.tsx` → `/meal-plans` (porta de entrada paralela ao Editor V3)
- `components/hybrid-builder/*` (usado por essa rota)
- `components/meal-editor-v2/*` (cross-importado por componentes vivos do paciente)
- `src/features/editor-v3/services/localPlanGenerator.ts` (V3 escrevendo fora do contrato)

### 🪦 LEGADO MORTO (arquivos existem, sem rota, sem caller)
- Edges: `generate-meal-plan-v2-dynamic`, `generate-bb-meal-plan`, `process-meal-plan-jobs`
- Páginas: `MealPlanEditorV2.tsx`, `MealPlanEditorV2Entry.tsx`, `HybridPlanBuilder.tsx`

---

## 6) RECOMENDAÇÃO MÍNIMA E SEGURA

Sem reescrever nada agora — só remoção cirúrgica:

1. **Deletar 3 edges mortas** (`generate-meal-plan-v2-dynamic`, `generate-bb-meal-plan`, `process-meal-plan-jobs`).
2. **Deletar 3 páginas órfãs** (`MealPlanEditorV2.tsx`, `MealPlanEditorV2Entry.tsx`, `HybridPlanBuilder.tsx`).
3. **Apontar `Anamnesis.tsx` (2 chamadas) e `planPipelineOrchestrator.ts` para `generate-meal-plan`** (a edge idempotente principal). Aposenta a V2.
4. **Decidir `MealPlans.tsx`**: ou redireciona pra Editor V3, ou mantém isolado mas remove a dependência de `hybrid-builder/GenerationModeSelector`.
5. **Fechar a brecha do `localPlanGenerator.ts` no V3** (forçar tudo via `promoteDraft`).
6. Após (3), (4): remover `hybrid-builder/`, `meal-editor-v2/`, `mealPlanEditorV2Store`, `planPipelineOrchestrator.ts`.

> Nada disso quebra o Editor V3 — são só nós paralelos sendo cortados.

---

## 7) VEREDITO

V3 está isolado **arquiteturalmente** (rota, persistência via promoteDraft).
V3 **não** está isolado **operacionalmente**:
- toda anamnese ainda dispara V2;
- a rota `/meal-plans` ainda existe como universo paralelo V2;
- o orquestrador "V3" é wrapper de V2;
- 30 componentes `meal-editor-v2/*` continuam carregados por componentes do paciente.

Enquanto esses 4 pontos não forem cortados, o V3 herda silenciosamente todo o comportamento da V2.
