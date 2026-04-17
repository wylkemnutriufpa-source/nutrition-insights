-- Tabela de log de erros de runtime do onboarding
CREATE TABLE IF NOT EXISTS public.onboarding_runtime_errors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL,
  context TEXT NOT NULL,
  attempt INTEGER NOT NULL DEFAULT 1,
  error_message TEXT,
  error_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_onboarding_runtime_errors_patient
  ON public.onboarding_runtime_errors (patient_id, created_at DESC);

ALTER TABLE public.onboarding_runtime_errors ENABLE ROW LEVEL SECURITY;

-- Paciente vê os próprios erros
CREATE POLICY "Patient can view own onboarding errors"
ON public.onboarding_runtime_errors
FOR SELECT
USING (auth.uid() = patient_id);

-- Sistema (authenticated) pode inserir
CREATE POLICY "Authenticated can insert onboarding errors"
ON public.onboarding_runtime_errors
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Admin pode ver tudo
CREATE POLICY "Admins can view all onboarding errors"
ON public.onboarding_runtime_errors
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));