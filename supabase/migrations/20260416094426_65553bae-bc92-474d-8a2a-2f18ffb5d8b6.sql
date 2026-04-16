
-- 1. Fix 15 patients with journey_status='active' but incomplete pipelines
UPDATE public.nutritionist_patients np
SET journey_status = 'onboarding_active'
WHERE np.status = 'active'
  AND np.journey_status = 'active'
  AND EXISTS (
    SELECT 1 FROM public.onboarding_pipelines op
    WHERE op.patient_id = np.patient_id
    AND op.status NOT IN ('completed','archived','superseded_by_active_plan','superseded_by_published_plan','superseded_by_reset','rejected')
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.meal_plans mp
    WHERE mp.patient_id = np.patient_id
    AND mp.is_active = true
  );

-- 2. Recreate sync trigger function (now also handles pending_approval)
CREATE OR REPLACE FUNCTION public.fn_sync_journey_from_pipeline()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IN ('pending_anamnesis', 'pending_body_data', 'pending_preferences', 'in_progress', 'pending_plan_generation', 'pending_approval') THEN
    UPDATE public.nutritionist_patients
    SET journey_status = 'onboarding_active'
    WHERE patient_id = NEW.patient_id
      AND status = 'active'
      AND journey_status NOT IN ('onboarding_active', 'plan_published', 'active_followup', 'clinical_followup_active');
  END IF;

  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    UPDATE public.nutritionist_patients
    SET journey_status = 'onboarding_completed'
    WHERE patient_id = NEW.patient_id
      AND status = 'active'
      AND journey_status = 'onboarding_active';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_journey_from_pipeline ON public.onboarding_pipelines;
CREATE TRIGGER trg_sync_journey_from_pipeline
  AFTER INSERT OR UPDATE ON public.onboarding_pipelines
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_sync_journey_from_pipeline();

-- 3. Tighten analytics tables RLS
DROP POLICY IF EXISTS "Authenticated can read nutrition search index" ON public.nutrition_search_index;
CREATE POLICY "Professionals read nutrition search index"
  ON public.nutrition_search_index FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'nutritionist'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
  );

DROP POLICY IF EXISTS "Authenticated can read clinical population patterns" ON public.clinical_population_patterns;
CREATE POLICY "Professionals read clinical population patterns"
  ON public.clinical_population_patterns FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'nutritionist'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
  );

DROP POLICY IF EXISTS "Authenticated can read population nutrition cohorts" ON public.population_nutrition_cohorts;
CREATE POLICY "Professionals read population nutrition cohorts"
  ON public.population_nutrition_cohorts FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'nutritionist'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
  );

DROP POLICY IF EXISTS "Authenticated can read population nutrition metrics" ON public.population_nutrition_metrics;
CREATE POLICY "Professionals read population nutrition metrics"
  ON public.population_nutrition_metrics FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'nutritionist'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
  );

DROP POLICY IF EXISTS "Authenticated can read protocol population success matrix" ON public.protocol_population_success_matrix;
CREATE POLICY "Professionals read protocol success matrix"
  ON public.protocol_population_success_matrix FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'nutritionist'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
  );

DROP POLICY IF EXISTS "Authenticated can read cluster protocol matrix" ON public.cluster_protocol_matrix;
CREATE POLICY "Professionals read cluster protocol matrix"
  ON public.cluster_protocol_matrix FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'nutritionist'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
  );

DROP POLICY IF EXISTS "Authenticated can read population response patterns" ON public.population_response_patterns;
CREATE POLICY "Professionals read population response patterns"
  ON public.population_response_patterns FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'nutritionist'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
  );

DROP POLICY IF EXISTS "Nutritionists can read meal analysis cache" ON public.meal_analysis_cache;
CREATE POLICY "Professionals read meal analysis cache"
  ON public.meal_analysis_cache FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'nutritionist'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
  );
