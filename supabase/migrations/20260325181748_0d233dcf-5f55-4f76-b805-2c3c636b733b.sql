
-- Phase 1: Add missing fields to profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS fit_intelligence_mode text DEFAULT 'friendly',
  ADD COLUMN IF NOT EXISTS fit_intelligence_last_seen_at timestamptz,
  ADD COLUMN IF NOT EXISTS fit_intelligence_snoozed_until timestamptz;

-- Add preferred_reminder_windows to behavioral_profile
ALTER TABLE public.behavioral_profile 
  ADD COLUMN IF NOT EXISTS preferred_reminder_windows integer[] DEFAULT '{9,12,15,18}';

-- Create fit_intelligence_tasks table
CREATE TABLE IF NOT EXISTS public.fit_intelligence_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  task_type text NOT NULL,
  scheduled_for timestamptz,
  payload jsonb DEFAULT '{}'::jsonb,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  delivered_at timestamptz,
  completed_at timestamptz
);

-- Add prompt_title to interactions if missing
ALTER TABLE public.fit_intelligence_interactions 
  ADD COLUMN IF NOT EXISTS prompt_title text;

-- RLS for fit_intelligence_tasks
ALTER TABLE public.fit_intelligence_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "patients_own_tasks" ON public.fit_intelligence_tasks
  FOR ALL USING (patient_id = auth.uid());

CREATE POLICY "admins_manage_tasks" ON public.fit_intelligence_tasks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
