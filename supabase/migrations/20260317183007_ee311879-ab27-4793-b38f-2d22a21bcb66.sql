
-- ============================================================
-- BODY PROJECTION V1: Complete foundation (fix)
-- ============================================================

-- 1. Add INSERT policies to patient_weight_history
CREATE POLICY "Patients can insert own weight history"
  ON public.patient_weight_history FOR INSERT TO authenticated
  WITH CHECK (patient_id = auth.uid());

CREATE POLICY "Nutritionists can insert for linked patients weight history"
  ON public.patient_weight_history FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.nutritionist_patients np
      WHERE np.patient_id = patient_weight_history.patient_id
        AND np.nutritionist_id = auth.uid()
        AND np.status = 'active'
    )
  );

CREATE POLICY "Patients can update own weight history"
  ON public.patient_weight_history FOR UPDATE TO authenticated
  USING (patient_id = auth.uid());

CREATE POLICY "Patients can delete own weight history"
  ON public.patient_weight_history FOR DELETE TO authenticated
  USING (patient_id = auth.uid());

-- Unique constraint to prevent duplicate dates
CREATE UNIQUE INDEX IF NOT EXISTS idx_patient_weight_history_unique_date
  ON public.patient_weight_history (patient_id, measurement_date);

-- Admin override for body_projection_snapshots
CREATE POLICY "Admins can manage all projections"
  ON public.body_projection_snapshots FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
