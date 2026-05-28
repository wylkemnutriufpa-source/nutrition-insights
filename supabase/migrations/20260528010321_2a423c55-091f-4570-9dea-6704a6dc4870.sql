-- 1) Make meal-photos bucket private so public URLs no longer bypass RLS
UPDATE storage.buckets SET public = false WHERE id = 'meal-photos';

-- 2) Convert vw_patient_history to security_invoker so RLS of caller applies
ALTER VIEW public.vw_patient_history SET (security_invoker = on);

-- 3) Restrict anamnesis SELECT policies to active professional relationships only
DROP POLICY IF EXISTS "Nutritionists can only see their own patients' anamnesis" ON public.patient_anamnesis;
DROP POLICY IF EXISTS "Nutritionists can view patient anamnesis" ON public.patient_anamnesis;

CREATE POLICY "Nutritionists can only see their own patients' anamnesis"
ON public.patient_anamnesis
FOR SELECT
USING (
  (auth.uid() = user_id)
  OR EXISTS (
    SELECT 1
    FROM public.nutritionist_patients np
    WHERE np.patient_id = patient_anamnesis.user_id
      AND np.nutritionist_id = auth.uid()
      AND np.status = 'active'
  )
);

CREATE POLICY "Nutritionists can view patient anamnesis"
ON public.patient_anamnesis
FOR SELECT
USING (
  (user_id = auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.nutritionist_patients np
    WHERE np.patient_id = patient_anamnesis.user_id
      AND (
        (np.nutritionist_id = auth.uid() AND np.status = 'active')
        OR has_role(auth.uid(), 'admin'::app_role)
      )
  )
);