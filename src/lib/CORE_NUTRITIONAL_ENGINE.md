# 🧬 FitJourney — Core Nutritional Engine v1.0.0

> **Status:** DOCUMENTAÇÃO OFICIAL — Referência Canônica do Motor Clínico Nutricional  
> **Data:** 2026-04-08  
> **Responsável:** Arquitetura Core  
> **Engine Version:** 4.0.0 (`CURRENT_ENGINE_VERSION`)  
> **Pipeline Version:** v3.0.0 (`PIPELINE_VERSION`)

---

## 1. VISÃO GERAL

O **Core Nutritional Engine** do FitJourney é o motor determinístico responsável por toda a lógica de geração, validação, correção e publicação de planos alimentares. Ele opera sem LLMs — toda inteligência é baseada em regras clínicas, tabelas nutricionais validadas e motores de cálculo proprietários.

O sistema garante:
- **Precisão clínica** — macros calculados por grama, com guardrails de desvio
- **Composição brasileira** — alimentos básicos, preparações reais, sem itens importados
- **Imutabilidade** — planos publicados são documentos congelados
- **Rastreabilidade** — cada plano carrega versão do motor, auditoria e histórico

### Princípios fundamentais

1. **Uma engine, uma verdade** — `generate-meal-plan` é o único motor de geração
2. **Regras centralizadas** — `food-rules.ts` e `meal-description.ts` são fontes canônicas
3. **Banco como verdade** — `meal_plan_items` é a fonte de verdade absoluta
4. **Publicado = Congelado** — nenhuma automação altera plano publicado

---

## 2. ENGINE OFICIAL

### Arquivos e responsabilidades

| Camada | Arquivo | Responsabilidade |
|--------|---------|-----------------|
| **Motor de geração** | `supabase/functions/generate-meal-plan/index.ts` | Engine oficial e única de geração de planos |
| **Regras canônicas** | `supabase/functions/_shared/food-rules.ts` | Alimentos bloqueados, substituições, splits calóricos, distribuição proteica |
| **Motor de descrição** | `supabase/functions/_shared/meal-description.ts` | Normalização de proteínas, porções, beverage lines, escalonamento |
| **Wrapper cliente** | `src/lib/planPipelineOrchestrator.ts` | Wrapper que delega para a Edge Function (não gera diretamente) |
| **Persistência** | Tabela `meal_plan_items` | Fonte de verdade para editor, paciente e publicação |
| **Validação** | `supabase/functions/validate-meal-plan/index.ts` | Validação clínica server-side |
| **AutoFix** | `src/lib/autoFixEngine.ts` | Correção automática inteligente |
| **Orquestrador de validação** | `src/lib/mealPlanValidationFlow.ts` | Coordena flush → validação → autofix → revalidação |
| **Finalização** | `src/lib/finalizeGeneratedMealPlan.ts` | Wrapper de finalização pós-geração |
| **Governança de versão** | `src/lib/engineVersionGovernance.ts` | Rastreio de versões obsoletas |

### Regra de ouro

> **Nenhum** outro arquivo, função ou componente pode gerar itens de plano diretamente.  
> Todo fluxo de criação passa obrigatoriamente pelo `generate-meal-plan` via `planPipelineOrchestrator.ts`.

---

## 3. REGRAS CANÔNICAS

### 3.1 MEAL_KCAL_SPLIT — Distribuição calórica por refeição

```typescript
// food-rules.ts
export const MEAL_KCAL_SPLIT: Record<string, number> = {
  breakfast:        0.20,  // 20%
  morning_snack:    0.10,  // 10%
  lunch:            0.30,  // 30%
  afternoon_snack:  0.10,  // 10%
  dinner:           0.22,  // 22%
  evening_snack:    0.08,  // 8%
};
```

### 3.2 BLOCKED_FOODS — Alimentos proibidos na geração

Alimentos que **nunca** podem aparecer em planos gerados:

| Categoria | Exemplos |
|-----------|----------|
| Peixes caros | salmão, atum fresco |
| Laticínios importados | kefir, cottage, ricota, queijo minas, peito de peru |
| Grãos importados | quinoa, amaranto |
| Oleaginosas caras | castanha-do-pará, macadâmia, pistache |
| Frutas importadas | framboesa, mirtilo, blueberry, cranberry |
| Proteínas não-tradicionais | tofu, tempeh, edamame |
| Preparações complexas | overnight oats, wrap integral, smoothie bowl |
| Suplementos | whey protein, caseína, creatina |
| Queijos importados | burrata, brie, camembert, gorgonzola |

