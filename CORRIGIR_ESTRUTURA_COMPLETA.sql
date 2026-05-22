-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- CORREÇÃO COMPLETA DA ESTRUTURA PARA O EDITOR V3
-- Converter foods → items com todos os campos necessários
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Função para converter foods em items (formato correto do Editor V3)
CREATE OR REPLACE FUNCTION convert_foods_to_items(meal JSONB)
RETURNS JSONB AS $$
DECLARE
  foods_array JSONB;
  items_array JSONB := '[]'::jsonb;
  food_item JSONB;
BEGIN
  foods_array := meal->'foods';
  
  IF foods_array IS NULL THEN
    RETURN meal;
  END IF;
  
  -- Converter cada food em item
  FOR food_item IN SELECT * FROM jsonb_array_elements(foods_array)
  LOOP
    items_array := items_array || jsonb_build_object(
      'id', gen_random_uuid()::text,
      'name', food_item->>'name',
      'quantity_display', food_item->>'qty',
      'clinical_mass_g', 100, -- Valor padrão
      'kcal', COALESCE((food_item->>'kcal')::numeric, 0),
      'protein_g', 0, -- Será calculado depois
      'carbs_g', 0,
      'fat_g', 0,
      'fiber_g', 0,
      'image', COALESCE(
        food_item->>'image',
        'https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/placeholder.jpg'
      )
    );
  END LOOP;
  
  -- Retornar refeição com items ao invés de foods
  RETURN jsonb_build_object(
    'id', gen_random_uuid()::text,
    'name', meal->>'name',
    'time', meal->>'time',
    'type', meal->>'type',
    'image', meal->>'image',
    'imageUrl', meal->>'image',
    'items', items_array
  );
END;
$$ LANGUAGE plpgsql;

-- Função para processar um dia completo
CREATE OR REPLACE FUNCTION process_day_meals(day_data JSONB)
RETURNS JSONB AS $$
DECLARE
  meals_array JSONB;
  processed_meals JSONB := '[]'::jsonb;
  meal JSONB;
BEGIN
  meals_array := day_data->'meals';
  
  IF meals_array IS NULL THEN
    RETURN day_data;
  END IF;
  
  -- Processar cada refeição
  FOR meal IN SELECT * FROM jsonb_array_elements(meals_array)
  LOOP
    processed_meals := processed_meals || convert_foods_to_items(meal);
  END LOOP;
  
  RETURN jsonb_build_object(
    'day_of_week', day_data->'day_of_week',
    'meals', processed_meals
  );
END;
$$ LANGUAGE plpgsql;

-- Função para converter 7 dias com estrutura completa
CREATE OR REPLACE FUNCTION convert_to_v3_complete(meals_array JSONB)
RETURNS JSONB AS $$
DECLARE
  days_array JSONB := '[]'::jsonb;
  day_data JSONB;
  day_index INTEGER := 1;
BEGIN
  -- Processar cada dia
  FOR day_data IN SELECT * FROM jsonb_array_elements(meals_array)
  LOOP
    days_array := days_array || jsonb_build_object(
      'day_of_week', day_index,
      'meals', (
        SELECT jsonb_agg(convert_foods_to_items(meal))
        FROM jsonb_array_elements(day_data->'meals') AS meal
      )
    );
    day_index := day_index + 1;
  END LOOP;
  
  RETURN jsonb_build_object('days', days_array);
END;
$$ LANGUAGE plpgsql;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- ATUALIZAR OS 3 TEMPLATES PRIORITÁRIOS COM ESTRUTURA CORRETA
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

UPDATE v3_diet_templates vt
SET plan_snapshot = (
  SELECT jsonb_object_agg(
    kcal_key,
    convert_to_v3_complete(t.meals)
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
-- VERIFICAÇÕES DETALHADAS
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- 1. Verificar estrutura básica
SELECT 
  title,
  family,
  jsonb_array_length((plan_snapshot->(kcal_profiles->>0))->'days') as total_dias,
  jsonb_array_length((plan_snapshot->(kcal_profiles->>0))->'days'->0->'meals') as refeicoes_dia_1,
  (plan_snapshot->(kcal_profiles->>0))->'days'->0->'meals'->0->>'name' as nome_primeira_refeicao,
  (plan_snapshot->(kcal_profiles->>0))->'days'->0->'meals'->0->>'image' as imagem_primeira_refeicao
FROM v3_diet_templates
WHERE slug IN (
  'colesterol_alto_1600_kcal',
  'emagrecimento_1500_kcal',
  'emagrecimento_1200_kcal'
)
ORDER BY title;

-- 2. Verificar items dentro de uma refeição
SELECT 
  title,
  jsonb_pretty(
    (plan_snapshot->'1500'->'days'->0->'meals'->0)
  ) as primeira_refeicao_completa
FROM v3_diet_templates
WHERE slug = 'emagrecimento_1500_kcal';

-- 3. Verificar se items existem
SELECT 
  title,
  jsonb_array_length(
    (plan_snapshot->(kcal_profiles->>0))->'days'->0->'meals'->0->'items'
  ) as total_items_primeira_refeicao,
  (plan_snapshot->(kcal_profiles->>0))->'days'->0->'meals'->0->'items'->0->>'name' as primeiro_item
FROM v3_diet_templates
WHERE slug IN (
  'colesterol_alto_1600_kcal',
  'emagrecimento_1500_kcal',
  'emagrecimento_1200_kcal'
)
ORDER BY title;

-- 4. Ver estrutura completa de um item
SELECT 
  title,
  jsonb_pretty(
    (plan_snapshot->'1500'->'days'->0->'meals'->0->'items'->0)
  ) as estrutura_item_completo
FROM v3_diet_templates
WHERE slug = 'emagrecimento_1500_kcal';
