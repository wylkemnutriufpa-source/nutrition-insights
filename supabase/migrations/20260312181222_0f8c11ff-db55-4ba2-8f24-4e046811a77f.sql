
-- Fix the overly permissive policy - replace with role-based check
DROP POLICY IF EXISTS "Service can manage affiliate metrics" ON public.affiliate_metrics_cache;

-- Admin can manage all metrics (needed for cron/service operations)
CREATE POLICY "Admins can manage affiliate metrics"
  ON public.affiliate_metrics_cache FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
