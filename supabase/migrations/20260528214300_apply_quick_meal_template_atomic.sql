-- Apply Quick Meal Template Atomic
-- Purpose: Atomically replace a day's meal items with template items
-- Follows sovereign architecture: validation before execution, immutable results

CREATE OR REPLACE FUNCTION public.apply_quick_meal_template_atomic(
    p_meal_plan_id UUID,
    p_day_of_week INT,
    p_items JSONB,
    p_tenant_id UUID,
    p_nutritionist_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_item_count INT;
  v_plan_status TEXT;
  v_plan_tenant_id UUID;
  v_published_to_patient BOOLEAN;
  v_approved BOOLEAN;
BEGIN
  -- ═══════════════════════════════════════════════════════════════════════════
  -- STEP 1: Validate p_items array structure and content
  -- ═══════════════════════════════════════════════════════════════════════════
  
  IF p_items IS NULL THEN
    RAISE EXCEPTION 'INVALID_INPUT: p_items cannot be null';
  END IF;

  v_item_count := jsonb_array_length(p_items);
  IF v_item_count = 0 THEN
    RAISE EXCEPTION 'INVALID_INPUT: p_items array is empty';
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- STEP 2: Validate each item in array
  -- ═══════════════════════════════════════════════════════════════════════════

  -- Iterate and validate mandatory fields
  FOR i IN 0..(v_item_count - 1)
  LOOP
    -- Check tipo_refeicao is valid enum
    IF NOT (p_items->i->>'tipo_refeicao' IN (
      'breakfast', 'morning_snack', 'lunch', 'afternoon_snack', 'dinner', 'evening_snack'
    )) THEN
      RAISE EXCEPTION 'INVALID_ITEM_%: tipo_refeicao must be valid enum value', i;
    END IF;

    -- Check title is not empty
    IF p_items->i->>'title' IS NULL OR p_items->i->>'title' = '' THEN
      RAISE EXCEPTION 'INVALID_ITEM_%: title cannot be empty', i;
    END IF;

    -- Check protein macro is not null (critical for clinical safety)
    IF p_items->i->>'meta_proteinas' IS NULL THEN
      RAISE EXCEPTION 'INVALID_ITEM_%: meta_proteinas cannot be null', i;
    END IF;

    -- Check calories macro is not null
    IF p_items->i->>'meta_calorias' IS NULL THEN
      RAISE EXCEPTION 'INVALID_ITEM_%: meta_calorias cannot be null', i;
    END IF;

    -- Check id is valid UUID if provided
    IF p_items->i->>'id' IS NOT NULL AND 
       NOT (p_items->i->>'id' ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$') THEN
      RAISE EXCEPTION 'INVALID_ITEM_%: id must be valid UUID', i;
    END IF;
  END LOOP;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- STEP 3: Validate meal_plan exists and fetch its state
  -- ═══════════════════════════════════════════════════════════════════════════

  SELECT 
    plan_status, 
    tenant_id,
    (plan_status = 'published_to_patient') AS is_published,
    (plan_status = 'approved') AS is_approved
  INTO 
    v_plan_status,
    v_plan_tenant_id,
    v_published_to_patient,
    v_approved
  FROM public.meal_plans
  WHERE id = p_meal_plan_id;

  IF v_plan_status IS NULL THEN
    RAISE EXCEPTION 'PLAN_NOT_FOUND: meal_plan_id % does not exist', p_meal_plan_id;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- STEP 4: Validate tenant ownership (security boundary)
  -- ═══════════════════════════════════════════════════════════════════════════

  IF v_plan_tenant_id != p_tenant_id THEN
    RAISE EXCEPTION 'TENANT_MISMATCH: plan does not belong to tenant %', p_tenant_id;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- STEP 5: Block modifications to published or approved plans
  -- Sovereign architecture: once published/approved, only new versions allowed
  -- ═══════════════════════════════════════════════════════════════════════════

  IF v_published_to_patient OR v_approved THEN
    RAISE EXCEPTION 'PLAN_LOCKED: cannot modify % plans (status: %)', 
      CASE WHEN v_approved THEN 'approved' ELSE 'published' END, v_plan_status;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- STEP 6: Atomically delete existing items for this day and insert new ones
  -- Transaction ensures all-or-nothing: if INSERT fails, DELETE is rolled back
  -- ═══════════════════════════════════════════════════════════════════════════

  -- Delete existing items for this day
  DELETE FROM public.meal_plan_items
  WHERE meal_plan_id = p_meal_plan_id
    AND day_of_week = p_day_of_week;

  -- Insert new items from template
  INSERT INTO public.meal_plan_items (
    id,
    meal_plan_id,
    tenant_id,
    tipo_refeicao,
    day_of_week,
    title,
    description,
    meta_calorias,
    meta_proteinas,
    meta_carboidratos,
    meta_gorduras,
    image_url,
    is_primary,
    substitution_group_id,
    item_origin,
    created_at,
    updated_at
  )
  SELECT 
    COALESCE(
      (item->>'id')::UUID,
      gen_random_uuid()
    ),
    p_meal_plan_id,
    p_tenant_id,
    (item->>'tipo_refeicao')::TEXT,
    p_day_of_week,
    (item->>'title')::TEXT,
    (item->>'description')::TEXT,
    (item->>'meta_calorias')::INT,
    (item->>'meta_proteinas')::INT,
    (item->>'meta_carboidratos')::INT,
    (item->>'meta_gorduras')::INT,
    (item->>'image_url')::TEXT,
    COALESCE((item->>'is_primary')::BOOLEAN, true),
    NULLIF((item->>'substitution_group_id')::TEXT, '')::UUID,
    'in_office_template',
    NOW(),
    NOW()
  FROM jsonb_array_elements(p_items) AS item;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- STEP 7: Return success result
  -- ═══════════════════════════════════════════════════════════════════════════

  RETURN jsonb_build_object(
    'ok', true,
    'plan_id', p_meal_plan_id,
    'day_of_week', p_day_of_week,
    'items_inserted', v_item_count,
    'timestamp', NOW()
  );

EXCEPTION WHEN OTHERS THEN
  -- Return error in structured format for frontend error handling
  RETURN jsonb_build_object(
    'ok', false,
    'error', SQLERRM,
    'error_code', SQLSTATE
  );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.apply_quick_meal_template_atomic(UUID, INT, JSONB, UUID, UUID) 
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.apply_quick_meal_template_atomic(UUID, INT, JSONB, UUID, UUID) 
  TO service_role;
