CREATE OR REPLACE FUNCTION public.apply_quick_meal_template_atomic(
  p_meal_plan_id UUID,
  p_day_of_week INTEGER,
  p_items JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
  v_plan_status TEXT;
  v_item JSONB;
  v_item_index INTEGER := 0;
  v_meta_calorias NUMERIC;
  v_meta_proteinas NUMERIC;
  v_meta_carboidratos NUMERIC;
  v_meta_gorduras NUMERIC;
BEGIN
  -- Validate the operation target before any destructive write.
  IF p_meal_plan_id IS NULL THEN
    RAISE EXCEPTION 'INVALID_PLAN_ID: meal_plan_id is required';
  END IF;

  IF p_day_of_week IS NULL OR p_day_of_week < 0 OR p_day_of_week > 6 THEN
    RAISE EXCEPTION 'INVALID_DAY_OF_WEEK: day_of_week must be between 0 and 6';
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'INVALID_TEMPLATE_ITEMS: items payload must be a non-empty array';
  END IF;

  SELECT tenant_id, plan_status
    INTO v_tenant_id, v_plan_status
  FROM public.meal_plans
  WHERE id = p_meal_plan_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PLAN_NOT_FOUND: meal plan not found';
  END IF;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'INVALID_PLAN_TENANT: meal plan has no tenant_id';
  END IF;

  IF v_plan_status IN ('published_to_patient', 'approved') THEN
    RAISE EXCEPTION 'PLAN_LOCKED: cannot modify a published or approved meal plan';
  END IF;

  -- Validate every item before deleting old rows. Invalid payload must leave the day untouched.
  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items) AS payload(value)
  LOOP
    v_item_index := v_item_index + 1;

    IF jsonb_typeof(v_item) <> 'object' THEN
      RAISE EXCEPTION 'INVALID_TEMPLATE_ITEM: item % must be an object', v_item_index;
    END IF;

    IF NULLIF(BTRIM(v_item->>'title'), '') IS NULL THEN
      RAISE EXCEPTION 'INVALID_TEMPLATE_ITEM: item % requires title', v_item_index;
    END IF;

    IF NULLIF(BTRIM(v_item->>'tipo_refeicao'), '') IS NULL THEN
      RAISE EXCEPTION 'INVALID_TEMPLATE_ITEM: item % requires tipo_refeicao', v_item_index;
    END IF;

    IF NULLIF(BTRIM(v_item->>'id'), '') IS NOT NULL THEN
      BEGIN
        PERFORM (v_item->>'id')::UUID;
      EXCEPTION WHEN invalid_text_representation THEN
        RAISE EXCEPTION 'INVALID_TEMPLATE_ITEM: item % has invalid id UUID', v_item_index;
      END;
    END IF;

    IF NULLIF(BTRIM(v_item->>'substitution_group_id'), '') IS NOT NULL THEN
      BEGIN
        PERFORM (v_item->>'substitution_group_id')::UUID;
      EXCEPTION WHEN invalid_text_representation THEN
        RAISE EXCEPTION 'INVALID_TEMPLATE_ITEM: item % has invalid substitution_group_id UUID', v_item_index;
      END;
    END IF;

    IF v_item ? 'is_primary' AND v_item->>'is_primary' IS NOT NULL THEN
      BEGIN
        PERFORM (v_item->>'is_primary')::BOOLEAN;
      EXCEPTION WHEN invalid_text_representation THEN
        RAISE EXCEPTION 'INVALID_TEMPLATE_ITEM: item % has invalid is_primary boolean', v_item_index;
      END;
    END IF;

    BEGIN
      v_meta_calorias := (v_item->>'meta_calorias')::NUMERIC;
    EXCEPTION WHEN invalid_text_representation THEN
      RAISE EXCEPTION 'INVALID_TEMPLATE_ITEM: item % has invalid meta_calorias', v_item_index;
    END;

    BEGIN
      v_meta_proteinas := (v_item->>'meta_proteinas')::NUMERIC;
    EXCEPTION WHEN invalid_text_representation THEN
      RAISE EXCEPTION 'INVALID_TEMPLATE_ITEM: item % has invalid meta_proteinas', v_item_index;
    END;

    BEGIN
      v_meta_carboidratos := (v_item->>'meta_carboidratos')::NUMERIC;
    EXCEPTION WHEN invalid_text_representation THEN
      RAISE EXCEPTION 'INVALID_TEMPLATE_ITEM: item % has invalid meta_carboidratos', v_item_index;
    END;

    BEGIN
      v_meta_gorduras := (v_item->>'meta_gorduras')::NUMERIC;
    EXCEPTION WHEN invalid_text_representation THEN
      RAISE EXCEPTION 'INVALID_TEMPLATE_ITEM: item % has invalid meta_gorduras', v_item_index;
    END;

    IF v_meta_calorias IS NULL OR v_meta_calorias <= 0 THEN
      RAISE EXCEPTION 'INVALID_TEMPLATE_ITEM: item % requires meta_calorias > 0', v_item_index;
    END IF;

    IF v_meta_proteinas IS NULL OR v_meta_proteinas < 0 THEN
      RAISE EXCEPTION 'INVALID_TEMPLATE_ITEM: item % requires meta_proteinas >= 0', v_item_index;
    END IF;

    IF v_meta_carboidratos IS NULL OR v_meta_carboidratos < 0 THEN
      RAISE EXCEPTION 'INVALID_TEMPLATE_ITEM: item % requires meta_carboidratos >= 0', v_item_index;
    END IF;

    IF v_meta_gorduras IS NULL OR v_meta_gorduras < 0 THEN
      RAISE EXCEPTION 'INVALID_TEMPLATE_ITEM: item % requires meta_gorduras >= 0', v_item_index;
    END IF;
  END LOOP;

  DELETE FROM public.meal_plan_items
  WHERE meal_plan_id = p_meal_plan_id
    AND day_of_week = p_day_of_week;

  INSERT INTO public.meal_plan_items (
    id,
    meal_plan_id,
    day_of_week,
    tipo_refeicao,
    title,
    description,
    meta_calorias,
    meta_proteinas,
    meta_carboidratos,
    meta_gorduras,
    item_origin,
    is_primary,
    substitution_group_id,
    tenant_id
  )
  SELECT
    CASE
      WHEN NULLIF(BTRIM(item->>'id'), '') IS NULL THEN gen_random_uuid()
      ELSE (item->>'id')::UUID
    END,
    p_meal_plan_id,
    p_day_of_week,
    item->>'tipo_refeicao',
    item->>'title',
    item->>'description',
    (item->>'meta_calorias')::NUMERIC,
    (item->>'meta_proteinas')::NUMERIC,
    (item->>'meta_carboidratos')::NUMERIC,
    (item->>'meta_gorduras')::NUMERIC,
    COALESCE(NULLIF(BTRIM(item->>'item_origin'), ''), 'in_office_template'),
    COALESCE((item->>'is_primary')::BOOLEAN, true),
    CASE
      WHEN NULLIF(BTRIM(item->>'substitution_group_id'), '') IS NULL THEN NULL
      ELSE (item->>'substitution_group_id')::UUID
    END,
    v_tenant_id
  FROM jsonb_array_elements(p_items) AS payload(item);
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_quick_meal_template_atomic(UUID, INTEGER, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.apply_quick_meal_template_atomic(UUID, INTEGER, JSONB) TO service_role;
