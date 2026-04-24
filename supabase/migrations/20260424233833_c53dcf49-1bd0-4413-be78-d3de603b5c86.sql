
-- ── 1. Backfill macros essenciais na meal_visual_library ─────────────
-- Valores baseados em tabelas TBCA / USDA por porção padrão clínica

UPDATE meal_visual_library SET
  default_calories = 270, default_protein = 9, default_carbs = 53, default_fat = 2, default_portion = COALESCE(default_portion, '1 unidade (90g)')
WHERE slug = 'pao-frances' AND (default_calories IS NULL OR default_calories = 0);

UPDATE meal_visual_library SET
  default_calories = 130, default_protein = 8, default_carbs = 23, default_fat = 1, default_portion = COALESCE(default_portion, '1 concha (130g)')
WHERE slug = 'feijao-carioca' AND (default_calories IS NULL OR default_calories = 0);

-- Carnes/proteínas (~120g cozido)
UPDATE meal_visual_library SET default_calories = 200, default_protein = 28, default_carbs = 0, default_fat = 9, default_portion = COALESCE(default_portion, '120g')
WHERE slug IN ('acem','carne-assada-de-panela','maminha','picanha') AND (default_calories IS NULL OR default_calories = 0);

UPDATE meal_visual_library SET default_calories = 180, default_protein = 26, default_carbs = 0, default_fat = 8, default_portion = COALESCE(default_portion, '120g')
WHERE slug IN ('coxa-e-sobrecoxa','file-de-porco','lombo-suino') AND (default_calories IS NULL OR default_calories = 0);

UPDATE meal_visual_library SET default_calories = 140, default_protein = 26, default_carbs = 0, default_fat = 3, default_portion = COALESCE(default_portion, '120g')
WHERE slug = 'file-de-tilapia' AND (default_calories IS NULL OR default_calories = 0);

-- Combos (carne+acompanhamento ~ pacote completo)
UPDATE meal_visual_library SET default_calories = 380, default_protein = 30, default_carbs = 30, default_fat = 14, default_portion = COALESCE(default_portion, '1 prato')
WHERE slug IN ('carne-com-batata','costela-bovina-com-batata','peixe-com-legumes') AND (default_calories IS NULL OR default_calories = 0);

UPDATE meal_visual_library SET default_calories = 420, default_protein = 28, default_carbs = 50, default_fat = 10, default_portion = COALESCE(default_portion, '1 prato')
WHERE slug = 'macarronada-de-camarao' AND (default_calories IS NULL OR default_calories = 0);

UPDATE meal_visual_library SET default_calories = 220, default_protein = 8, default_carbs = 42, default_fat = 1, default_portion = COALESCE(default_portion, '1 escumadeira (130g cozido)')
WHERE slug = 'macarrao-integral' AND (default_calories IS NULL OR default_calories = 0);

-- Azeite (1 colher de sopa)
UPDATE meal_visual_library SET default_calories = 90, default_protein = 0, default_carbs = 0, default_fat = 10, default_portion = COALESCE(default_portion, '1 colher de sopa (10ml)')
WHERE slug = 'azeite' AND (default_calories IS NULL OR default_calories = 0);

-- Café da manhã
UPDATE meal_visual_library SET default_calories = 220, default_protein = 12, default_carbs = 28, default_fat = 7, default_portion = COALESCE(default_portion, '1 porção')
WHERE slug = 'cha-com-torrada-e-queijo' AND (default_calories IS NULL OR default_calories = 0);

UPDATE meal_visual_library SET default_calories = 250, default_protein = 7, default_carbs = 50, default_fat = 4, default_portion = COALESCE(default_portion, '1 tigela (200g)')
WHERE slug IN ('mamao-com-aveia','mingau-de-aveia','mingau-aveia') AND (default_calories IS NULL OR default_calories = 0);

UPDATE meal_visual_library SET default_calories = 280, default_protein = 22, default_carbs = 25, default_fat = 9, default_portion = COALESCE(default_portion, '2 unidades médias')
WHERE slug = 'panqueca-proteica' AND (default_calories IS NULL OR default_calories = 0);

