-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- DIAGNÓSTICO URGENTE - VERIFICAR PLAN_SNAPSHOT
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- 1. Ver se plan_snapshot está vazio
SELECT 
  title,
  family,
  kcal_profiles,
  plan_snapshot,
  jsonb_typeof(plan_snapshot) as snapshot_type,
  jsonb_array_length(
    CASE 
      WHEN jsonb_typeof(plan_snapshot) = 'object' 
      THEN plan_snapshot->(kcal_profiles->>0)
      ELSE plan_snapshot
    END
  ) as meals_count
FROM v3_diet_templates
WHERE active = true
  AND created_at >= '2026-05-21'
ORDER BY family, title
LIMIT 10;

-- 2. Ver um exemplo completo de plan_snapshot
SELECT 
  title,
  plan_snapshot
FROM v3_diet_templates
WHERE active = true
  AND title = 'Emagrecimento 1500 kcal'
LIMIT 1;

-- 3. Comparar com a origem (meal_plan_templates)
SELECT 
  name,
  jsonb_array_length(meals) as meals_count,
  meals->0->'day' as primeiro_dia,
  jsonb_array_length(meals->0->'meals') as refeicoes_primeiro_dia
FROM meal_plan_templates
WHERE created_at >= '2026-05-21'
  AND name = 'Emagrecimento 1500 kcal'
LIMIT 1;
