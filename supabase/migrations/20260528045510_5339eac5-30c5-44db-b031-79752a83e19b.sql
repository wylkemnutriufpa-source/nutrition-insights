-- 1. Corrigir itens que foram erroneamente renomeados para "Almoço"
UPDATE public.v3_diet_templates
SET plan_snapshot = (replace(plan_snapshot::text, '"name": "Almoço"', '"name": "Arroz e Feijão"'))::jsonb
WHERE plan_snapshot::text LIKE '%"name": "Almoço"%' 
AND plan_snapshot::text LIKE '%"quantity_display": "3 colheres de cada"%';

-- 2. Dividir o item "Arroz e Feijão" em dois, agora com os nomes corretos
UPDATE public.v3_diet_templates
SET plan_snapshot = (
  replace(
    plan_snapshot::text,
    '"name": "Arroz e Feijão", "protein": 6, "quantity": 1, "quantity_display": "3 colheres de cada"',
    '"name": "Arroz Integral", "protein": 2, "quantity": 1, "quantity_display": "3 colheres de sopa", "kcal": 90, "carbs": 19, "fat": 1}, {"name": "Feijão Carioca", "protein": 4, "quantity": 1, "quantity_display": "2 conchas pequenas", "kcal": 54, "carbs": 16, "fat": 0'
  )
)::jsonb
WHERE plan_snapshot::text LIKE '%"name": "Arroz e Feijão"%';

-- 3. Renomear o título da REFEIÇÃO (usando o campo 'items' como âncora para garantir que é a refeição)
UPDATE public.v3_diet_templates
SET plan_snapshot = (replace(plan_snapshot::text, '"items": [', '"items": ['))::jsonb; -- No-op to refresh

-- Usar regex para renomear o nome da refeição que vem DEPOIS dos itens
UPDATE public.v3_diet_templates
SET plan_snapshot = regexp_replace(
  plan_snapshot::text,
  '("items":\s*\[[^\]]+\]),\s*"name":\s*"(Arroz com Feijão|Arroz e Feijão)"',
  '\1, "name": "Almoço"',
  'g'
)::jsonb;
