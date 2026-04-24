CREATE OR REPLACE FUNCTION public.resolve_patient_meal_plan(
    p_patient_id UUID,
    p_date DATE DEFAULT CURRENT_DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_plan RECORD;
    v_day_of_week INT;
    v_fallback_day INT;
BEGIN
    IF p_patient_id IS NULL THEN
        RETURN NULL;
    END IF;

    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'MEAL_PLAN_NOT_AUTHENTICATED' USING ERRCODE = '42501';
    END IF;

    IF auth.uid() <> p_patient_id
       AND NOT public.has_role(auth.uid(), 'admin'::public.app_role)
       AND NOT EXISTS (
           SELECT 1
           FROM public.nutritionist_patients np
           WHERE np.patient_id = p_patient_id
             AND np.nutritionist_id = auth.uid()
             AND np.status = 'active'
       ) THEN
        RAISE EXCEPTION 'MEAL_PLAN_ACCESS_DENIED' USING ERRCODE = '42501';
    END IF;

    v_day_of_week := EXTRACT(DOW FROM p_date);

    SELECT * INTO v_plan
    FROM public.meal_plans
    WHERE patient_id = p_patient_id
      AND plan_status = 'published_to_patient'
      AND is_active = true
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_plan.id IS NULL THEN
        RETURN NULL;
    END IF;

    SELECT MIN(i.day_of_week) INTO v_fallback_day
    FROM public.meal_plan_items i
    WHERE i.meal_plan_id = v_plan.id
      AND i.day_of_week IS NOT NULL;

    RETURN jsonb_build_object(
        'id', v_plan.id,
        'title', v_plan.title,
        'plan_mode', v_plan.plan_mode,
        'start_date', v_plan.start_date,
        'description', v_plan.description,
        'totals_status', v_plan.totals_status,
        'items', COALESCE(
            (
                SELECT jsonb_agg(i.* ORDER BY i.created_at, i.id)
                FROM public.meal_plan_items i
                WHERE i.meal_plan_id = v_plan.id
                  AND (
                      (v_plan.plan_mode = 'single_day') OR
                      ((v_plan.plan_mode = 'weekly' OR v_plan.plan_mode IS NULL) AND i.day_of_week = v_day_of_week)
                  )
            ),
            (
                SELECT jsonb_agg(i.* ORDER BY i.created_at, i.id)
                FROM public.meal_plan_items i
                WHERE i.meal_plan_id = v_plan.id
                  AND (v_plan.plan_mode = 'weekly' OR v_plan.plan_mode IS NULL)
                  AND v_fallback_day IS NOT NULL
                  AND i.day_of_week = v_fallback_day
            ),
            '[]'::jsonb
        )
    );
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_patient_meal_plan(UUID, DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_patient_meal_plan(UUID, DATE) TO authenticated;