### 3.3 REPLACEMENTS — Substituições automáticas

Quando um alimento bloqueado é detectado, é substituído automaticamente:

| Bloqueado | Substituição |
|-----------|-------------|
| salmão → | tilápia grelhada |
| cottage → | queijo coalho |
| quinoa → | arroz integral |
| cream cheese → | requeijão |
| tofu → | ovo cozido |
| whey protein → | ovo cozido |
| overnight oats → | aveia com banana |
| wrap integral → | tapioca |

*(Lista completa em `food-rules.ts` — 45+ mapeamentos)*

### 3.4 SUBSTITUTION_GROUPS — Grupos de equivalência nutricional

```typescript
export const SUBSTITUTION_GROUPS = {
  protein_main:      ["frango", "carne moída", "bife", "tilápia", "porco", "sardinha", "alcatra", "patinho", "acém"],
  carb_main:         ["arroz", "macarrão", "batata", "macaxeira", "batata doce", "inhame", "cará"],
  carb_breakfast:    ["pão integral", "tapioca", "cuscuz", "pão francês", "pão de forma"],
  protein_breakfast: ["ovo mexido", "ovo cozido", "queijo coalho", "queijo muçarela"],
  fruit:             ["banana", "maçã", "mamão", "laranja", "goiaba", "morango", "tangerina", "melancia", "abacaxi", "manga"],
  dairy:             ["iogurte natural", "leite", "queijo coalho"],
  legume:            ["feijão", "feijão carioca", "feijão preto", "lentilha", "feijão verde"],
  vegetable:         ["alface", "tomate", "brócolis", "cenoura", "couve", "repolho", "chuchu", "abobrinha"],
};
```

### 3.5 getProteinDistribution — Distribuição proteica por objetivo

```typescript
// Emagrecimento (isGainGoal = false)
shares: { breakfast: 0.15, morning_snack: 0.08, lunch: 0.27, afternoon_snack: 0.08, dinner: 0.27, evening_snack: 0.15 }
caps:   { breakfast: 30,   morning_snack: 18,   lunch: 55,   afternoon_snack: 18,   dinner: 55,   evening_snack: 30   }

// Ganho de massa (isGainGoal = true)
shares: { breakfast: 0.16, morning_snack: 0.10, lunch: 0.26, afternoon_snack: 0.10, dinner: 0.24, evening_snack: 0.14 }
caps:   { breakfast: 45,   morning_snack: 24,   lunch: 65,   afternoon_snack: 24,   dinner: 60,   evening_snack: 35   }
```

### 3.6 Regras de descrição e porções

| Função | Responsabilidade |
|--------|-----------------|
| `finalizeMealDescription()` | Normaliza proteína + adiciona bebida padrão |
| `buildFoodDescriptionFromItems()` | Gera descrição bullet-point a partir de items |
| `scaleDescriptionQuantities()` | Escala gramagens proporcionalmente (fator ≥ 0.08 de variação) |
| `standardProteinPortion()` | Porções padrão por refeição e objetivo |
| `roundScaledQuantity()` | Arredondamento inteligente (5g para g/ml, 0.5 para colheres) |

**Porções padrão de proteína:**

| Refeição | Emagrecimento | Ganho de massa |
|----------|:------------:|:--------------:|
| Almoço | 150g | 180g |
| Jantar | 140g | 170g |

**Bebidas padrão adicionadas automaticamente:**
- Café da manhã → "Café com leite"
- Lanche da tarde → "Chá sem açúcar"

---

## 4. GUARDRAILS CLÍNICOS

### 4.1 Desvios máximos entre dias

| Métrica | Desvio máximo permitido |
|---------|:----------------------:|
| Calorias entre dias | **≤ 5%** |
| Proteínas entre dias | **≤ 3%** |

### 4.2 Limites por item

| Guardrail | Valor |
|-----------|:-----:|
| Teto calórico por item único | **1200 kcal** (`MAX_SINGLE_ITEM_KCAL`) |

