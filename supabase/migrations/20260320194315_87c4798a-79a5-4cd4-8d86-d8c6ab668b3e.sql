
-- Add context tracking columns to patient_behavioral_tasks
ALTER TABLE public.patient_behavioral_tasks
  ADD COLUMN IF NOT EXISTS objective_context text,
  ADD COLUMN IF NOT EXISTS strategy_context text,
  ADD COLUMN IF NOT EXISTS phase_context text,
  ADD COLUMN IF NOT EXISTS priority_reason text;

-- Add context tracking columns to patient_clinical_messages
ALTER TABLE public.patient_clinical_messages
  ADD COLUMN IF NOT EXISTS objective_context text,
  ADD COLUMN IF NOT EXISTS strategy_context text,
  ADD COLUMN IF NOT EXISTS phase_context text,
  ADD COLUMN IF NOT EXISTS priority_reason text;
