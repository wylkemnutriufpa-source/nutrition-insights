
-- ═══════════════════════════════════════════════════════
-- FITJOURNEY — HARDENING FASE 2: Warnings residuais
-- ═══════════════════════════════════════════════════════

-- ╔═══════════════════════════════════════════════════════╗
-- ║ FIX: 4 funções notify_* sem search_path              ║
-- ╚═══════════════════════════════════════════════════════╝

-- notify_anamnesis_submitted
CREATE OR REPLACE FUNCTION public.notify_anamnesis_submitted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM pg_notify('anamnesis_submitted', json_build_object('patient_id', NEW.user_id, 'anamnesis_id', NEW.id)::text);
  RETURN NEW;
END;
$$;

-- notify_checkin_photo_uploaded
CREATE OR REPLACE FUNCTION public.notify_checkin_photo_uploaded()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM pg_notify('checkin_photo_uploaded', json_build_object('patient_id', NEW.patient_id, 'checkin_id', NEW.id)::text);
  RETURN NEW;
END;
$$;

-- notify_feedback_submitted
CREATE OR REPLACE FUNCTION public.notify_feedback_submitted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM pg_notify('feedback_submitted', json_build_object('patient_id', NEW.patient_id, 'feedback_id', NEW.id)::text);
  RETURN NEW;
END;
$$;

-- notify_onboarding_completed
CREATE OR REPLACE FUNCTION public.notify_onboarding_completed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM pg_notify('onboarding_completed', json_build_object('patient_id', NEW.patient_id, 'pipeline_id', NEW.id)::text);
  RETURN NEW;
END;
$$;

-- ╔═══════════════════════════════════════════════════════╗
-- ║ FIX: 2 tabelas com WITH CHECK(true) residual         ║
-- ║ meal_analysis_cache + pipeline_execution_logs         ║
-- ╚═══════════════════════════════════════════════════════╝

-- meal_analysis_cache: cache interno, admin-only write
DROP POLICY IF EXISTS "Service insert meal_analysis_cache" ON public.meal_analysis_cache;
DROP POLICY IF EXISTS "Service update meal_analysis_cache" ON public.meal_analysis_cache;

CREATE POLICY "admin_insert_meal_analysis_cache"
ON public.meal_analysis_cache FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin_update_meal_analysis_cache"
ON public.meal_analysis_cache FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- pipeline_execution_logs: logs internos, admin-only
DROP POLICY IF EXISTS "Service can insert pipeline logs" ON public.pipeline_execution_logs;

CREATE POLICY "admin_insert_pipeline_execution_logs"
ON public.pipeline_execution_logs FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- workout_exercise_substitutions: sistema, admin-only
DROP POLICY IF EXISTS "System can insert substitutions" ON public.workout_exercise_substitutions;

CREATE POLICY "admin_insert_workout_substitutions"
ON public.workout_exercise_substitutions FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));
