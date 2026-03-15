
-- Fix RLS policies for nutrition_protocol_changed INSERT
DROP POLICY IF EXISTS "Authenticated users can insert nutrition_protocol_changed" ON public.nutrition_protocol_changed;
CREATE POLICY "Authenticated users can insert nutrition_protocol_changed"
  ON public.nutrition_protocol_changed FOR INSERT TO authenticated 
  WITH CHECK (changed_by = auth.uid());

-- Add service-role-only insert policies for engine-computed tables
CREATE POLICY "Service role can manage cluster_protocol_matrix"
  ON public.cluster_protocol_matrix FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role can manage clinic_clinical_evolution_metrics"
  ON public.clinic_clinical_evolution_metrics FOR ALL TO service_role USING (true) WITH CHECK (true);
