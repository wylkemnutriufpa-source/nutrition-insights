# 🔒 FitJourney — Constituição do Sistema de Planos v1.0.0

> **Status:** CONGELADO — NÃO MODIFICAR SEM CHECKLIST DE REGRESSÃO  
> **Data de congelamento:** 2026-04-08  
> **Responsável:** Arquitetura Core

---

## 1. FLUXO OFICIAL DE CRIAÇÃO DE PLANOS

```
Onboarding → Smart Plan Generator → Preview → Validação → Publicação
                                        ↓
                              Visual Meal Builder (click-to-add)
                              Templates (staples brasileiros)
                              Substituições Inteligentes (delta calórico)
```

### Caminhos de Entrada Aprovados
| Método | Componente | Destino |
|--------|-----------|---------|
| Onboarding automático | `planPipelineOrchestrator.ts` | Editor V2 (padrão) |
| Geração rápida | Smart Plan 10s | Editor V2 (padrão) |
| Montagem manual | Visual Meal Builder | Editor V2 (click-to-add) |
| Template pronto | MealTemplatePanel | Editor V2 |
| Do zero (explícito) | Builder Híbrido | Canvas |

### Regra de Roteamento
- Planos de **onboarding** → SEMPRE Editor V2 (nunca Builder Híbrido)
- Builder Híbrido → APENAS criação explícita do zero pelo profissional

---

## 2. ENGINE OFICIAL

**`supabase/functions/generate-meal-plan/index.ts`**

- Única engine autorizada para gerar planos alimentares
- Recebe dados do onboarding (TMB, metas, restrições)
- Resolve `visual_library_item_id` server-side
- Persiste em `meal_plan_items` como fonte de verdade
- Versão atual: registrada em `engine_version` de cada plano

### Orquestração Cliente
- `src/lib/planPipelineOrchestrator.ts` — wrapper único (não gera direto)
- `src/lib/mealPlanValidationFlow.ts` — validação e AutoFix

---

## 3. REGRAS CANÔNICAS

### food-rules.ts (fonte única)
- `BLOCKED_FOODS` — alimentos proibidos
- `REPLACEMENTS` — substituições automáticas
- `SUBSTITUTION_GROUPS` — grupos de equivalência
- `MEAL_KCAL_SPLIT` — distribuição calórica por refeição
- `getProteinDistribution()` — shares proteicos por objetivo

### meal-description.ts (fonte única)
- `finalizeMealDescription()` — normaliza proteína + bebida
- `buildFoodDescriptionFromItems()` — descrição bullet-point
- `scaleDescriptionQuantities()` — escala gramagens
- `standardProteinPortion()` — porções padrão por objetivo

### Regras de Composição Brasileira
| Refeição | Regra |
|----------|-------|
| Café da manhã | Pão/tapioca/cuscuz + ovo/queijo/frango desfiado |
| Almoço | Rotação carne/peixe/frango + arroz/macarrão/purê/batata + salada obrigatória |
| Jantar | Mesma rotação, SEM feijão à noite, salada obrigatória |
| Lanches | Frutas práticas (banana, maçã, mamão) |

### Guardrails Ativos
- Desvio máximo proteínas entre dias: **3%**
- Desvio máximo calorias entre dias: **5%**
- Teto por item: **1200 kcal**
- Anti-repetição: itens não repetem em dias consecutivos
- Resolução visual: prioriza match composto (ex: "pão com ovo")

---

## 4. ESTADOS DE PLANO (Ciclo de Vida) — Enum `meal_plan_status`

```
draft → draft_auto_generated → under_professional_review → approved → published_to_patient
                                                                           ↓
                                                                      archived / expired / replaced
                                                                           ↑
revision_requested ←───── (profissional solicita ajuste) ─────────────────┘
```

| Estado (enum real) | Editável | Visível Paciente | Ativo |
|--------|----------|------------------|-------|
| `draft` | ✅ | ❌ | ❌ |
| `draft_auto_generated` | ✅ | ❌ | ❌ |
| `under_professional_review` | ✅ | ❌ | ❌ |
| `approved` | ❌ | ❌ | ❌ |
| `published_to_patient` | ❌ | ✅ | ✅ |
| `revision_requested` | ✅ | ❌ | ❌ |
| `archived` | ❌ | ❌ | ❌ |
| `expired` | ❌ | ❌ | ❌ |
| `replaced` | ❌ | ❌ | ❌ |