### 4.3 Composição brasileira obrigatória

| Refeição | Composição obrigatória |
|----------|----------------------|
| **Café da manhã** | Pão/tapioca/cuscuz + ovo/queijo/frango desfiado |
| **Almoço** | Proteína (rotação: carne/peixe/frango) + carboidrato (rotação: arroz/macarrão/purê/batata) + salada obrigatória |
| **Jantar** | Mesma estrutura do almoço. **Feijão proibido à noite** |
| **Lanches** | Frutas práticas: banana, maçã, mamão |

### 4.4 Anti-repetição

- Proteínas não repetem no mesmo dia
- Carboidratos rotacionam ao longo dos 7 dias
- Alimentos do café da manhã variam entre os dias
- Lanches evitam frutas idênticas em dias consecutivos

### 4.5 Palavras-chave de complexidade

Itens contendo termos como `premium`, `importado`, `gourmet`, `artesanal`, `overnight`, `smoothie bowl`, `poke`, `buddha bowl` são sinalizados pelo validador e removidos/substituídos.

---

## 5. GERAÇÃO DE PLANO

### Fluxo completo

```
Entrada (Onboarding / Smart Plan / Template)
    ↓
planPipelineOrchestrator.ts (wrapper)
    ↓
supabase.functions.invoke("generate-meal-plan")
    ↓
┌─────────────────────────────────────────────┐
│  Edge Function: generate-meal-plan          │
│                                             │
│  1. Carrega dados do paciente (TMB, metas)  │
│  2. Aplica MEAL_KCAL_SPLIT                  │
│  3. Aplica getProteinDistribution()         │
│  4. Seleciona alimentos (DB + food-rules)   │
│  5. Calcula macros por grama                │
│  6. Aplica anti-repetição                   │
│  7. Gera descrições (meal-description.ts)   │
│  8. Resolve visual_library_item_id          │
│  9. Persiste em meal_plan_items             │
└─────────────────────────────────────────────┘
    ↓
meal_plan_items (banco de dados — fonte de verdade)
    ↓
Preview / Editor / Paciente (leitura do DB)
```

### Modos de geração

| Modo | Descrição | Parâmetro |
|------|-----------|-----------|
| `quick` | Geração rápida com defaults | `generationMode: "quick"` |
| `smart` | Geração inteligente com personalização completa | `generationMode: "smart"` |
| `clinical` | Geração com parâmetros clínicos detalhados | `generationMode: "clinical"` |

---

## 6. VALIDAÇÃO

### Fluxo de validação

```
finalizeGeneratedMealPlan()
    ↓
runValidateAndFixMealPlan()
    ↓
1. await flush()                          ← Sincroniza store → DB
2. validateMealPlan(planId)               ← Edge: validate-meal-plan
    ↓
┌─ success = true ──→ kind: "validated"   ← Plano aprovado, sem correções
│
└─ success = false ──→ autoFixMealPlan()  ← Tenta correção automática
                          ↓
                    ┌─ inPlace = true ──→ revalidateMealPlan()
                    │                       ↓
                    │                 ┌─ success ──→ "fixed_and_validated"
                    │                 └─ fail ────→ "fixed_but_pending"
                    │
                    └─ inPlace = false (plano imutável)
                          ↓
                    Cria novo draft ──→ kind: "redirect"
                          ↓
                    newPlanId retornado ao cliente
```

### Funções envolvidas

| Função | Arquivo | Responsabilidade |
|--------|---------|-----------------|
| `finalizeGeneratedMealPlan()` | `src/lib/finalizeGeneratedMealPlan.ts` | Wrapper de alto nível pós-geração |
| `runValidateAndFixMealPlan()` | `src/lib/mealPlanValidationFlow.ts` | Orquestra flush → validate → fix → revalidate |
| `validateMealPlan()` | `src/lib/mealPlanValidationFlow.ts` | Invoca Edge Function `validate-meal-plan` |
| `autoFixMealPlan()` | `src/lib/autoFixEngine.ts` | Motor de correção automática |

### Resultados possíveis

