-- 1. Fix the publish_meal_plan RPC to also update profiles
CREATE OR REPLACE FUNCTION public.publish_meal_plan(_plan_id uuid, _nutritionist_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _plan record;
  _patient_id uuid;
  _tenant_id uuid;
  _item_count integer;
BEGIN
  SELECT id, patient_id, plan_status, is_active, nutritionist_id, overall_validation_status
  INTO _plan
  FROM public.meal_plans
  WHERE id = _plan_id;

  IF _plan IS NULL THEN
    RAISE EXCEPTION 'PLAN_NOT_FOUND: Meal plan does not exist';
  END IF;

  IF _plan.nutritionist_id != _nutritionist_id THEN
    RAISE EXCEPTION 'UNAUTHORIZED: You do not own this plan';
  END IF;

  SELECT count(*) INTO _item_count
  FROM public.meal_plan_items
  WHERE meal_plan_id = _plan_id;

  IF _item_count = 0 THEN
     INSERT INTO public.system_error_logs (error_code, error_message, metadata)
     VALUES ('EMPTY_PLAN_PUBLISH', 'Attempted to publish empty plan', jsonb_build_object('plan_id', _plan_id));
  END IF;

  _patient_id := _plan.patient_id;

  SELECT COALESCE(np.tenant_id, ut.tenant_id)
  INTO _tenant_id
  FROM public.nutritionist_patients np
  LEFT JOIN public.user_tenants ut ON ut.user_id = np.nutritionist_id
  WHERE np.patient_id = _patient_id
    AND np.nutritionist_id = _nutritionist_id
    AND np.status = 'active'
  LIMIT 1;

  -- Archive previous active published plans
  UPDATE public.meal_plans
  SET is_active = false,
      plan_status = 'archived',
      updated_at = now()
  WHERE patient_id = _patient_id
    AND is_active = true
    AND plan_status IN ('published', 'published_to_patient')
    AND id != _plan_id;

  -- Deactivate any other active plans
  UPDATE public.meal_plans
  SET is_active = false,
      updated_at = now()
  WHERE patient_id = _patient_id
    AND is_active = true
    AND plan_status NOT IN ('published', 'published_to_patient')
    AND id != _plan_id;

  -- Publish the plan
  UPDATE public.meal_plans
  SET plan_status = 'published_to_patient',
      is_active = true,
      overall_validation_status = 'aprovado',
      updated_at = now()
  WHERE id = _plan_id;

  -- CRITICAL FIX: Mark onboarding as completed in profiles to prevent redirects to /onboarding
  UPDATE public.profiles
  SET onboarding_completed = true,
      patient_state = 'active_plan',
      updated_at = now()
  WHERE user_id = _patient_id;

  -- Force lifecycle recalc
  UPDATE public.patient_lifecycle_states
  SET computed_at = '2000-01-01'::timestamptz
  WHERE patient_id = _patient_id;

  -- Update journey status
  UPDATE public.nutritionist_patients
  SET journey_status = 'plan_published'
  WHERE patient_id = _patient_id
    AND nutritionist_id = _nutritionist_id
    AND status = 'active';

  -- Timeline entry
  INSERT INTO public.patient_timeline (patient_id, created_by, event_type, title, description)
  VALUES (_patient_id, _nutritionist_id, 'meal_plan', 'Plano publicado', 'Plano alimentar publicado para o paciente.');

  -- Notify patient
  IF _tenant_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, type, entity_type, entity_id, target_route, tenant_id)
    VALUES (
      _patient_id,
      'Novo plano alimentar',
      'Seu plano alimentar foi atualizado pelo seu profissional.',
      'plan_published',
      'meal_plan',
      _plan_id::text,
      '/patient-meal-plan',
      _tenant_id
    );
  END IF;

  RETURN jsonb_build_object('success', true, 'plan_id', _plan_id, 'patient_id', _patient_id);
END;
$function$;

