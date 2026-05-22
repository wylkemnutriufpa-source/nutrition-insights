-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- DIAGNÓSTICO: POR QUE ESTÁ VAZIO?
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- 1. Ver o plan_snapshot RAW de um template
SELECT 
  title,
  slug,
  kcal_profiles,
  plan_snapshot
FROM v3_diet_templates
WHERE slug = 'emagrecimento_1500_kcal'
LIMIT 1;

-- 2. Ver se meal_plan_templates tem os dados
SELECT 
  name,
  jsonb_pretty(meals->0) as primeiro_dia_completo
FROM meal_plan_templates
WHERE name = 'Emagrecimento 1500 kcal'
LIMIT 1;

-- 3. Verificar se o UPDATE funcionou
SELECT 
  slug,
  updated_at,
  plan_snapshot IS NOT NULL as tem_snapshot,
  jsonb_typeof(plan_snapshot) as tipo_snapshot
FROM v3_diet_templates
WHERE slug IN (
  'colesterol_alto_1600_kcal',
  'emagrecimento_1500_kcal',
  'emagrecimento_1200_kcal'
);

-- 4. Tentar acessar o snapshot manualmente
SELECT 
  title,
  plan_snapshot->'1500' as snapshot_1500,
  plan_snapshot->'1500'->'days' as days_array,
  jsonb_array_length(plan_snapshot->'1500'->'days') as total_dias
FROM v3_diet_templates
WHERE slug = 'emagrecimento_1500_kcal';
