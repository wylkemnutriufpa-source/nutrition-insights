# INSERT CONTRACT RULE

> **Definição oficial:**
> Todo bulk insert deve possuir shape homogêneo em todos os elementos.

## Por quê

PostgREST, ao receber um array com chaves heterogêneas em `.insert([...])`,
calcula a **união** das chaves do batch e injeta `null` explicitamente nas
colunas ausentes em cada elemento. Isso **sobrescreve os DEFAULTs do banco**
e viola colunas `NOT NULL` (ex.: `is_locked`, `is_manually_edited`,
`was_auto_corrected`).

## Regra

Todo array enviado a `.insert()` ou `.upsert()` em tabelas críticas
(`meal_plan_items`, `meal_plan_substitutions`, etc.) **DEVE**:

1. Passar por um normalizador centralizado.
2. Projetar **exatamente o mesmo conjunto de chaves** em 100% dos elementos.
3. Explicitar defaults — nunca confiar no DEFAULT do banco quando o batch
   for heterogêneo.
4. Nunca enviar `undefined` para colunas `NOT NULL`.

## Implementações de referência

- `supabase/functions/generate-meal-plan/index.ts` → `sanitizeMealPlanItem(item, mealPlanId, overrides?)`
- `src/features/editor-v3/services/promoteDraft.ts` → itens primários e de substituição compartilham o mesmo shape.

## Defaults canônicos para `meal_plan_items`

| Campo                   | Default | Observação                                |
|-------------------------|---------|-------------------------------------------|
| `is_primary`            | `true`  | Item principal salvo se não informado.    |
| `is_locked`             | `false` | NOT NULL no banco.                        |
| `is_manually_edited`    | `false` | Marcado pelo Editor V3 quando alterado.   |
| `was_auto_corrected`    | `false` | Marcado pelo AutoFix Engine.              |
| `item_origin`           | `'auto'`| `'auto' | 'manual' | 'template'` etc.    |
| `substitution_group_id` | `null`  | Apenas itens de substituição preenchem.   |
| `image_url`             | `null`  | Resolvido em pós-processamento se ausente.|

## Regra de revisão (PR)

Qualquer PR que adicionar um novo `.insert([...])` em tabelas clínicas
**deve** usar (ou estender) o normalizador correspondente. Reviewers devem
rejeitar arrays montados manualmente com `map()` sem passar pelo helper.
