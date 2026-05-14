# CALORIC_AGGREGATION_TRACE — Caso Luciana

**Plano analisado:** `b81751a3-d4af-4393-8065-774ba40ad3dc`
**Status:** `published_to_patient` · `editor_version=v3`
**`total_calories` no banco:** `15385 kcal`
**UI mostrou:** `4451 kcal`

---

## 1. Veredito imediato

A soma `15385` **não é erro de agregação**. É **resultado correto** sobre uma estrutura **corrompida na origem**.

A duplicação **não está no aggregator**. Está no **producer** (Editor V3 / promoteDraft) que persistiu **múltiplas `substitution_group_id` distintas com `is_primary=true` para o mesmo slot da mesma refeição**.

---

## 2. Breakdown REAL por refeição (todos `day_of_week=0`)

| meal_type        | primaries | subs | distinct groups | Σ kcal (primaries) | Σ kcal (todos itens) |
|------------------|-----------|------|-----------------|--------------------|-----------------------|
| breakfast        | **21**    | 42   | **21**          | 3 654              | 9 310                 |
| morning_snack    | **14**    | 14   | **14**          | 1 196              | 2 239                 |
| lunch            | **35**    | 119  | **35**          | **4 830**          | 26 320                |
| afternoon_snack  | **14**    | 14   | **14**          | 988                | 2 031                 |
| dinner           | **35**    | 119  | **35**          | **4 025**          | 24 955                |
| evening_snack    | **14**    | 11   | **14**          | 692                | 6 344                 |
| **TOTAL**        | **133**   | 319  | **133**         | **15 385**         | **71 199**            |

`15385` ≡ Σ `calories_target WHERE is_primary=true` → é exatamente o `total_calories` salvo.

---

## 3. Onde o producer duplicou

### Almoço — slot "carboidrato"
3 `substitution_group_id` distintas, **todas com Arroz Branco como `is_primary=true`**:

| group_id (prefix) | primary           | kcal |
|-------------------|-------------------|------|
| `5838193f…`       | Arroz Branco      | 176  |
| `a2392604…`       | Arroz Branco      | 176  |
| `56a4b0bb…`       | Arroz Branco      | 176  |

Cada uma carrega Aveia 394, Tapioca 220, Batata 86, Cuscuz 110, Feijão 76 como subs **idênticos repetidos 3x**.

### Jantar — slot "proteína"
Mesmo padrão com **3 grupos para Peito de Frango 272 kcal**, cada um repetindo Ovo, Patinho, Queijo Minas como subs.

### Café — slot "carboidrato"
2 grupos `is_primary=true` para Pão Integral (182+182).

> O motor está criando **um grupo de substituição por alternativa**, em vez de **um grupo por slot**. Resultado: cada alternativa vira "primary" do seu próprio grupo, e a soma de primários infla.

---

## 4. De onde vêm os 4451 kcal exibidos

`4451 ≈ Σ primaries deduplicados por (meal_type, title)`:

- breakfast: Banana 123 + Pão Integral 182 = 305 (Pão dedup 2→1)
- morning_snack: Iogurte 86 + Mamão 83 = 169
- lunch: Arroz 176 + Brócolis 37 + Feijão 103 = 316 (Arroz dedup 3→1)
- afternoon_snack: Iogurte 86 + Mamão 54 = 140
- dinner: Arroz 143 + Brócolis 32 + Frango 272 = 447 (Frango dedup 3→1)
- evening_snack: ~692 / N…

A UI está aplicando **dedup heurística por título** sobre uma base já duplicada. Por isso o número exibido (4451) e o `total_calories` salvo (15385) divergem — **ambos derivam da mesma corrupção estrutural**.

---

## 5. Pipeline contaminado

| pipeline / arquivo                                          | escreveu este plano? | comportamento     |
|-------------------------------------------------------------|----------------------|-------------------|
| `src/features/editor-v3/services/promoteDraft.ts`           | **SIM**              | **CONTAMINADO**   |
| `src/features/editor-v3/services/localPlanGenerator.ts`     | possível             | suspeito (mesmo padrão de "1 grupo por alternativa") |
| `supabase/functions/generate-meal-plan/index.ts`            | não                  | OK                |
| `supabase/functions/generate-meal-plan-v2/index.ts`         | não                  | OK                |

**Causa-raiz no producer:** o draft V3 está sendo construído com **um `substitution_group_id` por alimento alternativo**, em vez de **um `substitution_group_id` por slot da refeição** (carbo, proteína, vegetal, etc). Cada alternativa entra em `itemsRows.push(...)` com `is_primary=true` no seu próprio grupo, e ainda replica todas as outras alternativas como `substitutions[]` desse grupo — gerando explosão N×N.

---

## 6. O que NÃO fazer (proibido)

- ❌ clamp / scaling para forçar 2000 kcal
- ❌ deduplicar no aggregator mascarando a corrupção
- ❌ limitar `total_calories` artificialmente
- ❌ esconder primaries duplicados na UI

---

## 7. Próximo passo cirúrgico (aguardando aprovação)

Corrigir **somente o producer**, em `promoteDraft.ts` (e mesmo padrão se confirmado em `localPlanGenerator.ts`):

1. Para cada `meal.items` (slot principal), gerar **UM** `substitution_group_id` único.
2. O item primário do slot vira a **única linha com `is_primary=true`** desse grupo.
3. As alternativas viram linhas `is_primary=false` **dentro do mesmo grupo** — sem criar novos grupos, sem replicar subs entre grupos.

Resultado esperado pós-fix para um dia típico (1 slot carbo + 1 proteína + 1 vegetal por refeição):
- breakfast: ~3 primaries
- lunch: ~3-4 primaries
- dinner: ~3-4 primaries
- snacks: 1-2 primaries cada
- **Total ≈ 15-20 primaries** (vs 133 atuais) → kcal volta para faixa fisiológica.

---

## 8. Veredito final

> Não há erro no aggregator. Há **explosão combinatória no producer V3**. Cada substituição vira um "grupo primário" próprio, e o sistema soma primaries — corretamente — sobre uma base duplicada N vezes. Sem corrigir `promoteDraft.ts` (e auditar `localPlanGenerator.ts`), nenhum plano V3 vai apresentar kcal real.
