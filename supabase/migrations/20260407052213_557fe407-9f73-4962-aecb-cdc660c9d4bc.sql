CREATE POLICY "Nutritionists view linked patient payments"
  ON public.payments FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.nutritionist_patients np
      WHERE np.patient_id = payments.user_id
        AND np.nutritionist_id = auth.uid()
        AND np.status = 'active'
    )
    OR has_role(auth.uid(), 'admin'::app_role)
  );

DROP POLICY IF EXISTS "Users view own payments" ON public.payments;