| Outcome | Significado | Ação |
|---------|-------------|------|
| `validated` | Plano passou na validação sem correções | Pronto para aprovação |
| `fixed_and_validated` | AutoFix corrigiu e revalidação passou | Pronto para aprovação |
| `fixed_but_pending` | AutoFix corrigiu mas revalidação ainda falhou | Revisão manual necessária |
| `redirect` | Plano era imutável; novo draft criado | UI navega para novo planId |

---

## 7. AUTOFIX

### Pipeline do AutoFix Engine (v1.0)

```
1. Carregar contexto (plano, itens, objetivo do paciente)
2. Remover alimentos bloqueados (BLOCKED_FOODS)
3. Simplificar cafés da manhã
4. Simplificar lanches
5. Padronizar refeições principais
6. Reduzir complexidade (PREMIUM_KEYWORDS, COMPLEX_PREP_KEYWORDS)
7. Rebalancear macros (MEAL_KCAL_SPLIT + getProteinDistribution)
8. Sincronizar descrições (scaleDescriptionQuantities, finalizeMealDescription)
9. Criar nova versão draft ou atualizar in-place
10. Registrar timeline de auditoria
```

### O que o AutoFix PODE corrigir

| Tipo de correção | `AutoFixChangeType` |
|-----------------|---------------------|
| Remover alimento bloqueado | `blocked_food_removed` |
| Simplificar café da manhã | `breakfast_fixed` |
| Simplificar lanche | `snack_fixed` |
| Padronizar refeição principal | `main_meal_standardized` |
| Reduzir complexidade | `complexity_reduced` |
| Reduzir frutas excessivas | `fruit_reduction` |
| Rebalancear macros | `macro_rebalanced` |
| Aplicar personalização | `personalization_applied` |

### O que o AutoFix NÃO PODE corrigir

- Itens marcados como `is_locked: true`
- Itens marcados como `is_manually_edited: true`
- Estrutura do plano (número de refeições, dias)
- Restrições alimentares não mapeadas no `food-rules.ts`

### Correção in-place vs. novo draft

| Situação | Comportamento |
|----------|--------------|
| Plano em `draft` / `draft_auto_generated` / `under_professional_review` | Correção **in-place** (atualiza `meal_plan_items` do mesmo plano) |
| Plano em `approved` / `published_to_patient` | Cria **novo draft** (`draft_auto_corrected`) e retorna `newPlanId` |

### Proteção de itens

```typescript
function isItemProtected(item): boolean {
  return Boolean(item.is_locked || item.is_manually_edited);
}
```

Itens protegidos são **ignorados** por todas as etapas do AutoFix.

---

## 8. ESTADOS OFICIAIS DO PLANO

### Enum: `meal_plan_status`

| Estado | Editável | Visível Paciente | Ativo | Descrição |
|--------|:--------:|:----------------:|:-----:|-----------|
| `draft` | ✅ | ❌ | ❌ | Rascunho manual |
| `draft_auto_generated` | ✅ | ❌ | ❌ | Gerado pela engine, aguardando revisão |
| `under_professional_review` | ✅ | ❌ | ❌ | Em revisão pelo nutricionista |
| `approved` | ❌ | ❌ | ❌ | Aprovado, aguardando publicação |
| `published_to_patient` | ❌ | ✅ | ✅ | Publicado e congelado |
| `revision_requested` | ✅ | ❌ | ❌ | Revisão solicitada |
| `archived` | ❌ | ❌ | ❌ | Arquivado (histórico) |
| `expired` | ❌ | ❌ | ❌ | Expirado por tempo |
| `replaced` | ❌ | ❌ | ❌ | Substituído por nova versão |

### Transições permitidas

```
draft / draft_auto_generated
    ↓ (revisão)
under_professional_review
    ↓ (aprovação)
approved
    ↓ (publicação via RPC approve_and_publish_plan)
published_to_patient
    ↓ (nova versão)
archived / replaced
```

### Publicação

A RPC `approve_and_publish_plan` executa atomicamente:
1. Publica o plano atual como `published_to_patient`
2. Arquiva a versão publicada anterior
3. Desativa e arquiva todos os drafts e planos pendentes do mesmo paciente

---

## 9. REGRA DE IMUTABILIDADE

### ⛔ PRINCÍPIO ABSOLUTO

> **Planos com status `approved`, `published` ou `published_to_patient` são IMUTÁVEIS.**