UPDATE meal_visual_library SET default_calories = 240, default_protein = 12, default_carbs = 28, default_fat = 9, default_portion = COALESCE(default_portion, '1 porção')
WHERE slug = 'pao-com-queijo' AND (default_calories IS NULL OR default_calories = 0);

UPDATE meal_visual_library SET default_calories = 260, default_protein = 14, default_carbs = 32, default_fat = 8, default_portion = COALESCE(default_portion, '1 unidade')
WHERE slug = 'tapioca-com-ovo' AND (default_calories IS NULL OR default_calories = 0);

UPDATE meal_visual_library SET default_calories = 50, default_protein = 2, default_carbs = 9, default_fat = 1, default_portion = COALESCE(default_portion, '1 fatia (15g)')
WHERE slug = 'torrada-integral' AND (default_calories IS NULL OR default_calories = 0);

-- Ceia
UPDATE meal_visual_library SET default_calories = 100, default_protein = 1, default_carbs = 24, default_fat = 0, default_portion = COALESCE(default_portion, '1 unidade média')
WHERE slug = 'banana-com-canela' AND (default_calories IS NULL OR default_calories = 0);

UPDATE meal_visual_library SET default_calories = 110, default_protein = 24, default_carbs = 3, default_fat = 1, default_portion = COALESCE(default_portion, '1 scoop (30g)')
WHERE slug = 'caseina' AND (default_calories IS NULL OR default_calories = 0);

UPDATE meal_visual_library SET default_calories = 130, default_protein = 7, default_carbs = 10, default_fat = 7, default_portion = COALESCE(default_portion, '1 copo (200ml)')
WHERE slug = 'copo-de-leite-morno' AND (default_calories IS NULL OR default_calories = 0);

UPDATE meal_visual_library SET default_calories = 60, default_protein = 8, default_carbs = 7, default_fat = 0, default_portion = COALESCE(default_portion, '1 porção (120g)')
WHERE slug = 'gelatina' AND (default_calories IS NULL OR default_calories = 0);

-- Lanches/frutas
UPDATE meal_visual_library SET default_calories = 160, default_protein = 2, default_carbs = 9, default_fat = 15, default_portion = COALESCE(default_portion, '1/2 unidade (100g)')
WHERE slug = 'abacate' AND (default_calories IS NULL OR default_calories = 0);

UPDATE meal_visual_library SET default_calories = 50, default_protein = 1, default_carbs = 13, default_fat = 0, default_portion = COALESCE(default_portion, '1 fatia (100g)')
WHERE slug = 'abacaxi' AND (default_calories IS NULL OR default_calories = 0);

UPDATE meal_visual_library SET default_calories = 40, default_protein = 0, default_carbs = 9, default_fat = 0, default_portion = COALESCE(default_portion, '1 copo (200ml)')
WHERE slug = 'agua-de-coco' AND (default_calories IS NULL OR default_calories = 0);

UPDATE meal_visual_library SET default_calories = 200, default_protein = 5, default_carbs = 30, default_fat = 8, default_portion = COALESCE(default_portion, '1 porção')
WHERE slug = 'banana-com-pasta-de-amendoim' AND (default_calories IS NULL OR default_calories = 0);

UPDATE meal_visual_library SET default_calories = 180, default_protein = 3, default_carbs = 5, default_fat = 17, default_portion = COALESCE(default_portion, '1 unidade')
WHERE slug = 'fat-bomb' AND (default_calories IS NULL OR default_calories = 0);

UPDATE meal_visual_library SET default_calories = 60, default_protein = 1, default_carbs = 14, default_fat = 0, default_portion = COALESCE(default_portion, '1 xícara (100g)')
WHERE slug = 'frutas-vermelhas' AND (default_calories IS NULL OR default_calories = 0);

