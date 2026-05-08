CREATE OR REPLACE FUNCTION public.resolve_patient_lifecycle_state(_patient_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
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
      _editor_version text;
      _total_kcal float;
      _total_protein float;
      _total_carbs float;
      _total_fat float;
      _meals jsonb;
      _day_of_week int;
      _fallback_day int;
      _journey_status text;
      _release_status text;
      _pipeline_status text;
      _anamnesis_completed boolean;
      _has_active_unblock boolean := false;
  BEGIN
      -- 1. Identify active plan with all necessary fields
      SELECT 
          id, title, start_date, plan_mode, description, totals_status, 
          editor_version, total_target_calories, total_target_protein, 
          total_target_carbs, total_target_fat
        INTO 
          _plan_id, _plan_title, _plan_start_date, _plan_mode, _plan_description, _totals_status,
          _editor_version, _total_kcal, _total_protein, _total_carbs, _total_fat
        FROM public.meal_plans
       WHERE patient_id = _patient_id
         AND is_active = true
         AND plan_status IN ('published_to_patient', 'published', 'approved', 'active')
       ORDER BY created_at DESC
       LIMIT 1;

      _has_active_plan := _plan_id IS NOT NULL;
      -- Use UTC current day of week (0=Sunday, 1=Monday, ..., 5=Friday, 6=Saturday)
      _day_of_week := EXTRACT(DOW FROM now());

      -- 2. Fetch meals with improved fallback logic (include day_of_week NULL as "everyday")
      IF _has_active_plan THEN
          -- Try current day OR NULL (meaning everyday)
          SELECT jsonb_agg(
              jsonb_set(
                  to_jsonb(i.*),
                  '{time}',
                  to_jsonb(CASE 
                      WHEN i.meal_type::text = 'breakfast' THEN '08:00'
                      WHEN i.meal_type::text = 'morning_snack' THEN '10:30'
                      WHEN i.meal_type::text = 'lunch' THEN '13:00'
                      WHEN i.meal_type::text = 'afternoon_snack' THEN '16:00'
                      WHEN i.meal_type::text = 'dinner' THEN '20:00'
                      WHEN i.meal_type::text = 'evening_snack' THEN '22:00'
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
                              WHEN i.meal_type::text = 'breakfast' THEN '08:00'
                              WHEN i.meal_type::text = 'morning_snack' THEN '10:30'
                              WHEN i.meal_type::text = 'lunch' THEN '13:00'
                              WHEN i.meal_type::text = 'afternoon_snack' THEN '16:00'
                              WHEN i.meal_type::text = 'dinner' THEN '20:00'
                              WHEN i.meal_type::text = 'evening_snack' THEN '22:00'
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
                  'editor_version', _editor_version,
                  'total_calories', COALESCE(_total_kcal, 0),
                  'total_protein', COALESCE(_total_protein, 0),
                  'total_carbs', COALESCE(_total_carbs, 0),
                  'total_fat', COALESCE(_total_fat, 0),
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
