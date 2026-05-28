-- 1. Primeiro, vamos desfazer a renomeação genérica do item para "Almoço" que ocorreu na migração anterior
UPDATE public.v3_diet_templates
SET plan_snapshot = (replace(plan_snapshot::text, '"name": "Almoço", "protein": 6', '"name": "Arroz e Feijão", "protein": 6'))::jsonb
WHERE plan_snapshot::text LIKE '%"name": "Almoço", "protein": 6%';

-- 2. Agora, vamos dividir o item "Arroz e Feijão" em dois itens reais
-- Vamos usar uma substituição mais robusta que não dependa de espaços exatos
UPDATE public.v3_diet_templates
SET plan_snapshot = (
  replace(
    plan_snapshot::text,
    '"name": "Arroz e Feijão", "protein": 6, "quantity": 1, "quantity_display": "3 colheres de cada"',
    '"name": "Arroz Integral", "protein": 2, "quantity": 1, "quantity_display": "3 colheres de sopa", "kcal": 90, "carbs": 19, "fat": 1}, {"name": "Feijão Carioca", "protein": 4, "quantity": 1, "quantity_display": "2 conchas pequenas", "kcal": 54, "carbs": 16, "fat": 0'
  )
)::jsonb
WHERE plan_snapshot::text LIKE '%"name": "Arroz e Feijão"%';

-- 3. Garantir que as macros e calorias do objeto "macros" também sejam atualizadas se existirem
-- (O replace acima já cuida da maioria dos campos, mas vamos ser extra cuidadosos com o template "Prático Café da Manhã")
UPDATE public.v3_diet_templates
SET plan_snapshot = (
  replace(
    plan_snapshot::text,
    '"macros": {"carbs_g": 35, "fat_g": 1, "kcal": 144, "protein_g": 6}',
    '"macros": {"carbs_g": 19, "fat_g": 1, "kcal": 90, "protein_g": 2}'
  )
)::jsonb
WHERE title = 'Prático Café da Manhã';

-- 4. Renomear o título da refeição especificamente (garantindo que não pegue itens)
-- O padrão nos templates é {"id": "...", "items": [...], "name": "Arroz com Feijão", "time": "12:30"}
UPDATE public.v3_diet_templates
SET plan_snapshot = (replace(plan_snapshot::text, '"name": "Arroz com Feijão", "time":', '"name": "Almoço", "time":'))::jsonb
WHERE plan_snapshot::text LIKE '%"name": "Arroz com Feijão", "time":%';

UPDATE public.v3_diet_templates
SET plan_snapshot = (replace(plan_snapshot::text, '"name": "Arroz e Feijão", "time":', '"name": "Almoço", "time":'))::jsonb
WHERE plan_snapshot::text LIKE '%"name": "Arroz e Feijão", "time":%';
