
-- Patient Clinical Learning Profile
CREATE TABLE IF NOT EXISTS public.patient_clinical_learning_profile (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL UNIQUE,
  best_adherence_hour integer DEFAULT 12,
  consistency_level text DEFAULT 'moderate',
  checkin_frequency integer DEFAULT 0,
  preferred_checkin_time text DEFAULT '12:00',
  response_to_notifications text DEFAULT 'moderate',
  emotional_pattern text DEFAULT 'stable',
  successful_strategies jsonb DEFAULT '[]',
  failed_strategies jsonb DEFAULT '[]',
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.patient_clinical_learning_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Professionals can read learning profiles" ON public.patient_clinical_learning_profile
  FOR SELECT TO authenticated USING (
    patient_id IN (SELECT patient_id FROM public.nutritionist_patients WHERE nutritionist_id = auth.uid() AND status = 'active')
  );

-- Ensure patient_clinical_state has all needed columns
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'patient_clinical_state' AND column_name = 'adherence_score') THEN
    ALTER TABLE public.patient_clinical_state ADD COLUMN adherence_score numeric DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'patient_clinical_state' AND column_name = 'metabolic_score') THEN
    ALTER TABLE public.patient_clinical_state ADD COLUMN metabolic_score numeric DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'patient_clinical_state' AND column_name = 'behavioral_score') THEN
    ALTER TABLE public.patient_clinical_state ADD COLUMN behavioral_score numeric DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'patient_clinical_state' AND column_name = 'engagement_score') THEN
    ALTER TABLE public.patient_clinical_state ADD COLUMN engagement_score numeric DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'patient_clinical_state' AND column_name = 'risk_score') THEN
    ALTER TABLE public.patient_clinical_state ADD COLUMN risk_score numeric DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'patient_clinical_state' AND column_name = 'composite_score') THEN
    ALTER TABLE public.patient_clinical_state ADD COLUMN composite_score numeric DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'patient_clinical_state' AND column_name = 'zone') THEN
    ALTER TABLE public.patient_clinical_state ADD COLUMN zone text DEFAULT 'metabolic_adaptation';
  END IF;
END $$;

-- Ensure patient_relationship_scores has all needed columns
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'patient_relationship_scores' AND column_name = 'engagement_level') THEN
    ALTER TABLE public.patient_relationship_scores ADD COLUMN engagement_level text DEFAULT 'stable';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'patient_relationship_scores' AND column_name = 'churn_risk_score') THEN
    ALTER TABLE public.patient_relationship_scores ADD COLUMN churn_risk_score numeric DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'patient_relationship_scores' AND column_name = 'upgrade_moment_score') THEN
    ALTER TABLE public.patient_relationship_scores ADD COLUMN upgrade_moment_score numeric DEFAULT 0;
  END IF;
END $$;

-- Add unique constraint on patient_clinical_state if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'patient_clinical_state_patient_id_key') THEN
    ALTER TABLE public.patient_clinical_state ADD CONSTRAINT patient_clinical_state_patient_id_key UNIQUE (patient_id);
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Add unique constraint on patient_relationship_scores if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'patient_relationship_scores_patient_id_key') THEN
    ALTER TABLE public.patient_relationship_scores ADD CONSTRAINT patient_relationship_scores_patient_id_key UNIQUE (patient_id);
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
