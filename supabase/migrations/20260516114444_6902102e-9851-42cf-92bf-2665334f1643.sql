CREATE OR REPLACE FUNCTION public.resolve_patient_meal_plan(p_patient_id uuid, p_date date)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_plan RECORD;
    v_day_of_week INT;
    v_fallback_day INT;
    v_canonical_id uuid;
BEGIN
    IF p_patient_id IS NULL THEN
        RETURN NULL;
    END IF;

    -- Resolve ID to user_id (canonical ID used in meal_plans)
    SELECT user_id INTO v_canonical_id
    FROM public.profiles
    WHERE id = p_patient_id OR user_id = p_patient_id
    LIMIT 1;

    IF v_canonical_id IS NULL THEN
        v_canonical_id := p_patient_id;
    END IF;

    -- Find the active plan
    SELECT * INTO v_plan
    FROM public.meal_plans
    WHERE (patient_id = v_canonical_id OR patient_id = p_patient_id)
      AND plan_status IN ('published', 'published_to_patient', 'approved', 'active')
      AND is_active = true
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_plan.id IS NULL THEN
        RETURN NULL;
    END IF;

    -- Find fallback day only if it's a weekly plan
    IF v_plan.plan_mode = 'weekly' OR v_plan.plan_mode IS NULL THEN
        SELECT MIN(i.day_of_week) INTO v_fallback_day
        FROM public.meal_plan_items i
        WHERE i.meal_plan_id = v_plan.id
          AND i.day_of_week IS NOT NULL;
    END IF;

    v_day_of_week := EXTRACT(DOW FROM p_date);

    RETURN jsonb_build_object(
        'id', v_plan.id,
        'title', v_plan.title,
        'plan_mode', v_plan.plan_mode,
        'start_date', v_plan.start_date,
        'description', v_plan.description,
        'totals_status', v_plan.totals_status,
        'editor_version', v_plan.editor_version,
        'snapshot', v_plan.snapshot,
        'total_meta_calorias', v_plan.total_meta_calorias,
        'total_meta_proteinas', v_plan.total_meta_proteinas,
        'total_meta_carboidratos', v_plan.total_meta_carboidratos,
        'total_meta_gorduras', v_plan.total_meta_gorduras,
        'items', COALESCE(
            (
                SELECT jsonb_agg(i.* ORDER BY i.created_at, i.id)
                FROM public.meal_plan_items i
                WHERE i.meal_plan_id = v_plan.id
                  AND (
                      (v_plan.plan_mode = 'single_day') OR
                      ((v_plan.plan_mode = 'weekly' OR v_plan.plan_mode IS NULL) AND (i.day_of_week = v_day_of_week OR i.day_of_week IS NULL))
                  )
            ),
            (
                SELECT jsonb_agg(i.* ORDER BY i.created_at, i.id)
                FROM public.meal_plan_items i
                WHERE i.meal_plan_id = v_plan.id
                  AND (v_plan.plan_mode = 'weekly' OR v_plan.plan_mode IS NULL)
                  AND v_fallback_day IS NOT NULL
                  AND (i.day_of_week = v_fallback_day OR i.day_of_week IS NULL)
            ),
            '[]'::jsonb
        )
    );
END;
$function$;