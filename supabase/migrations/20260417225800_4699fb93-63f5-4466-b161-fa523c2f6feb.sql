-- Substitui policy permissiva por uma restrita
DROP POLICY IF EXISTS "System can write realtime cache" ON public.patient_realtime_fix_cache;

CREATE POLICY "Authorized parties can write realtime cache"
  ON public.patient_realtime_fix_cache FOR INSERT
  TO authenticated
  WITH CHECK (
    patient_id = auth.uid()
    OR has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.nutritionist_patients np
      WHERE np.patient_id = patient_realtime_fix_cache.patient_id
        AND np.nutritionist_id = auth.uid()
    )
  );

CREATE POLICY "Authorized parties can update realtime cache"
  ON public.patient_realtime_fix_cache FOR UPDATE
  TO authenticated
  USING (
    patient_id = auth.uid()
    OR has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.nutritionist_patients np
      WHERE np.patient_id = patient_realtime_fix_cache.patient_id
        AND np.nutritionist_id = auth.uid()
    )
  );