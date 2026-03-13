
-- Clinical Alerts table
CREATE TABLE public.clinical_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL,
  nutritionist_id UUID NOT NULL,
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium',
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  trigger_source TEXT NOT NULL DEFAULT 'clinical_engine',
  metadata JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID
);

-- Add constraint for severity
ALTER TABLE public.clinical_alerts 
  ADD CONSTRAINT clinical_alerts_severity_check 
  CHECK (severity IN ('low', 'medium', 'high', 'critical'));

-- Indexes
CREATE INDEX idx_alerts_patient_active ON public.clinical_alerts (patient_id, is_active) WHERE is_active = true;
CREATE INDEX idx_alerts_severity ON public.clinical_alerts (severity, is_active) WHERE is_active = true;
CREATE INDEX idx_alerts_created_at ON public.clinical_alerts (created_at DESC);
CREATE INDEX idx_alerts_nutritionist ON public.clinical_alerts (nutritionist_id, is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE public.clinical_alerts ENABLE ROW LEVEL SECURITY;

-- Nutritionists can see alerts for their patients
CREATE POLICY "Nutritionists can view their alerts"
  ON public.clinical_alerts FOR SELECT TO authenticated
  USING (nutritionist_id = auth.uid());

-- Nutritionists can resolve alerts
CREATE POLICY "Nutritionists can update their alerts"
  ON public.clinical_alerts FOR UPDATE TO authenticated
  USING (nutritionist_id = auth.uid())
  WITH CHECK (nutritionist_id = auth.uid());

-- Service role can insert (edge functions)
CREATE POLICY "Service can insert alerts"
  ON public.clinical_alerts FOR INSERT TO authenticated
  WITH CHECK (true);

-- Patients can see their own alerts (read only)
CREATE POLICY "Patients can view own alerts"
  ON public.clinical_alerts FOR SELECT TO authenticated
  USING (patient_id = auth.uid());