### O que é PROIBIDO em planos imutáveis

| Ação proibida | Motivo |
|--------------|--------|
| IA corrigir valores | Alteraria conduta clínica entregue |
| AutoFix in-place | Modificaria dados publicados |
| Regeneração in-place | Substituiria conduta aprovada |
| Sync posterior | Alteraria estado congelado |
| Ajuste de descrição | Mudaria informação entregue ao paciente |
| Reprocessamento visual | Trocaria imagem de referência |
| UPDATE em `meal_plan_items` | Bloqueado por trigger SQL |
| DELETE em `meal_plan_items` | Bloqueado por trigger SQL |

### Enforcement

**Trigger SQL:** `trg_guard_published_plan_items_immutable`

Este trigger bloqueia qualquer operação de UPDATE ou DELETE na tabela `meal_plan_items` quando o plano associado tem status `approved`, `published` ou `published_to_patient`.

### Única saída permitida

Para ajustar um plano publicado:
1. Criar novo rascunho (`draft_revision`) baseado nos dados de onboarding
2. Editar o novo rascunho
3. Validar e publicar a nova versão
4. O plano anterior é automaticamente `archived` / `replaced`

---

## 10. BIBLIOTECA VISUAL

### Resolução de imagens

O `visual_library_item_id` é resolvido **server-side** no momento da geração, dentro da Edge Function `generate-meal-plan`.

### Tabelas envolvidas

| Tabela | Responsabilidade |
|--------|-----------------|
| `meal_visual_library` | Catálogo principal de imagens com nome, URL e categorias |
| `meal_visual_aliases` | Mapeamento de aliases/sinônimos para nomes de alimentos compostos |

### Regra da proteína principal

O item proteico (frango, carne, peixe) determina o `visual_library_item_id` e a imagem exibida. Acompanhamentos (arroz, salada) aparecem na descrição textual.

**Prioridade de match:**
1. Match de item composto (ex: "pão com ovo" → imagem específica)
2. Match por proteína principal (ex: "frango grelhado" → imagem de frango)
3. Match por alias (ex: aliases em `meal_visual_aliases`)

### Comportamento na UI

A UI **apenas lê** o `visual_library_item_id` persistido em `meal_plan_items`. Nenhum cálculo ou resolução visual acontece no cliente.

---

## 11. FLUXOS PERMITIDOS

### Caminhos oficiais de criação de plano

| Fluxo | Entrada | Passa por Engine | Validação obrigatória | Publicação controlada |
|-------|---------|:----------------:|:--------------------:|:--------------------:|
| **Onboarding** | Dados do paciente | ✅ `generate-meal-plan` | ✅ | ✅ |
| **Smart Plan (10s)** | Dados do paciente | ✅ `generate-meal-plan` | ✅ | ✅ |
| **Click-to-Add** | Seleção manual no editor | ❌ (inserção direta) | ✅ (antes de publicar) | ✅ |
| **Templates** | Composições pré-definidas | ❌ (inserção direta) | ✅ (antes de publicar) | ✅ |
| **Builder Híbrido** | Edição manual + engine | Parcial | ✅ | ✅ |

### Regra universal

> **Nenhum fluxo pode publicar um plano sem passar pela validação.**  
> Click-to-Add e Templates inserem itens diretamente em `meal_plan_items`, mas o plano **não pode transicionar** para `published_to_patient` sem `validate-meal-plan` + aprovação.

---

## 12. CHECKLIST DE REGRESSÃO OBRIGATÓRIA

Antes de alterar qualquer arquivo do Core Nutritional Engine, validar **todos** os itens:

### Regras clínicas
- [ ] A mudança altera `BLOCKED_FOODS`, `REPLACEMENTS` ou `SUBSTITUTION_GROUPS`?
- [ ] Altera `MEAL_KCAL_SPLIT` (distribuição calórica)?
- [ ] Altera `getProteinDistribution()` (shares ou caps)?
- [ ] Altera `standardProteinPortion()` (porções de proteína)?

### Descrições
- [ ] Altera `finalizeMealDescription()` ou `buildFoodDescriptionFromItems()`?
- [ ] Altera `scaleDescriptionQuantities()` (escalonamento)?
- [ ] Descrição textual continua coerente com macros calculados?

