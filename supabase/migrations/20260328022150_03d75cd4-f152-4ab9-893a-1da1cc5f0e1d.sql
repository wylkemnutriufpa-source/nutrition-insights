
-- Fix: is_personal_trainer used wrong enum value. Create is_personal() instead.
CREATE OR REPLACE FUNCTION public.is_personal(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'personal'
  )
$$;

-- is_patient helper
CREATE OR REPLACE FUNCTION public.is_patient(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'patient'
  )
$$;

-- Rate limit index
CREATE INDEX IF NOT EXISTS idx_rate_limits_cleanup
ON public.edge_function_rate_limits(function_name, client_key, window_start);

-- Security events table for abuse logging
CREATE TABLE IF NOT EXISTS public.security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  user_id uuid,
  ip_address text,
  function_name text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read security events"
ON public.security_events FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service inserts security events"
ON public.security_events FOR INSERT
TO authenticated
WITH CHECK (true);
