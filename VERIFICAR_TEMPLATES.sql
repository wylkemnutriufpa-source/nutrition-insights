-- Verificar quantos templates existem em meal_plan_templates
SELECT 
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE created_at >= '2026-05-21') as criados_hoje,
  COUNT(*) FILTER (WHERE category IN ('saude', 'emagrecimento', 'hipertrofia', 'clinico')) as com_categoria,
  COUNT(*) FILTER (WHERE name LIKE '%kcal') as com_kcal,
  COUNT(*) FILTER (WHERE jsonb_array_length(meals) > 0) as com_meals,
  COUNT(*) FILTER (WHERE SUBSTRING(name FROM '\d+') IS NOT NULL) as com_numero
FROM meal_plan_templates;

-- Ver alguns exemplos
SELECT 
  name, 
  category, 
  created_at,
  jsonb_array_length(meals) as meals_count,
  SUBSTRING(name FROM '\d+') as kcal_extraido,
  dietary_restrictions IS NOT NULL as tem_restricoes
FROM meal_plan_templates
WHERE created_at >= '2026-05-21'
LIMIT 10;
