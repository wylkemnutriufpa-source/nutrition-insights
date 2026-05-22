-- Verificar quantos dias cada template tem
SELECT 
  name,
  category,
  jsonb_array_length(meals) as total_dias,
  meals->0->>'day' as dia_1,
  meals->1->>'day' as dia_2,
  meals->2->>'day' as dia_3
FROM meal_plan_templates
WHERE created_at >= '2026-05-21'
ORDER BY name
LIMIT 10;