### Geração
- [ ] `generate-meal-plan` continua sendo a **única** engine de geração?
- [ ] `planPipelineOrchestrator` continua como **wrapper** (não gera direto)?
- [ ] `visual_library_item_id` continua resolvido **server-side**?

### Integridade de dados
- [ ] Macros por dia mantêm desvio ≤5% calorias e ≤3% proteínas?
- [ ] Teto de 1200 kcal por item está preservado?
- [ ] Anti-repetição está funcional?

### Imutabilidade
- [ ] A mudança toca planos com status `approved` / `published_to_patient`?
- [ ] Trigger `trg_guard_published_plan_items_immutable` está intacto?
- [ ] Nenhum bypass de validação foi introduzido?

### UI / Preview
- [ ] Editor lê e escreve em `meal_plan_items` (mesma fonte que paciente)?
- [ ] Preview reflete exatamente o que será publicado?
- [ ] Nenhuma duplicação de regras fora dos arquivos canônicos?

### Enum / Status
- [ ] Enum `meal_plan_status` não foi alterado?
- [ ] Transições de estado estão consistentes com a Seção 8?

---

## 13. VERSIONAMENTO DO MOTOR

### Versões atuais

| Componente | Versão | Arquivo |
|-----------|:------:|---------|
| Engine Version | `4.0.0` | `src/lib/engineVersionGovernance.ts` → `CURRENT_ENGINE_VERSION` |
| Minimum Supported | `3.0.0` | `src/lib/engineVersionGovernance.ts` → `MINIMUM_SUPPORTED_VERSION` |
| Pipeline Version | `v3.0.0` | `src/lib/planPipelineOrchestrator.ts` → `PIPELINE_VERSION` |
| AutoFix Engine | `v1.0` | `src/lib/autoFixEngine.ts` |
| Food Rules | `v1.0` | `supabase/functions/_shared/food-rules.ts` |
| Meal Description | `v1.0.0` | `supabase/functions/_shared/meal-description.ts` |

### Proposta de versionamento explícito

Para rastrear mudanças futuras e evitar regressão silenciosa, cada plano gerado deveria persistir:

```typescript
{
  nutrition_engine_version: "4.0.0",     // Versão do motor de geração
  rules_version: "1.0.0",               // Versão do food-rules.ts
  description_engine_version: "1.0.0",  // Versão do meal-description.ts
  pipeline_version: "v3.0.0",           // Versão do wrapper
  autofix_version: "1.0.0",             // Versão do motor de correção
}
```

### Governança de versões obsoletas

Planos gerados com `engine_version < MINIMUM_SUPPORTED_VERSION` (3.0.0) recebem um **selo de aviso** no perfil do paciente, orientando o nutricionista a revalidar ou regenerar para garantir conformidade com os guardrails atuais.

---

## 14. ARQUIVOS PROTEGIDOS

Estes arquivos formam o núcleo do motor clínico. **Não duplicar, não mover, não criar alternativas.**

```
supabase/functions/_shared/food-rules.ts          ← Regras canônicas (única fonte)
supabase/functions/_shared/meal-description.ts    ← Motor de descrição (única fonte)
supabase/functions/generate-meal-plan/index.ts    ← Engine de geração (única)
src/lib/planPipelineOrchestrator.ts               ← Wrapper/orquestrador (único)
src/lib/mealPlanValidationFlow.ts                 ← Orquestrador de validação (único)
src/lib/autoFixEngine.ts                          ← Motor de correção (único)
src/lib/finalizeGeneratedMealPlan.ts              ← Finalização pós-geração (único)
src/lib/engineVersionGovernance.ts                ← Governança de versão (único)
```

### Mirrors cliente (devem estar sincronizados)

```
src/lib/mealPlanFoodRules.ts                      ← Mirror de food-rules.ts
src/lib/mealDescriptionEngine.ts                  ← Mirror de meal-description.ts
```

> Qualquer alteração em `food-rules.ts` ou `meal-description.ts` **deve** ser replicada nos mirrors cliente.

---

## CHANGELOG

| Versão | Data | Descrição |
|--------|------|-----------|
| 1.0.0 | 2026-04-08 | Documentação oficial inicial |
