-- 1. Renomear nomes de refeição em todos os templates
UPDATE public.v3_diet_templates
SET plan_snapshot = (replace(plan_snapshot::text, '"name": "Arroz com Feijão"', '"name": "Almoço"'))::jsonb
WHERE plan_snapshot::text LIKE '%"name": "Arroz com Feijão"%';

UPDATE public.v3_diet_templates
SET plan_snapshot = (replace(plan_snapshot::text, '"name": "Arroz e Feijão"', '"name": "Almoço"'))::jsonb
WHERE plan_snapshot::text LIKE '%"name": "Arroz e Feijão"%';

-- 2. Corrigir o template "Prático Café da Manhã" que tinha o item acoplado
-- Como o JSONB é complexo para manipular item por item em SQL puro de forma dinâmica, 
-- vamos usar uma abordagem de substituição de string controlada para o item específico.
-- O item era: {"name": "Arroz e Feijão", "kcal": 144, "protein": 6, "carbs": 35, "fat": 1, ...}
-- Vamos substituir por dois itens.

UPDATE public.v3_diet_templates
SET plan_snapshot = (
  replace(
    plan_snapshot::text,
    '{"carbs": 35, "clinical_mass_g": 100, "fat": 1, "id": "573b4a3a-0c00-45fa-b7df-49939b71d82f", "imageUrl": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/arroz-integral.jpg", "instanceId": "fc9294f5-ec21-4a13-a286-1869b42163fa", "is_primary": true, "kcal": 144, "macros": {"carbs_g": 35, "fat_g": 1, "kcal": 144, "protein_g": 6}, "name": "Arroz e Feijão", "protein": 6, "quantity": 1, "quantity_display": "3 colheres de cada", "substitutions": [], "title": "Arroz e Feijão"}',
    '{"carbs": 19, "clinical_mass_g": 75, "fat": 1, "id": "e2241bf8-5312-444e-aa07-3327c7957807", "imageUrl": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/arroz-integral.jpg", "instanceId": "fc9294f5-ec21-4a13-a286-1869b42163fa", "is_primary": true, "kcal": 90, "macros": {"carbs_g": 19, "fat_g": 1, "kcal": 90, "protein_g": 2}, "name": "Arroz Integral", "protein": 2, "quantity": 1, "quantity_display": "3 colheres de sopa", "substitutions": [], "title": "Arroz Integral"}, {"carbs": 16, "clinical_mass_g": 50, "fat": 0, "id": "573b4a3a-0c00-45fa-b7df-49939b71d82f", "imageUrl": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/feijao-carioca.jpg", "instanceId": "dc9294f5-ec21-4a13-a286-1869b42163fb", "is_primary": true, "kcal": 54, "macros": {"carbs_g": 16, "fat_g": 0, "kcal": 54, "protein_g": 4}, "name": "Feijão Carioca", "protein": 4, "quantity": 1, "quantity_display": "2 conchas pequenas", "substitutions": [], "title": "Feijão Carioca"}'
  )
)::jsonb
WHERE title = 'Prático Café da Manhã';

-- 3. Atualizar rascunhos ativos que possam ter o item acoplado
-- Mesma lógica de substituição de string no payload JSON
UPDATE public.v3_drafts
SET payload = (
  replace(
    payload::text,
    '"name": "Arroz e Feijão"',
    '"name": "Arroz Integral", "protein": 2, "kcal": 90, "carbs": 19, "fat": 1}, {"name": "Feijão Carioca", "protein": 4, "kcal": 54, "carbs": 16, "fat": 0'
  )
)::jsonb
WHERE payload::text LIKE '%"name": "Arroz e Feijão"%';

UPDATE public.v3_drafts
SET payload = (
  replace(
    payload::text,
    '"name": "Arroz com Feijão"',
    '"name": "Arroz Integral", "protein": 2, "kcal": 90, "carbs": 19, "fat": 1}, {"name": "Feijão Carioca", "protein": 4, "kcal": 54, "carbs": 16, "fat": 0'
  )
)::jsonb
WHERE payload::text LIKE '%"name": "Arroz com Feijão"%';

-- 4. Renomear nomes de refeição nos rascunhos também
UPDATE public.v3_drafts
SET payload = (replace(payload::text, '"name": "Arroz com Feijão"', '"name": "Almoço"'))::jsonb
WHERE payload::text LIKE '%"name": "Arroz com Feijão"%';
