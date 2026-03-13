
-- Fix edge_function_rate_limits: RLS enabled but no policies
-- This table is used by service_role in edge functions, but needs a policy for completeness
CREATE POLICY "Service role manages rate limits"
  ON public.edge_function_rate_limits FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
