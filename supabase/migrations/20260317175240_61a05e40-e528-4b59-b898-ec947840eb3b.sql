
-- ============================================================
-- RLS HARDENING: Fix critical vulnerabilities
-- ============================================================

-- 1. organizations: Fix INSERT policy with OR true
DROP POLICY IF EXISTS "Admins can insert orgs" ON public.organizations;
CREATE POLICY "Admins can insert orgs"
  ON public.organizations FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 2. patient_automation_state: SELECT true → owner or professional
DROP POLICY IF EXISTS "Authenticated users can read automation state" ON public.patient_automation_state;
CREATE POLICY "Professionals and owners can read automation state"
  ON public.patient_automation_state FOR SELECT TO authenticated
  USING (
    patient_id = auth.uid()
    OR has_role(auth.uid(), 'nutritionist'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- 3. clinical_auto_adjustment_logs: SELECT true → professionals only
DROP POLICY IF EXISTS "Authenticated users can read auto adjustment logs" ON public.clinical_auto_adjustment_logs;
CREATE POLICY "Professionals can read auto adjustment logs"
  ON public.clinical_auto_adjustment_logs FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'nutritionist'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- 4. metabolic_classification_history: SELECT true → owner or professional
DROP POLICY IF EXISTS "Authenticated users can view metabolic classification history" ON public.metabolic_classification_history;
CREATE POLICY "Owner or professionals can view metabolic classification history"
  ON public.metabolic_classification_history FOR SELECT TO authenticated
  USING (
    patient_id = auth.uid()
    OR has_role(auth.uid(), 'nutritionist'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- 5. nutrition_protocol_changed: SELECT true → professionals only
DROP POLICY IF EXISTS "Authenticated users can read nutrition_protocol_changed" ON public.nutrition_protocol_changed;
CREATE POLICY "Professionals can read nutrition_protocol_changed"
  ON public.nutrition_protocol_changed FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'nutritionist'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- 6. clinical_intervention_simulations: Already partially hardened, just tighten SELECT
DROP POLICY IF EXISTS "Authenticated can read simulations" ON public.clinical_intervention_simulations;
CREATE POLICY "Professionals can read simulations"
  ON public.clinical_intervention_simulations FOR SELECT TO authenticated
  USING (
    created_by = auth.uid()
    OR has_role(auth.uid(), 'nutritionist'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
  );
