
-- Fix overly permissive INSERT policy: restrict to service role or nutritionists
DROP POLICY IF EXISTS "Service role can insert metabolic classification history" ON public.metabolic_classification_history;

CREATE POLICY "Nutritionists can insert metabolic classification history"
  ON public.metabolic_classification_history FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role IN ('nutritionist', 'admin')
    )
    OR created_by = auth.uid()
  );
