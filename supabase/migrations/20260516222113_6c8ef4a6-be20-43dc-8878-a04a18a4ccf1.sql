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
       _plan_obj jsonb;
   BEGIN
       -- 1. Identify active plan with all necessary fields
       SELECT 
           id, title, start_date, plan_mode, description, totals_status, 
           editor_version, total_meta_calorias, total_meta_proteinas, 
           total_meta_carboidratos, total_meta_gorduras,
           jsonb_build_object(
             'id', id,
             'title', title,
             'plan_mode', plan_mode,
             'start_date', start_date,
             'total_meta_calorias', total_meta_calorias,
             'total_meta_proteinas', total_meta_proteinas,
             'total_meta_carboidratos', total_meta_carboidratos,
             'total_meta_gorduras', total_meta_gorduras
           )
         INTO 
           _plan_id, _plan_title, _plan_start_date, _plan_mode, _plan_description, _totals_status,
           _editor_version, _total_kcal, _total_protein, _total_carbs, _total_fat, _plan_obj
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
                       WHEN i.tipo_refeicao::text = 'Café da Manhã' THEN '08:00'
                       WHEN i.tipo_refeicao::text = 'Lanche da Manhã' THEN '10:30'
                       WHEN i.tipo_refeicao::text = 'Almoço' THEN '13:00'
                       WHEN i.tipo_refeicao::text = 'Lanche da Tarde' THEN '16:00'
                       WHEN i.tipo_refeicao::text = 'Jantar' THEN '20:00'
                       WHEN i.tipo_refeicao::text = 'Ceia' THEN '22:00'
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
                               WHEN i.tipo_refeicao::text = 'Café da Manhã' THEN '08:00'
                               WHEN i.tipo_refeicao::text = 'Lanche da Manhã' THEN '10:30'
                               WHEN i.tipo_refeicao::text = 'Almoço' THEN '13:00'
                               WHEN i.tipo_refeicao::text = 'Lanche da Tarde' THEN '16:00'
                               WHEN i.tipo_refeicao::text = 'Jantar' THEN '20:00'
                               WHEN i.tipo_refeicao::text = 'Ceia' THEN '22:00'
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

       -- 3. Check vínculo e pipeline (Fixed table name to onboarding_pipelines)
       SELECT np.journey_status, op.status as pipeline_status, op.anamnesis_completed
         INTO _journey_status, _pipeline_status, _anamnesis_completed
         FROM public.nutritionist_patients np
         LEFT JOIN public.onboarding_pipelines op ON op.patient_id = np.patient_id
        WHERE np.patient_id = _patient_id
        LIMIT 1;

       -- 4. Check unblock override
       SELECT EXISTS(
           SELECT 1 FROM public.professional_unblock_overrides
           WHERE patient_id = _patient_id AND expires_at > now()
       ) INTO _has_active_unblock;

       -- 5. Logic for state and blocking
       _is_onboarding_blocked := (_anamnesis_completed IS NOT TRUE) AND (_has_active_unblock IS NOT TRUE);

       IF _has_active_plan THEN
           _state := 'active_followup';
       ELSIF _pipeline_status = 'pending' THEN
           _state := 'plan_pending_production';
       ELSIF _anamnesis_completed IS TRUE THEN
           _state := 'onboarding_ready_for_plan';
       ELSE
           _state := 'onboarding_started';
       END IF;

       RETURN jsonb_build_object(
           'state', _state,
           'is_blocked', _is_onboarding_blocked,
           'has_active_plan', _has_active_plan,
           'plan_id', _plan_id,
           'plan_title', _plan_title,
           'plan_start_date', _plan_start_date,
           'plan_mode', _plan_mode,
           'totals_status', _totals_status,
           'editor_version', _editor_version,
           'target_calories', _total_kcal,
           'target_protein', _total_protein,
           'target_carbs', _total_carbs,
           'target_fat', _total_fat,
           'meals', _meals,
           'plan', _plan_obj
       );
   END;
   $function$