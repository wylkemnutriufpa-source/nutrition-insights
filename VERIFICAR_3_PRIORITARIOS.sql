-- Verificar se os 3 templates prioritários têm 7 dias
SELECT 
  name,
  category,
  jsonb_array_length(meals) as total_dias,
  meals->0->>'day' as dia_1,
  meals->1->>'day' as dia_2,
  meals->6->>'day' as dia_7
FROM meal_plan_templates
WHERE name IN (
  'Colesterol Alto 1600 kcal',
  'Emagrecimento 1500 kcal',
  'Emagrecimento 1200 kcal'
)
ORDER BY name;

-- Ver o conteúdo completo de um dos 7 dias
SELECT 
  name,
  jsonb_pretty(meals->2) as dia_3_completo
FROM meal_plan_templates
WHERE name = 'Emagrecimento 1500 kcal';
