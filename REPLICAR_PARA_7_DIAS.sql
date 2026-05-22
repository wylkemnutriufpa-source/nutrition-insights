-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- SOLUÇÃO FINAL - REPLICAR 1 DIA PARA 7 DIAS
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Função para replicar 1 dia em 7 dias
CREATE OR REPLACE FUNCTION replicate_to_7_days(meals_array JSONB)
RETURNS JSONB AS $$
DECLARE
  first_day_meals JSONB;
  days_array JSONB := '[]'::jsonb;
  i INTEGER;
BEGIN
  -- Pegar as refeições do primeiro (e único) dia
  first_day_meals := meals_array->0->'meals';
  
  -- Replicar para 7 dias
  FOR i IN 1..7 LOOP
    days_array := days_array || jsonb_build_object(
      'day_of_week', i,
      'meals', first_day_meals
    );
  END LOOP;
  
  RETURN jsonb_build_object('days', days_array);
END;
$$ LANGUAGE plpgsql;

-- Atualizar todos os templates criados hoje
UPDATE v3_diet_templates vt
SET plan_snapshot = (
  SELECT jsonb_object_agg(
    kcal_key,
    replicate_to_7_days(t.meals)
  )
  FROM meal_plan_templates t,
       LATERAL (SELECT SUBSTRING(t.name FROM '\d+') as kcal_key) k
  WHERE t.created_at >= '2026-05-21'
    AND generate_slug(t.name) = vt.slug
    AND k.kcal_key IS NOT NULL
),
updated_at = now()
WHERE vt.created_at >= '2026-05-21'
  AND vt.active = true;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- VERIFICAÇÕES
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- 1. Verificar que todos têm 7 dias
SELECT 
  title,
  family,
  kcal_profiles->>0 as kcal,
  jsonb_array_length((plan_snapshot->(kcal_profiles->>0))->'days') as total_dias,
  (plan_snapshot->(kcal_profiles->>0))->'days'->0->'meals'->0->>'name' as cafe_dia_1,
  (plan_snapshot->(kcal_profiles->>0))->'days'->6->'meals'->0->>'name' as cafe_dia_7
FROM v3_diet_templates
WHERE active = true
  AND created_at >= '2026-05-21'
ORDER BY family, title
LIMIT 10;

-- 2. Verificar estrutura completa de um template
SELECT 
  title,
  jsonb_pretty(plan_snapshot->(kcal_profiles->>0)->'days'->0) as estrutura_dia_1
FROM v3_diet_templates
WHERE active = true
  AND title = 'Emagrecimento 1500 kcal'
LIMIT 1;

-- 3. Contar templates por família
SELECT 
  family,
  COUNT(*) as quantidade
FROM v3_diet_templates
WHERE active = true
  AND created_at >= '2026-05-21'
GROUP BY family
ORDER BY 
  CASE family
    WHEN 'Emagrecimento' THEN 1
    WHEN 'Hipertrofia' THEN 2
    WHEN 'Saúde' THEN 3
    WHEN 'Clínico' THEN 4
    ELSE 5
  END;
