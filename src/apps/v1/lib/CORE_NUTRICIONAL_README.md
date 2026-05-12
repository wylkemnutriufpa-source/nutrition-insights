# 🔒 FitJourney — Core Nutricional v8.0.0 (Congelado)

> **Status:** ESTÁVEL — NÃO MODIFICAR SEM CHECKLIST DE REGRESSÃO  
> **Data de congelamento:** 2026-04-07  
> **Responsável:** Arquitetura Core

---

## 1. ENGINE OFICIAL

**`supabase/functions/generate-meal-plan/index.ts`**

- Única engine autorizada para gerar planos alimentares
- Recebe dados do onboarding do paciente (TMB, metas, restrições)
- Resolve `visual_library_item_id` no momento da geração
- Persiste em `meal_plan_items` como fonte de verdade

## 2. FONTE DE VERDADE

| Camada | Arquivo/Tabela |
|--------|---------------|
| **Regras canônicas** | `supabase/functions/_shared/food-rules.ts` |
| **Motor de descrição** | `supabase/functions/_shared/meal-description.ts` |
| **Persistência** | Tabela `meal_plan_items` (banco de dados) |
| **Orquestrador cliente** | `src/lib/planPipelineOrchestrator.ts` (wrapper) |

## 3. REGRAS CANÔNICAS ATIVAS

### food-rules.ts (fonte única)
- `BLOCKED_FOODS` — alimentos proibidos na geração
- `REPLACEMENTS` — substituições automáticas
- `SUBSTITUTION_GROUPS` — grupos de equivalência
- `MEAL_KCAL_SPLIT` — distribuição calórica (café 20%, almoço 30%, jantar 22%, etc.)
- `getProteinDistribution()` — shares e caps proteicos por refeição e objetivo

### meal-description.ts (fonte única)
- `finalizeMealDescription()` — normaliza proteína + adiciona bebida
- `buildFoodDescriptionFromItems()` — gera descrição bullet-point
- `scaleDescriptionQuantities()` — escala gramagens proporcionalmente
- `standardProteinPortion()` — porções padrão (almoço 150g, jantar 140g)

## 4. FLUXO DE DADOS

```
Onboarding → generate-meal-plan → meal_plan_items (DB)
                                     ↓
                              visual_library_item_id (resolvido na geração)
                                     ↓
                              Editor (lê do DB) → Paciente (lê do DB)
                                     ↓
                              validate-meal-plan → autofix (mesmas regras)
```

## 5. GUARDRAILS ATIVOS

- Desvio máximo proteínas entre dias: **3%**
- Desvio máximo calorias entre dias: **5%**
- Teto por item: **1200 kcal** (MAX_SINGLE_ITEM_KCAL)
- Proteína café da manhã: **30-45g** (conforme objetivo)
- Porção proteína almoço: **150g** (emagrecimento) / **180g** (ganho)
- Porção proteína jantar: **140g** (emagrecimento) / **170g** (ganho)

## 6. CHECKLIST DE REGRESSÃO (OBRIGATÓRIO)

Antes de alterar qualquer arquivo do core, validar:

- [ ] `food-rules.ts` — BLOCKED_FOODS, REPLACEMENTS, SUBSTITUTION_GROUPS inalterados?
- [ ] `meal-description.ts` — finalizeMealDescription, buildFoodDescriptionFromItems inalterados?
- [ ] `generate-meal-plan` — continua sendo a única engine de geração?
- [ ] `planPipelineOrchestrator` — continua como wrapper (não gera direto)?
- [ ] Macros por dia com desvio ≤5% calorias e ≤3% proteínas?
- [ ] `visual_library_item_id` resolvido na geração?
- [ ] Descrição textual coerente com macros calculados?
- [ ] AutoFix usando mesmas regras de food-rules.ts?
- [ ] Editor e paciente lendo da mesma fonte (meal_plan_items)?
- [ ] Nenhuma duplicação de regras fora dos arquivos canônicos?

## 7. ARQUIVOS PROTEGIDOS (NÃO DUPLICAR)

```
supabase/functions/_shared/food-rules.ts      ← regras únicas
supabase/functions/_shared/meal-description.ts ← descrição única
supabase/functions/generate-meal-plan/         ← engine única
src/lib/planPipelineOrchestrator.ts            ← wrapper único
```

## 8. PRÓXIMAS FRENTES (SEM REABRIR CORE)

1. Módulo Personal Trainer (séries, repetições, vídeos)
2. UX/UI refinements
3. Absorção de `generate-bb-meal-plan` (quando necessário)
4. Expansão de regressão com mais perfis de pacientes
