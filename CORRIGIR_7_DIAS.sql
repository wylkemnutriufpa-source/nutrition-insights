-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- CORREÇÃO FINAL - CONVERTER TODOS OS 7 DIAS
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Função para converter estrutura de meals para days (TODOS OS 7 DIAS)
CREATE OR REPLACE FUNCTION convert_all_days(meals_array JSONB)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'days',
    jsonb_agg(
      jsonb_build_object(
        'day_of_week', row_number,
        'meals', day_data->'meals'
      )
      ORDER BY row_number
    )
  )
  INTO result
  FROM jsonb_array_elements(meals_array) WITH ORDINALITY AS t(day_data, row_number);
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Atualizar todos os templates criados hoje com TODOS OS 7 DIAS
UPDATE v3_diet_templates vt
SET plan_snapshot = (
  SELECT jsonb_object_agg(
    kcal_key,
    convert_all_days(t.meals)
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

-- Verificar resultado (deve mostrar 7 dias para cada template)
SELECT 
  title,
  family,
  kcal_profiles->>0 as kcal,
  jsonb_array_length((plan_snapshot->(kcal_profiles->>0))->'days') as total_dias,
  (plan_snapshot->(kcal_profiles->>0))->'days'->0->'meals'->0->>'name' as primeira_refeicao_dia_1,
  (plan_snapshot->(kcal_profiles->>0))->'days'->6->'meals'->0->>'name' as primeira_refeicao_dia_7
FROM v3_diet_templates
WHERE active = true
  AND created_at >= '2026-05-21'
ORDER BY family, title
LIMIT 10;

-- Verificar um template completo (primeiras 2 refeições de cada dia)
SELECT 
  title,
  jsonb_pretty(
    jsonb_build_object(
      'dia_1', (plan_snapshot->'1500'->'days'->0->'meals'->0),
      'dia_2', (plan_snapshot->'1500'->'days'->1->'meals'->0),
      'dia_3', (plan_snapshot->'1500'->'days'->2->'meals'->0),
      'dia_4', (plan_snapshot->'1500'->'days'->3->'meals'->0),
      'dia_5', (plan_snapshot->'1500'->'days'->4->'meals'->0),
      'dia_6', (plan_snapshot->'1500'->'days'->5->'meals'->0),
      'dia_7', (plan_snapshot->'1500'->'days'->6->'meals'->0)
    )
  ) as primeiras_refeicoes_7_dias
FROM v3_diet_templates
WHERE active = true
  AND title = 'Emagrecimento 1500 kcal'
LIMIT 1;
