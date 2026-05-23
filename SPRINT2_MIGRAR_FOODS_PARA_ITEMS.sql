-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 🛡️ SPRINT 2 — MIGRAR TEMPLATES: foods → items (estrutura V3 soberana)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- OBJETIVO: Converter TODOS os templates que ainda usam "foods" para "items"
-- Depois disso, o extractMealsFromSnapshot.ts pode ser simplificado e o
-- translator "foods → items" pode ser deletado do frontend.
--
-- ANTES (estrutura antiga):
--   meal.foods = [{ name, qty, kcal, protein, carbs, fat, imageUrl, substitutions }]
--
-- DEPOIS (estrutura V3 soberana):
--   meal.items = [{ 
--     id, title, name, imageUrl, quantity_display, clinical_mass_g,
--     kcal, protein, carbs, fat, substitutions
--   }]
--
-- EXECUTE NO SUPABASE SQL EDITOR (em ordem: 1, 2, 3)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- ════════════════════════════════════════════════════════════════════
-- PASSO 0: DIAGNÓSTICO — quantos templates ainda usam "foods"?
-- Execute isso primeiro para ver o cenário atual.
-- ════════════════════════════════════════════════════════════════════
SELECT 
  COUNT(*) AS total_templates,
  COUNT(*) FILTER (
    WHERE EXISTS (
      SELECT 1
      FROM jsonb_each(plan_snapshot) AS profile,
           jsonb_array_elements(profile.value->'days') AS day,
           jsonb_array_elements(day->'meals') AS meal
      WHERE meal ? 'foods' AND NOT (meal ? 'items')
    )
  ) AS templates_com_foods_antigo,
  COUNT(*) FILTER (
    WHERE NOT EXISTS (
      SELECT 1
      FROM jsonb_each(plan_snapshot) AS profile,
           jsonb_array_elements(profile.value->'days') AS day,
           jsonb_array_elements(day->'meals') AS meal
      WHERE meal ? 'foods' AND NOT (meal ? 'items')
    )
  ) AS templates_ja_em_items
FROM v3_diet_templates
WHERE active = true AND plan_snapshot IS NOT NULL;


-- ════════════════════════════════════════════════════════════════════
-- PASSO 1: CRIAR FUNÇÃO DE CONVERSÃO
-- Converte um objeto de refeição de foods → items (recursivo no snapshot)
-- ════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION migrate_meal_foods_to_items(snapshot JSONB)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_result JSONB;
  v_profile_key TEXT;
  v_profile_val JSONB;
  v_days JSONB;
  v_day JSONB;
  v_meals JSONB;
  v_meal JSONB;
  v_foods JSONB;
  v_items JSONB;
  v_food JSONB;
  v_item JSONB;
  v_sub JSONB;
  v_subs JSONB;
  v_converted_subs JSONB;
BEGIN
  v_result := '{}'::JSONB;

  -- Iterar sobre cada perfil calórico (ex: "1500", "1800", "2000")
  FOR v_profile_key, v_profile_val IN SELECT * FROM jsonb_each(snapshot) LOOP
    v_days := '[]'::JSONB;

    -- Iterar sobre cada dia
    FOR v_day IN SELECT * FROM jsonb_array_elements(v_profile_val->'days') LOOP
      v_meals := '[]'::JSONB;

      -- Iterar sobre cada refeição do dia
      FOR v_meal IN SELECT * FROM jsonb_array_elements(v_day->'meals') LOOP
        
        -- Se a refeição já tem 'items' com conteúdo, manter como está
        IF (jsonb_array_length(COALESCE(v_meal->'items', '[]'::JSONB)) > 0) THEN
          v_meals := v_meals || jsonb_build_array(v_meal);
          CONTINUE;
        END IF;

        -- Se tem 'foods', converter para 'items'
        v_foods := COALESCE(v_meal->'foods', '[]'::JSONB);
        v_items := '[]'::JSONB;

        FOR v_food IN SELECT * FROM jsonb_array_elements(v_foods) LOOP
          -- Converter substituições (também de foods para items se necessário)
          v_subs := COALESCE(v_food->'substitutions', '[]'::JSONB);
          v_converted_subs := '[]'::JSONB;

          FOR v_sub IN SELECT * FROM jsonb_array_elements(v_subs) LOOP
            v_converted_subs := v_converted_subs || jsonb_build_array(
              jsonb_build_object(
                'id',               COALESCE(v_sub->>'id', gen_random_uuid()::TEXT),
                'instanceId',       COALESCE(v_sub->>'instanceId', gen_random_uuid()::TEXT),
                'title',            COALESCE(v_sub->>'title', v_sub->>'name', 'Substituição'),
                'name',             COALESCE(v_sub->>'name', v_sub->>'title', 'Substituição'),
                'imageUrl',         COALESCE(v_sub->>'imageUrl', v_sub->>'image_url', v_sub->>'image'),
                'quantity_display', COALESCE(v_sub->>'quantity_display', v_sub->>'qty', '100g'),
                'qty',              COALESCE(v_sub->>'qty', v_sub->>'quantity_display', '100g'),
                'clinical_mass_g',  COALESCE((v_sub->>'clinical_mass_g')::NUMERIC, 100),
                'kcal',             COALESCE((v_sub->>'kcal')::NUMERIC, 0),
                'protein',          COALESCE((v_sub->>'protein')::NUMERIC, 0),
                'carbs',            COALESCE((v_sub->>'carbs')::NUMERIC, 0),
                'fat',              COALESCE((v_sub->>'fat')::NUMERIC, 0)
              )
            );
          END LOOP;

          -- Parsear clinical_mass_g a partir de qty (ex: "100g" → 100, "2 unidades" → 2)
          DECLARE
            v_qty_str TEXT := COALESCE(v_food->>'qty', v_food->>'quantity_display', '100g');
            v_clinical_mass NUMERIC;
          BEGIN
            v_clinical_mass := COALESCE(
              (v_food->>'clinical_mass_g')::NUMERIC,
              (REGEXP_REPLACE(v_qty_str, '[^0-9.]', '', 'g'))::NUMERIC,
              100
            );
            IF v_clinical_mass = 0 THEN v_clinical_mass := 100; END IF;

            -- Construir item V3 soberano
            v_item := jsonb_build_object(
              'id',               COALESCE(v_food->>'id', gen_random_uuid()::TEXT),
              'instanceId',       COALESCE(v_food->>'instanceId', gen_random_uuid()::TEXT),
              'title',            COALESCE(v_food->>'title', v_food->>'name', 'Item'),
              'name',             COALESCE(v_food->>'name', v_food->>'title', 'Item'),
              'imageUrl',         COALESCE(v_food->>'imageUrl', v_food->>'image_url', v_food->>'image'),
              'quantity_display', COALESCE(v_food->>'quantity_display', v_food->>'qty', v_clinical_mass::TEXT || 'g'),
              'qty',              COALESCE(v_food->>'qty', v_food->>'quantity_display', v_clinical_mass::TEXT || 'g'),
              'clinical_mass_g',  v_clinical_mass,
              'kcal',             COALESCE((v_food->>'kcal')::NUMERIC, 0),
              'protein',          COALESCE((v_food->>'protein')::NUMERIC, 0),
              'carbs',            COALESCE((v_food->>'carbs')::NUMERIC, 0),
              'fat',              COALESCE((v_food->>'fat')::NUMERIC, 0),
              'is_primary',       true,
              'substitutions',    v_converted_subs
            );
          END;

          v_items := v_items || jsonb_build_array(v_item);
        END LOOP;

        -- Construir refeição com items (remover foods)
        v_meal := v_meal
          - 'foods'
          || jsonb_build_object('items', v_items);

        v_meals := v_meals || jsonb_build_array(v_meal);
      END LOOP;

      -- Reconstruir dia com refeições migradas
      v_day := v_day || jsonb_build_object('meals', v_meals);
      v_days := v_days || jsonb_build_array(v_day);
    END LOOP;

    -- Reconstruir perfil com dias migrados
    v_result := v_result || jsonb_build_object(
      v_profile_key,
      v_profile_val || jsonb_build_object('days', v_days)
    );
  END LOOP;

  RETURN v_result;
