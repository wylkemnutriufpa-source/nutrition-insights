
-- Fix: restrict security_events INSERT to service role / admin only
DROP POLICY IF EXISTS "Service inserts security events" ON public.security_events;

-- Allow inserts only by admin or the user logging their own event
CREATE POLICY "Scoped insert security events"
ON public.security_events FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid() OR public.has_role(auth.uid(), 'admin')
);
