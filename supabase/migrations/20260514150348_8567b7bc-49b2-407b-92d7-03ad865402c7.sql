-- Table for clinical telemetry and human rules enforcement
CREATE TABLE IF NOT EXISTS public.clinical_telemetry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL, -- 'meal_rejected', 'manual_edit', 'substitution_removed'
  patient_id UUID REFERENCES public.profiles(id),
  meal_plan_id UUID,
  meal_slot TEXT,
  content JSONB, -- The meal content that triggered the event
  reasons TEXT[],
  human_score INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.clinical_telemetry ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Clinical telemetry is viewable by staff" 
ON public.clinical_telemetry FOR SELECT 
USING (true); -- Simplified for this project context

CREATE POLICY "Clinical telemetry can be inserted by anyone" 
ON public.clinical_telemetry FOR INSERT 
WITH CHECK (true);

-- Add clinical columns to meal_plan_items
ALTER TABLE public.meal_plan_items 
ADD COLUMN IF NOT EXISTS human_score INTEGER,
ADD COLUMN IF NOT EXISTS human_status TEXT DEFAULT 'pending_review', -- 'pending_review', 'approved', 'robotic', 'absurd'
ADD COLUMN IF NOT EXISTS human_reasons TEXT[];

-- Add audit status to meal_plans
ALTER TABLE public.meal_plans
ADD COLUMN IF NOT EXISTS clinical_audit_status TEXT DEFAULT 'pending_review',
ADD COLUMN IF NOT EXISTS is_humanized BOOLEAN DEFAULT false;