END;
$$;


-- ════════════════════════════════════════════════════════════════════
-- PASSO 2: EXECUTAR MIGRAÇÃO NOS TEMPLATES
-- Atualiza todos os templates que ainda têm "foods" sem "items"
-- ════════════════════════════════════════════════════════════════════
UPDATE v3_diet_templates
SET 
  plan_snapshot = migrate_meal_foods_to_items(plan_snapshot),
  updated_at = now()
WHERE 
  active = true
  AND plan_snapshot IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM jsonb_each(plan_snapshot) AS profile,
         jsonb_array_elements(profile.value->'days') AS day,
         jsonb_array_elements(day->'meals') AS meal
    WHERE meal ? 'foods' AND NOT (meal ? 'items')
  );

-- Ver quantos foram atualizados
SELECT COUNT(*) AS templates_migrados FROM v3_diet_templates WHERE updated_at >= now() - interval '10 seconds';


-- ════════════════════════════════════════════════════════════════════
-- PASSO 3: VERIFICAR RESULTADO
-- Confirmar que TODOS os templates agora usam 'items'
-- ════════════════════════════════════════════════════════════════════
SELECT 
  COUNT(*) AS total,
  COUNT(*) FILTER (
    WHERE EXISTS (
      SELECT 1
      FROM jsonb_each(plan_snapshot) AS profile,
           jsonb_array_elements(profile.value->'days') AS day,
           jsonb_array_elements(day->'meals') AS meal
      WHERE meal ? 'foods' AND NOT (meal ? 'items')
    )
  ) AS ainda_com_foods_antigo,  -- DEVE SER 0
  COUNT(*) FILTER (
    WHERE NOT EXISTS (
      SELECT 1
      FROM jsonb_each(plan_snapshot) AS profile,
           jsonb_array_elements(profile.value->'days') AS day,
           jsonb_array_elements(day->'meals') AS meal
      WHERE meal ? 'foods' AND NOT (meal ? 'items')
    )
  ) AS ja_em_items  -- DEVE SER IGUAL AO TOTAL
FROM v3_diet_templates
WHERE active = true AND plan_snapshot IS NOT NULL;


-- ════════════════════════════════════════════════════════════════════
-- PASSO 4: AMOSTRA — Confirmar estrutura de um item migrado
-- ════════════════════════════════════════════════════════════════════
SELECT 
  t.title,
  jsonb_array_element(
    jsonb_array_element(
      jsonb_array_element(
        (profile.value->'days'),
        0
      )->'meals',
      0
    )->'items',
    0
  ) AS primeiro_item
FROM v3_diet_templates t,
  LATERAL jsonb_each(t.plan_snapshot) AS profile
WHERE t.active = true
LIMIT 3;


-- ════════════════════════════════════════════════════════════════════
-- PASSO 5 (OPCIONAL): LIMPAR FUNÇÃO AUXILIAR APÓS USO
-- ════════════════════════════════════════════════════════════════════
-- DROP FUNCTION IF EXISTS migrate_meal_foods_to_items(JSONB);
