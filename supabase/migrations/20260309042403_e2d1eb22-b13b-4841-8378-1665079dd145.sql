CREATE POLICY "Nutritionists manage patient subscriptions"
ON public.subscriptions
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.nutritionist_patients np
    WHERE np.patient_id = subscriptions.user_id
    AND np.nutritionist_id = auth.uid()
    AND np.status = 'active'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.nutritionist_patients np
    WHERE np.patient_id = subscriptions.user_id
    AND np.nutritionist_id = auth.uid()
    AND np.status = 'active'
  )
);