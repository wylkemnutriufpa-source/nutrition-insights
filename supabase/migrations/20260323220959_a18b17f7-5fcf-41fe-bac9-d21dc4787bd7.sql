
-- Clinical Consents table for LGPD compliance
CREATE TABLE public.clinical_consents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL,
  accepted_terms_version TEXT NOT NULL DEFAULT '1.0.0',
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address TEXT,
  device_info TEXT,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.clinical_consents ENABLE ROW LEVEL SECURITY;

-- Patients can read/insert their own consents
CREATE POLICY "Patients can read own consents"
  ON public.clinical_consents FOR SELECT
  TO authenticated
  USING (patient_id = auth.uid());

CREATE POLICY "Patients can insert own consent"
  ON public.clinical_consents FOR INSERT
  TO authenticated
  WITH CHECK (patient_id = auth.uid());

-- Professionals can view consents of their patients
CREATE POLICY "Professionals can view patient consents"
  ON public.clinical_consents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.nutritionist_patients np
      WHERE np.patient_id = clinical_consents.patient_id
        AND np.nutritionist_id = auth.uid()
        AND np.status = 'active'
    )
  );

-- Index for fast lookups
CREATE INDEX idx_clinical_consents_patient ON public.clinical_consents(patient_id, accepted_terms_version);

-- Enable realtime for system_error_logs (for admin live health page)
ALTER PUBLICATION supabase_realtime ADD TABLE public.system_error_logs;
