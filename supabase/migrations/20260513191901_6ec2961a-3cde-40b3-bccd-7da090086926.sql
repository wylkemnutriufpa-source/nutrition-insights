CREATE OR REPLACE FUNCTION public.resolve_patient_meal_plan(p_patient_id uuid, p_date date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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

    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'MEAL_PLAN_NOT_AUTHENTICATED' USING ERRCODE = '42501';
    END IF;

    -- Access Control: Patient or linked Nutritionist or Admin
    IF auth.uid() <> v_canonical_id
       AND NOT public.has_role(auth.uid(), 'admin'::public.app_role)
       AND NOT EXISTS (
           SELECT 1
           FROM public.nutritionist_patients np
           WHERE (np.patient_id = v_canonical_id OR np.patient_id = p_patient_id)
             AND np.nutritionist_id = auth.uid()
             AND np.status = 'active'
       ) THEN
        RAISE EXCEPTION 'MEAL_PLAN_ACCESS_DENIED' USING ERRCODE = '42501';
    END IF;

    v_day_of_week := EXTRACT(DOW FROM p_date);

    -- Find the active plan
    SELECT * INTO v_plan
    FROM public.meal_plans
    WHERE (patient_id = v_canonical_id OR patient_id = p_patient_id)
      AND plan_status IN ('published', 'published_to_patient', 'approved')
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

    RETURN jsonb_build_object(
        'id', v_plan.id,
        'title', v_plan.title,
        'plan_mode', v_plan.plan_mode,
        'start_date', v_plan.start_date,
        'description', v_plan.description,
        'totals_status', v_plan.totals_status,
        'editor_version', v_plan.editor_version,
        'snapshot', v_plan.snapshot,
        'total_target_calories', v_plan.total_target_calories,
        'total_target_protein', v_plan.total_target_protein,
        'total_target_carbs', v_plan.total_target_carbs,
        'total_target_fat', v_plan.total_target_fat,
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
