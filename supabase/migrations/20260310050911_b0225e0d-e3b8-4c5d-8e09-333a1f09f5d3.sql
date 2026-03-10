
-- Allow admins to manage pricing plans
CREATE POLICY "Admins manage pricing plans"
ON public.pricing_plans FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
