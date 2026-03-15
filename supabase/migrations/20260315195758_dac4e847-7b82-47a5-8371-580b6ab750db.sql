
-- Fix overly permissive RLS policies on performance tables
DROP POLICY IF EXISTS "System can upsert performance state" ON public.patient_human_performance_state;
DROP POLICY IF EXISTS "System can insert snapshots" ON public.patient_performance_snapshots;
DROP POLICY IF EXISTS "System can update snapshots" ON public.patient_performance_snapshots;

-- Only service role (edge functions) can write; no client-side writes needed
-- These tables are written by the edge function using service_role key
