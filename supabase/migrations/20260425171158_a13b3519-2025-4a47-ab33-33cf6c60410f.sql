-- Drop old function to avoid parameter default issues
DROP FUNCTION IF EXISTS public.resolve_patient_meal_plan(uuid, date);

-- Recreate resolve_patient_meal_plan to accept both statuses
CREATE OR REPLACE FUNCTION public.resolve_patient_meal_plan(p_patient_id uuid, p_date date DEFAULT CURRENT_DATE)
RETURNS jsonb AS $$
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

    -- Accept both 'published' and 'published_to_patient'
    SELECT * INTO v_plan
    FROM public.meal_plans
    WHERE patient_id = p_patient_id
      AND plan_status IN ('published', 'published_to_patient')
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
$$ LANGUAGE plpgsql;

-- Update activate_meal_plan to use published_to_patient
CREATE OR REPLACE FUNCTION public.activate_meal_plan(_plan_id uuid)
RETURNS void AS $$
DECLARE
    _patient_id uuid;
    _nutritionist_id uuid;
BEGIN
    -- Get owner info
    SELECT patient_id, nutritionist_id INTO _patient_id, _nutritionist_id
    FROM public.meal_plans
    WHERE id = _plan_id;

    -- Security Check
    IF auth.uid() != _nutritionist_id AND auth.uid() != _patient_id AND NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
        RAISE EXCEPTION 'Unauthorized: Only the assigned nutritionist or patient can activate a plan.';
    END IF;

    -- Atomic switch
    UPDATE public.meal_plans 
    SET is_active = false 
    WHERE patient_id = _patient_id AND id != _plan_id;

    UPDATE public.meal_plans 
    SET is_active = true, 
        plan_status = 'published_to_patient',
        updated_at = now()
    WHERE id = _plan_id;

    -- Update lifecycle state immediately
    INSERT INTO public.patient_lifecycle_states (patient_id, lifecycle_state)
    VALUES (_patient_id, 'active_followup')
    ON CONFLICT (patient_id) DO UPDATE SET 
        lifecycle_state = 'active_followup',
        updated_at = now();
END;
$$ LANGUAGE plpgsql;

-- Unify existing statuses
UPDATE public.meal_plans SET plan_status = 'published_to_patient' WHERE plan_status = 'published';