-- Genérico para QUALQUER restante baseado em categoria (last resort)
UPDATE meal_visual_library SET 
  default_calories = CASE 
    WHEN category = 'cafe_da_manha' THEN 200
    WHEN category = 'almoco' THEN 350
    WHEN category = 'jantar' THEN 300
    WHEN category = 'lanche' THEN 120
    WHEN category = 'ceia' THEN 100
    ELSE 150
  END,
  default_protein = CASE 
    WHEN category = 'cafe_da_manha' THEN 10
    WHEN category = 'almoco' THEN 25
    WHEN category = 'jantar' THEN 22
    WHEN category = 'lanche' THEN 4
    WHEN category = 'ceia' THEN 6
    ELSE 8
  END,
  default_carbs = CASE 
    WHEN category = 'cafe_da_manha' THEN 28
    WHEN category = 'almoco' THEN 35
    WHEN category = 'jantar' THEN 25
    WHEN category = 'lanche' THEN 18
    WHEN category = 'ceia' THEN 12
    ELSE 18
  END,
  default_fat = CASE 
    WHEN category = 'cafe_da_manha' THEN 6
    WHEN category = 'almoco' THEN 12
    WHEN category = 'jantar' THEN 10
    WHEN category = 'lanche' THEN 4
    WHEN category = 'ceia' THEN 3
    ELSE 5
  END,
  default_portion = COALESCE(default_portion, '1 porção')
WHERE is_active = true AND (default_calories IS NULL OR default_calories = 0);

-- ── 2. RPC reconcile_meal_plan_macros ───────────────────────────────
CREATE OR REPLACE FUNCTION public.reconcile_meal_plan_macros(p_plan_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan RECORD;
  v_caller_id uuid := auth.uid();
  v_is_admin boolean;
  v_updated int := 0;
  v_total_cal numeric := 0;
  v_total_prot numeric := 0;
  v_total_carbs numeric := 0;
  v_total_fat numeric := 0;
  v_num_days int;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

  SELECT * INTO v_plan FROM meal_plans WHERE id = p_plan_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'PLAN_NOT_FOUND';
  END IF;

  -- Permissão: dono ou admin
  SELECT EXISTS(SELECT 1 FROM user_roles WHERE user_id = v_caller_id AND role = 'admin') INTO v_is_admin;
  IF NOT v_is_admin AND v_plan.nutritionist_id IS DISTINCT FROM v_caller_id AND v_plan.patient_id IS DISTINCT FROM v_caller_id THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  -- Bloqueado em planos imutáveis
  IF v_plan.plan_status IN ('published','published_to_patient','archived') THEN
    RAISE EXCEPTION 'PLAN_IMMUTABLE: %', v_plan.plan_status;
  END IF;

  -- Reconcile: para cada item com macros NULL/zero e visual_library_item_id, copiar da biblioteca
  WITH updated AS (
    UPDATE meal_plan_items mpi
    SET 
      calories_target = COALESCE(NULLIF(mpi.calories_target, 0), vl.default_calories),
      protein_target = COALESCE(NULLIF(mpi.protein_target, 0), vl.default_protein),
      carbs_target = COALESCE(NULLIF(mpi.carbs_target, 0), vl.default_carbs),
      fat_target = COALESCE(NULLIF(mpi.fat_target, 0), vl.default_fat)
    FROM meal_visual_library vl
    WHERE mpi.meal_plan_id = p_plan_id
      AND mpi.visual_library_item_id = vl.id
      AND (mpi.calories_target IS NULL OR mpi.calories_target = 0)
      AND vl.default_calories IS NOT NULL AND vl.default_calories > 0
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_updated FROM updated;

  -- Recalcular totais
  SELECT COALESCE(SUM(calories_target),0), COALESCE(SUM(protein_target),0),
         COALESCE(SUM(carbs_target),0), COALESCE(SUM(fat_target),0),
         GREATEST(COUNT(DISTINCT day_of_week), 1)
    INTO v_total_cal, v_total_prot, v_total_carbs, v_total_fat, v_num_days
  FROM meal_plan_items WHERE meal_plan_id = p_plan_id;

  UPDATE meal_plans SET
    total_calories = v_total_cal,
    total_protein = v_total_prot,
    total_carbs = v_total_carbs,
    total_fat = v_total_fat,
    updated_at = now()
  WHERE id = p_plan_id;

  RETURN jsonb_build_object(
    'success', true,
    'items_reconciled', v_updated,
    'totals', jsonb_build_object(
      'calories', v_total_cal,
      'protein', v_total_prot,
      'carbs', v_total_carbs,
      'fat', v_total_fat,
      'days', v_num_days,
      'daily_calories', ROUND(v_total_cal / v_num_days)
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.reconcile_meal_plan_macros(uuid) TO authenticated;