-- 2. Improve resolve_patient_lifecycle_state RPC fallback and DOW logic
CREATE OR REPLACE FUNCTION public.resolve_patient_lifecycle_state(_patient_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  DECLARE
      _state text;
      _is_onboarding_blocked boolean := false;
      _has_active_plan boolean := false;
      _plan_id uuid;
      _plan_title text;
      _plan_start_date date;
      _plan_mode text;
      _plan_description text;
      _totals_status text;
      _meals jsonb;
      _day_of_week int;
      _fallback_day int;
      _journey_status text;
      _release_status text;
      _pipeline_status text;
      _anamnesis_completed boolean;
      _has_active_unblock boolean := false;
  BEGIN
      -- 1. Identify active plan
      SELECT id, title, start_date, plan_mode, description, totals_status
        INTO _plan_id, _plan_title, _plan_start_date, _plan_mode, _plan_description, _totals_status
        FROM public.meal_plans
       WHERE patient_id = _patient_id
         AND is_active = true
         AND plan_status IN ('published_to_patient', 'published', 'approved')
       ORDER BY created_at DESC
       LIMIT 1;

      _has_active_plan := _plan_id IS NOT NULL;
      -- Use UTC current day of week
      _day_of_week := EXTRACT(DOW FROM now());

      -- 2. Fetch meals with improved fallback logic (include day_of_week NULL as "everyday")
      IF _has_active_plan THEN
          -- Try current day OR NULL (meaning everyday)
          SELECT jsonb_agg(
              jsonb_set(
                  to_jsonb(i.*),
                  '{time}',
                  to_jsonb(CASE 
                      WHEN i.meal_type = 'breakfast' THEN '08:00'
                      WHEN i.meal_type = 'morning_snack' THEN '10:30'
                      WHEN i.meal_type = 'lunch' THEN '13:00'
                      WHEN i.meal_type = 'afternoon_snack' THEN '16:00'
                      WHEN i.meal_type = 'dinner' THEN '20:00'
                      WHEN i.meal_type = 'evening_snack' THEN '22:00'
                      ELSE '--:--'
                  END)
              ) ORDER BY i.created_at, i.id
          ) INTO _meals
            FROM public.meal_plan_items i
           WHERE i.meal_plan_id = _plan_id
             AND (
                 (_plan_mode = 'single_day') OR
                 ((_plan_mode = 'weekly' OR _plan_mode IS NULL) AND (i.day_of_week = _day_of_week OR i.day_of_week IS NULL))
             );

          -- Fallback if still empty: try to find ANY day with items
          IF _meals IS NULL OR _meals = '[]'::jsonb THEN
              SELECT MIN(day_of_week) INTO _fallback_day
                FROM public.meal_plan_items
               WHERE meal_plan_id = _plan_id AND day_of_week IS NOT NULL;

              IF _fallback_day IS NOT NULL THEN
                  SELECT jsonb_agg(
                      jsonb_set(
                          to_jsonb(i.*),
                          '{time}',
                          to_jsonb(CASE 
                              WHEN i.meal_type = 'breakfast' THEN '08:00'
                              WHEN i.meal_type = 'morning_snack' THEN '10:30'
                              WHEN i.meal_type = 'lunch' THEN '13:00'
                              WHEN i.meal_type = 'afternoon_snack' THEN '16:00'
                              WHEN i.meal_type = 'dinner' THEN '20:00'
                              WHEN i.meal_type = 'evening_snack' THEN '22:00'
                              ELSE '--:--'
                          END)
                      ) ORDER BY i.created_at, i.id
                  ) INTO _meals
                    FROM public.meal_plan_items i
                   WHERE i.meal_plan_id = _plan_id
                     AND (i.day_of_week = _fallback_day OR i.day_of_week IS NULL);
              END IF;
          END IF;
      END IF;

      -- 3. Check vínculo e pipeline
      SELECT np.journey_status, op.release_status, op.status as pipeline_status, op.anamnesis_completed
        INTO _journey_status, _release_status, _pipeline_status, _anamnesis_completed
        FROM public.nutritionist_patients np
        LEFT JOIN public.onboarding_pipelines op ON op.patient_id = np.patient_id
       WHERE np.patient_id = _patient_id
       ORDER BY np.created_at DESC
       LIMIT 1;

      -- 4. Check override de desbloqueio manual
      SELECT EXISTS (
          SELECT 1 FROM public.professional_unblock_overrides
          WHERE patient_id = _patient_id AND revoked_at IS NULL AND expires_at > now()
      ) INTO _has_active_unblock;

      -- 5. RESOLVE STATE & BLOCKING
      _is_onboarding_blocked := true;
      IF _has_active_plan OR _has_active_unblock OR _release_status = 'released' THEN
          _is_onboarding_blocked := false;
      END IF;
      
      IF _journey_status IN ('onboarding_active', 'awaiting_consent', 'onboarding_completed') THEN
          _is_onboarding_blocked := false;
      END IF;

      IF _has_active_plan THEN
          _state := 'active_followup';
      ELSIF _journey_status = 'onboarding_active' THEN
          _state := 'onboarding';
      ELSIF _journey_status = 'awaiting_payment' THEN
          _state := 'awaiting_payment';
      ELSIF _journey_status = 'awaiting_onboarding_release' THEN
          _state := 'awaiting_release';
      ELSE
          _state := COALESCE(_journey_status, 'new');
      END IF;

      RETURN jsonb_build_object(
          'state', _state,
          'lifecycle_state', _state,
          'is_onboarding_blocked', _is_onboarding_blocked,
          'has_active_plan', _has_active_plan,
          'has_published_plan', _has_active_plan,
          'plan_id', _plan_id,
          'plan_title', _plan_title,
          'plan', CASE WHEN _plan_id IS NOT NULL THEN
              jsonb_build_object(
                  'id', _plan_id,
                  'title', _plan_title,
                  'start_date', _plan_start_date,
                  'plan_mode', _plan_mode,
                  'description', _plan_description,
                  'totals_status', _totals_status,
                  'meals', COALESCE(_meals, '[]'::jsonb)
              )
          ELSE NULL END,
          'journey_status', _journey_status,
          'release_status', _release_status,
          'has_pending_onboarding', (_pipeline_status IS NOT NULL AND _pipeline_status NOT IN ('completed', 'superseded_by_published_plan')),
          'anamnesis_completed', COALESCE(_anamnesis_completed, false),
          'show_onboarding', (_journey_status IN ('onboarding_active', 'awaiting_consent') AND NOT COALESCE(_anamnesis_completed, false)),
          'show_plan', _has_active_plan
      );
  END;
$function$;

-- 3. Improve resolve_patient_meal_plan RPC
CREATE OR REPLACE FUNCTION public.resolve_patient_meal_plan(p_patient_id uuid, p_date date DEFAULT CURRENT_DATE)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

    -- Accept both 'published' and 'published_to_patient' and 'approved'
    SELECT * INTO v_plan
    FROM public.meal_plans
    WHERE patient_id = p_patient_id
      AND plan_status IN ('published', 'published_to_patient', 'approved')
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

-- 4. Data Sync Fix: Move patients with plans out of onboarding slides
UPDATE public.profiles
SET onboarding_completed = true,
    patient_state = 'active_plan',
    updated_at = now()
WHERE user_id IN (
    SELECT DISTINCT patient_id 
    FROM public.meal_plans 
    WHERE is_active = true AND plan_status IN ('published', 'published_to_patient')
)
AND (onboarding_completed IS FALSE OR onboarding_completed IS NULL OR patient_state = 'onboarding_slides');
