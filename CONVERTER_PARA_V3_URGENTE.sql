-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- CONVERTER OS 3 TEMPLATES PRIORITÁRIOS PARA FORMATO DO EDITOR V3
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Função para converter 7 dias para formato V3
CREATE OR REPLACE FUNCTION convert_7_days_to_v3(meals_array JSONB)
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

-- Atualizar os 3 templates prioritários no Editor V3
UPDATE v3_diet_templates vt
SET plan_snapshot = (
  SELECT jsonb_object_agg(
    kcal_key,
    convert_7_days_to_v3(t.meals)
  )
  FROM meal_plan_templates t,
       LATERAL (SELECT SUBSTRING(t.name FROM '\d+') as kcal_key) k
  WHERE t.name = CASE vt.slug
    WHEN 'colesterol_alto_1600_kcal' THEN 'Colesterol Alto 1600 kcal'
    WHEN 'emagrecimento_1500_kcal' THEN 'Emagrecimento 1500 kcal'
    WHEN 'emagrecimento_1200_kcal' THEN 'Emagrecimento 1200 kcal'
  END
  AND k.kcal_key IS NOT NULL
),
updated_at = now()
WHERE vt.slug IN (
  'colesterol_alto_1600_kcal',
  'emagrecimento_1500_kcal',
  'emagrecimento_1200_kcal'
);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- VERIFICAÇÃO FINAL NO EDITOR V3
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- 1. Verificar que os 3 templates têm 7 dias no Editor V3
SELECT 
  title,
  family,
  kcal_profiles->>0 as kcal,
  jsonb_array_length((plan_snapshot->(kcal_profiles->>0))->'days') as total_dias,
  (plan_snapshot->(kcal_profiles->>0))->'days'->0->'meals'->0->>'name' as cafe_dia_1,
  (plan_snapshot->(kcal_profiles->>0))->'days'->6->'meals'->0->>'name' as cafe_dia_7
FROM v3_diet_templates
WHERE slug IN (
  'colesterol_alto_1600_kcal',
  'emagrecimento_1500_kcal',
  'emagrecimento_1200_kcal'
)
ORDER BY family, title;

-- 2. Ver estrutura completa do dia 1 de Emagrecimento 1500 kcal
SELECT 
  title,
  jsonb_pretty((plan_snapshot->'1500'->'days'->0)) as estrutura_dia_1_completa
FROM v3_diet_templates
WHERE slug = 'emagrecimento_1500_kcal';

-- 3. Ver todas as refeições de café da manhã dos 7 dias
SELECT 
  title,
  jsonb_pretty(
    jsonb_build_object(
      'dia_1_cafe', (plan_snapshot->'1500'->'days'->0->'meals'->0->>'name'),
      'dia_2_cafe', (plan_snapshot->'1500'->'days'->1->'meals'->0->>'name'),
      'dia_3_cafe', (plan_snapshot->'1500'->'days'->2->'meals'->0->>'name'),
      'dia_4_cafe', (plan_snapshot->'1500'->'days'->3->'meals'->0->>'name'),
      'dia_5_cafe', (plan_snapshot->'1500'->'days'->4->'meals'->0->>'name'),
      'dia_6_cafe', (plan_snapshot->'1500'->'days'->5->'meals'->0->>'name'),
      'dia_7_cafe', (plan_snapshot->'1500'->'days'->6->'meals'->0->>'name')
    )
  ) as cafes_da_semana
FROM v3_diet_templates
WHERE slug = 'emagrecimento_1500_kcal';
