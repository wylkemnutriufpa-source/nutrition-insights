
-- Fix RLS: drop overly permissive policy and add proper ones
DROP POLICY IF EXISTS "System can insert transition suggestions" ON public.protocol_transition_suggestions;

-- Edge functions use service role key which bypasses RLS, so no need for a system insert policy
-- The nutritionist policy already covers authenticated user access
