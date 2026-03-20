
-- patient_clinical_flags: flags clínicas ativas do paciente, geradas pela anamnese
CREATE TABLE IF NOT EXISTS public.patient_clinical_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  flag_key text NOT NULL REFERENCES public.clinical_flags_catalog(flag_key),
  source text NOT NULL DEFAULT 'anamnese',
  confidence numeric NOT NULL DEFAULT 1.0,
  is_active boolean NOT NULL DEFAULT true,
  source_answer_key text,
  source_answer_value jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(patient_id, flag_key)
);

ALTER TABLE public.patient_clinical_flags ENABLE ROW LEVEL SECURITY;

-- RLS: Patients see own flags
CREATE POLICY "Patients can view own flags" ON public.patient_clinical_flags
  FOR SELECT TO authenticated
  USING (auth.uid() = patient_id);

-- RLS: Nutritionists see linked patient flags
CREATE POLICY "Nutritionists can view patient flags" ON public.patient_clinical_flags
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM nutritionist_patients np
    WHERE np.patient_id = patient_clinical_flags.patient_id
      AND np.nutritionist_id = auth.uid()
      AND np.status = 'active'
  ));

-- RLS: System inserts (via service role in edge functions)
CREATE POLICY "Service can manage flags" ON public.patient_clinical_flags
  FOR ALL TO authenticated
  USING (auth.uid() = patient_id);

-- Indexes
CREATE INDEX idx_patient_clinical_flags_patient ON public.patient_clinical_flags(patient_id);
CREATE INDEX idx_patient_clinical_flags_active ON public.patient_clinical_flags(patient_id, is_active) WHERE is_active = true;
CREATE INDEX idx_patient_clinical_flags_flag ON public.patient_clinical_flags(flag_key);

-- Updated_at trigger
CREATE TRIGGER update_patient_clinical_flags_updated_at
  BEFORE UPDATE ON public.patient_clinical_flags
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
