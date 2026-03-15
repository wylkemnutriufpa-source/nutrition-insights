
-- Fix: replace overly permissive policy with service-role scoped policies
DROP POLICY IF EXISTS "Service can manage snapshots" ON public.patient_clinical_snapshots;

-- Edge functions use service_role key which bypasses RLS entirely,
-- so we only need the SELECT policy for authenticated users (already exists).
-- Add INSERT/UPDATE for service role via a security definer function instead.
