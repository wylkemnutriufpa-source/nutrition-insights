
-- Table for metabolic classification history
CREATE TABLE public.metabolic_classification_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL,
  metabolic_response_type TEXT NOT NULL,
  previous_type TEXT,
  confidence_score NUMERIC NOT NULL DEFAULT 0,
  dominant_pattern TEXT,
  clinical_interpretation TEXT,
  classification_data JSONB DEFAULT '{}'::jsonb,
  trigger_source TEXT NOT NULL DEFAULT 'manual',
  engine_version TEXT NOT NULL DEFAULT '1.0.0',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);

-- Enable RLS
ALTER TABLE public.metabolic_classification_history ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Authenticated users can view metabolic classification history"
  ON public.metabolic_classification_history FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Service role can insert metabolic classification history"
  ON public.metabolic_classification_history FOR INSERT TO authenticated
  WITH CHECK (true);

-- Add metabolic_confidence_score and metabolic_last_evaluated_at to profiles if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'metabolic_confidence_score') THEN
    ALTER TABLE public.profiles ADD COLUMN metabolic_confidence_score NUMERIC;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'metabolic_last_evaluated_at') THEN
    ALTER TABLE public.profiles ADD COLUMN metabolic_last_evaluated_at TIMESTAMPTZ;
  END IF;
END $$;

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_metabolic_classification_history_patient 
  ON public.metabolic_classification_history (patient_id, created_at DESC);
