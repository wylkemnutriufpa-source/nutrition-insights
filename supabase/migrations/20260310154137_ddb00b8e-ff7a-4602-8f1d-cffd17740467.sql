
-- Allow admins to manage AI usage limits
CREATE POLICY "Admins manage ai_usage_limits" ON public.ai_usage_limits
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
