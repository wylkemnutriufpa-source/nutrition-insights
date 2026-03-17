
-- =====================================================
-- SECURITY HARDENING: Fix 4 Critical RLS Vulnerabilities
-- =====================================================

-- 1. TESTIMONIALS: Create secure public view hiding patient_id
--    Drop the overly permissive anon policies and replace with a view

-- Drop existing anon policies that expose patient_id
DROP POLICY IF EXISTS "public_view_approved_anonymous_testimonials" ON public.testimonials;
DROP POLICY IF EXISTS "public_view_approved_testimonials" ON public.testimonials;

-- Create a secure public view that hides patient_id and internal IDs
CREATE OR REPLACE VIEW public.testimonials_public
WITH (security_invoker = on) AS
SELECT
  id,
  nutritionist_id,
  content,
  rating,
  is_anonymous,
  CASE WHEN is_anonymous THEN 'Anônimo' ELSE COALESCE(display_name, 'Paciente') END AS display_name,
  CASE WHEN is_anonymous THEN NULL ELSE avatar_url END AS avatar_url,
  created_at
FROM public.testimonials
WHERE status = 'approved';

-- Re-create anon policies scoped properly (anon cannot see patient_id via base table)
CREATE POLICY "anon_read_approved_testimonials" ON public.testimonials
AS PERMISSIVE FOR SELECT TO anon
USING (false);  -- Block direct base table access for anon; use view instead

-- 2. PIPELINE_RUNS: Remove open policy, keep admin-only
DROP POLICY IF EXISTS "auth_view_pipeline_runs" ON public.pipeline_runs;

-- 3. PIPELINE_STEP_RESULTS: Remove open policy, keep admin-only
DROP POLICY IF EXISTS "auth_view_step_results" ON public.pipeline_step_results;

-- 4. PATIENT_NUTRITION_BENCHMARKS: Remove open policy, keep scoped policy
DROP POLICY IF EXISTS "Authenticated users can read nutrition benchmarks" ON public.patient_nutrition_benchmarks;

-- 5. CLINIC_CLINICAL_EVOLUTION_METRICS: Remove open policy, keep owner/admin policy
DROP POLICY IF EXISTS "Authenticated users can read clinic_clinical_evolution_metrics" ON public.clinic_clinical_evolution_metrics;