---

## 5. REGRA DE IMUTABILIDADE

### Princípio
**Plano publicado = documento congelado.**

### Enforcement
1. **Trigger SQL** `trg_guard_published_plan_items_immutable` — bloqueia UPDATE/DELETE em `meal_plan_items` de planos finalizados
2. **Guard no Editor** — abas de edição (Adicionar, Templates, Substituir) desabilitadas para planos não-draft
3. **RPC** `approve_and_publish_plan` — transição atômica com arquivamento de versões anteriores

### O que NÃO pode alterar plano publicado
- ❌ IA / AutoFix
- ❌ Regeneração silenciosa
- ❌ Sincronização posterior
- ❌ Ajuste de descrição
- ❌ Reprocessamento visual
- ❌ Qualquer automação

### Para ajustar plano publicado
→ Criar nova versão (`draft_revision`) via "♻️ Gerar Novo Plano"

---

## 6. FLUXO DE PREVIEW → VALIDAÇÃO → PUBLICAÇÃO

```
1. Geração (engine ou template)
   ↓
2. Finalização obrigatória (finalizeGeneratedMealPlan)
   - Sincroniza descrições
   - Resolve substituições
   - Aplica AutoFix
   ↓
3. Preview no Editor V2
   - Profissional revisa visualmente
   - Pode usar click-to-add, templates, substituições
   ↓
4. Validação Clínica (runValidateAndFix)
   - Modelo consultivo (sugere, não bloqueia)
   - Verifica guardrails (kcal, proteína, composição)
   ↓
5. Publicação (approve_and_publish_plan)
   - Transição atômica
   - Arquiva drafts e versões anteriores
   - Notifica paciente
   ↓
6. Entrega ao Paciente (/my-diet)
   - Leitura direta de meal_plan_items
   - Mesmo dado que o editor viu
```

---

## 7. CHECKLIST DE REGRESSÃO (OBRIGATÓRIO)

Antes de alterar qualquer arquivo do sistema de planos:

### Core Engine
- [ ] `food-rules.ts` — BLOCKED_FOODS, REPLACEMENTS, SUBSTITUTION_GROUPS inalterados?
- [ ] `meal-description.ts` — finalizeMealDescription, buildFoodDescriptionFromItems inalterados?
- [ ] `generate-meal-plan` — continua sendo a única engine de geração?
- [ ] `planPipelineOrchestrator` — continua como wrapper (não gera direto)?

### Integridade de Dados
- [ ] Macros por dia com desvio ≤5% calorias e ≤3% proteínas?
- [ ] `visual_library_item_id` resolvido na geração?
- [ ] Descrição textual coerente com macros calculados?
- [ ] AutoFix usando mesmas regras de food-rules.ts?

### Visual Meal Builder
- [ ] Click-to-add salva no `plan_id` correto?
- [ ] Templates persistem ao recarregar?
- [ ] Substituições recalculam macros sem quebrar total do dia?
- [ ] Abas bloqueadas em planos publicados?

### Imutabilidade
- [ ] Trigger `trg_guard_published_plan_items_immutable` ativo?
- [ ] Editor read-only para status approved/published/published_to_patient?
- [ ] Nenhuma automação escreve em plano publicado?

### Persistência
- [ ] Editor e paciente lendo da mesma fonte (meal_plan_items)?
- [ ] _flushQueue executado antes de validação?
- [ ] hydrate() chamado após AutoFix?

---

## 8. ARQUIVOS PROTEGIDOS (NÃO DUPLICAR)

```
supabase/functions/_shared/food-rules.ts         ← regras únicas
supabase/functions/_shared/meal-description.ts    ← descrição única
supabase/functions/generate-meal-plan/            ← engine única
src/lib/planPipelineOrchestrator.ts               ← wrapper único
src/lib/mealPlanValidationFlow.ts                 ← validação única
src/components/meal-editor-v2/MealClickToAddPanel.tsx   ← builder visual
src/components/meal-editor-v2/MealTemplatePanel.tsx     ← templates
src/components/meal-editor-v2/MealSubstitutionPanel.tsx ← substituições
```

---

## 9. VERSÃO E GOVERNANÇA

- Planos registram `engine_version` na criação
- Planos de versões obsoletas recebem selo de aviso no perfil do paciente
- Profissional pode revalidar/regenerar planos desatualizados
- Toda alteração no core exige testes E2E ponta a ponta
