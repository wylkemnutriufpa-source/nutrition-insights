-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- CORREÇÃO URGENTE - CONVERTER PLAN_SNAPSHOT PARA FORMATO CORRETO
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Função para converter estrutura de meals para days (TODOS OS 7 DIAS)
CREATE OR REPLACE FUNCTION convert_meals_to_days(meals_array JSONB)
RETURNS JSONB AS $$
DECLARE
  day_record JSONB;
  days_array JSONB := '[]'::jsonb;
  day_index INTEGER := 1;
BEGIN
  -- Iterar sobre TODOS os dias no array meals
  FOR day_record IN SELECT * FROM jsonb_array_elements(meals_array)
  LOOP
    days_array := days_array || jsonb_build_object(
      'day_of_week', day_index,
      'meals', day_record->'meals'
    );
    day_index := day_index + 1;
  END LOOP;
  
  -- Garantir que temos 7 dias (replicar o último se necessário)
  WHILE jsonb_array_length(days_array) < 7 LOOP
    days_array := days_array || (days_array->-1);
  END LOOP;
  
  RETURN jsonb_build_object('days', days_array);
END;
$$ LANGUAGE plpgsql;

-- Atualizar todos os templates criados hoje
UPDATE v3_diet_templates vt
SET plan_snapshot = (
  SELECT jsonb_object_agg(
    kcal_key,
    convert_meals_to_days(t.meals)
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

-- Verificar resultado
SELECT 
  title,
  family,
  kcal_profiles,
  jsonb_typeof(plan_snapshot) as snapshot_type,
  (plan_snapshot->(kcal_profiles->>0))->>'days' IS NOT NULL as tem_days,
  jsonb_array_length((plan_snapshot->(kcal_profiles->>0))->'days') as dias_count
FROM v3_diet_templates
WHERE active = true
  AND created_at >= '2026-05-21'
ORDER BY family, title
LIMIT 10;

-- Verificar um exemplo completo
SELECT 
  title,
  jsonb_pretty(plan_snapshot->(kcal_profiles->>0)) as snapshot_formatado
FROM v3_diet_templates
WHERE active = true
  AND title = 'Emagrecimento 1500 kcal'
LIMIT 1;
