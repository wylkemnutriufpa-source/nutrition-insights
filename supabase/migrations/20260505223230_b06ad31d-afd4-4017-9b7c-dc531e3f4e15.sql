
-- 1. clinical_engine_audit_logs: drop overly-permissive public ALL policy.
DROP POLICY IF EXISTS "Service role full access" ON public.clinical_engine_audit_logs;

-- 2. user_linkage_log: restrict admin view to authenticated admins.
DROP POLICY IF EXISTS "Admins can view linkage logs" ON public.user_linkage_log;
CREATE POLICY "Admins can view linkage logs"
  ON public.user_linkage_log
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 3. audit_cache: enable RLS and add admin-only policy.
ALTER TABLE public.audit_cache ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage audit cache" ON public.audit_cache;
CREATE POLICY "Admins can manage audit cache"
  ON public.audit_cache
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- 4. invitation_logs: remove public SELECT; restrict INSERT to authenticated.
DROP POLICY IF EXISTS "Anyone can view invitation logs" ON public.invitation_logs;
DROP POLICY IF EXISTS "System can insert logs" ON public.invitation_logs;
CREATE POLICY "Authenticated can insert invitation logs"
  ON public.invitation_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);
DROP POLICY IF EXISTS "Admins can view all invitation logs" ON public.invitation_logs;
CREATE POLICY "Admins can view all invitation logs"
  ON public.invitation_logs
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
