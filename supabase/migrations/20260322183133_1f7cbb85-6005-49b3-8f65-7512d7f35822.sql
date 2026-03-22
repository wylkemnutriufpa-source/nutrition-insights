
CREATE TABLE public.whatsapp_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID NOT NULL,
  provider TEXT NOT NULL DEFAULT 'zapi',
  instance_id TEXT NOT NULL,
  token TEXT NOT NULL,
  phone_number TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(professional_id)
);

ALTER TABLE public.whatsapp_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Professionals manage own whatsapp integration"
  ON public.whatsapp_integrations
  FOR ALL
  TO authenticated
  USING (professional_id = auth.uid())
  WITH CHECK (professional_id = auth.uid());

CREATE TABLE public.whatsapp_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID NOT NULL,
  patient_id UUID,
  event_type TEXT NOT NULL,
  message_body TEXT NOT NULL,
  delivery_status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Professionals view own whatsapp logs"
  ON public.whatsapp_logs
  FOR SELECT
  TO authenticated
  USING (professional_id = auth.uid());

CREATE POLICY "System inserts whatsapp logs"
  ON public.whatsapp_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (professional_id = auth.uid());

CREATE INDEX idx_zapi_logs_prof ON public.whatsapp_logs(professional_id, created_at DESC);
CREATE INDEX idx_zapi_logs_pat ON public.whatsapp_logs(patient_id, created_at DESC);
CREATE INDEX idx_zapi_integrations_prof ON public.whatsapp_integrations(professional_id);
