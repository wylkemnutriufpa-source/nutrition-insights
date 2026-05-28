-- 1. Renomear o título da refeição de forma robusta
-- Procuramos por refeições que contenham o item problemático e renomeamos a refeição
UPDATE public.v3_diet_templates
SET plan_snapshot = (
  SELECT jsonb_object_agg(
    kcal_key,
    (
      SELECT jsonb_set(
        kcal_val,
        '{days}',
        (
          SELECT jsonb_agg(
            (
              SELECT jsonb_set(
                day_val,
                '{meals}',
                (
                  SELECT jsonb_agg(
                    CASE 
                      WHEN meal_val->>'name' IN ('Arroz com Feijão', 'Arroz e Feijão') THEN 
                        jsonb_set(meal_val, '{name}', '"Almoço"')
                      ELSE meal_val
                    END
                  )
                  FROM jsonb_array_elements(day_val->'meals') AS meal_val
                )
              )
            )
          )
          FROM jsonb_array_elements(kcal_val->'days') AS day_val
        )
      )
    )
  )
  FROM jsonb_each(plan_snapshot) AS snapshot_data(kcal_key, kcal_val)
)
WHERE plan_snapshot::text ILIKE '%Arroz%Feijão%';

-- 2. Dividir o item individual "Arroz e Feijão" em dois itens
-- Como a estrutura aninhada é muito profunda para jsonb_set simples em todos os níveis,
-- vamos usar o replace de string MAS de forma muito mais granular para evitar erros.
UPDATE public.v3_diet_templates
SET plan_snapshot = (
  replace(
    plan_snapshot::text,
    '"name": "Arroz e Feijão"',
    '"name": "Arroz Integral", "kcal": 90, "protein": 2, "carbs": 19, "fat": 1, "quantity_display": "3 colheres de sopa", "macros": {"kcal": 90, "fat_g": 1, "carbs_g": 19, "protein_g": 2}}, {"name": "Feijão Carioca", "kcal": 54, "protein": 4, "carbs": 16, "fat": 0, "quantity_display": "2 conchas pequenas", "macros": {"kcal": 54, "fat_g": 0, "carbs_g": 16, "protein_g": 4}'
  )
)::jsonb
WHERE plan_snapshot::text LIKE '%"name": "Arroz e Feijão"%';

-- Limpar rascunhos com a mesma lógica simplificada e eficaz
UPDATE public.v3_drafts
SET payload = (
  replace(
    payload::text,
    '"name": "Arroz e Feijão"',
    '"name": "Arroz Integral", "kcal": 90, "protein": 2, "carbs": 19, "fat": 1, "quantity_display": "3 colheres de sopa"}, {"name": "Feijão Carioca", "kcal": 54, "protein": 4, "carbs": 16, "fat": 0, "quantity_display": "2 conchas pequenas"'
  )
)::jsonb
WHERE payload::text LIKE '%"name": "Arroz e Feijão"%';
