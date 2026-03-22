
-- ═══════════════════════════════════════════
-- WhatsApp Integration Tables (Evolution API)
-- ═══════════════════════════════════════════

-- 1. Professional WhatsApp Connections
CREATE TABLE public.professional_whatsapp_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID NOT NULL,
  provider_name TEXT NOT NULL DEFAULT 'evolution_api',
  provider_instance_name TEXT,
  phone_number TEXT,
  display_name TEXT,
  connection_status TEXT NOT NULL DEFAULT 'disconnected',
  qr_code_payload TEXT,
  api_base_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT false,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(professional_id)
);

ALTER TABLE public.professional_whatsapp_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Professionals manage own WhatsApp connection"
  ON public.professional_whatsapp_connections
  FOR ALL TO authenticated
  USING (professional_id = auth.uid())
  WITH CHECK (professional_id = auth.uid());

-- 2. Professional WhatsApp Automation Settings
CREATE TABLE public.professional_whatsapp_automation_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID NOT NULL UNIQUE,
  send_new_patient_alert BOOLEAN NOT NULL DEFAULT true,
  send_onboarding_release BOOLEAN NOT NULL DEFAULT true,
  send_daily_focus BOOLEAN NOT NULL DEFAULT false,
  send_checklist_reminders BOOLEAN NOT NULL DEFAULT false,
  send_low_adherence_alerts BOOLEAN NOT NULL DEFAULT true,
  send_plan_published BOOLEAN NOT NULL DEFAULT true,
  send_weekly_summary BOOLEAN NOT NULL DEFAULT false,
  sending_start_hour INT NOT NULL DEFAULT 8,
  sending_end_hour INT NOT NULL DEFAULT 21,
  max_messages_per_day INT NOT NULL DEFAULT 4,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.professional_whatsapp_automation_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Professionals manage own automation settings"
  ON public.professional_whatsapp_automation_settings
  FOR ALL TO authenticated
  USING (professional_id = auth.uid())
  WITH CHECK (professional_id = auth.uid());

-- 3. WhatsApp Message Logs
CREATE TABLE public.whatsapp_message_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID NOT NULL,
  patient_id UUID,
  event_type TEXT NOT NULL,
  message_template_code TEXT,
  message_body TEXT NOT NULL,
  delivery_status TEXT NOT NULL DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  external_message_id TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_message_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Professionals view own message logs"
  ON public.whatsapp_message_logs
  FOR SELECT TO authenticated
  USING (professional_id = auth.uid());

CREATE POLICY "System inserts message logs"
  ON public.whatsapp_message_logs
  FOR INSERT TO authenticated
  WITH CHECK (professional_id = auth.uid());

-- 4. Clinical Communication Events (Priority Queue)
CREATE TABLE public.clinical_communication_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL,
  professional_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  event_context JSONB DEFAULT '{}',
  priority_score INT NOT NULL DEFAULT 50,
  message_template_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  scheduled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.clinical_communication_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Professionals view own communication events"
  ON public.clinical_communication_events
  FOR SELECT TO authenticated
  USING (professional_id = auth.uid());

CREATE POLICY "System manages communication events"
  ON public.clinical_communication_events
  FOR ALL TO authenticated
  USING (professional_id = auth.uid())
  WITH CHECK (professional_id = auth.uid());

-- 5. WhatsApp Inbound Messages
CREATE TABLE public.whatsapp_inbound_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID,
  professional_id UUID NOT NULL,
  phone_number TEXT NOT NULL,
  message_text TEXT NOT NULL,
  interpreted_intent TEXT,
  confidence_score NUMERIC(5,2) DEFAULT 0,
  processed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_inbound_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Professionals view own inbound messages"
  ON public.whatsapp_inbound_messages
  FOR SELECT TO authenticated
  USING (professional_id = auth.uid());

-- 6. Intent Learning Log
CREATE TABLE public.whatsapp_intent_learning_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inbound_message_id UUID REFERENCES public.whatsapp_inbound_messages(id) ON DELETE CASCADE,
  original_message TEXT NOT NULL,
  detected_intent TEXT NOT NULL,
  clinical_result TEXT,
  action_generated TEXT,
  was_correct BOOLEAN,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_intent_learning_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Professionals view own intent logs"
  ON public.whatsapp_intent_learning_log
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.whatsapp_inbound_messages m
      WHERE m.id = whatsapp_intent_learning_log.inbound_message_id
      AND m.professional_id = auth.uid()
    )
  );

-- Indexes for performance
CREATE INDEX idx_whatsapp_connections_professional ON public.professional_whatsapp_connections(professional_id);
CREATE INDEX idx_whatsapp_automation_professional ON public.professional_whatsapp_automation_settings(professional_id);
CREATE INDEX idx_whatsapp_logs_professional ON public.whatsapp_message_logs(professional_id);
CREATE INDEX idx_whatsapp_logs_patient ON public.whatsapp_message_logs(patient_id);
CREATE INDEX idx_whatsapp_logs_sent_at ON public.whatsapp_message_logs(sent_at DESC);
CREATE INDEX idx_clinical_events_status ON public.clinical_communication_events(status, priority_score DESC);
CREATE INDEX idx_clinical_events_professional ON public.clinical_communication_events(professional_id);
CREATE INDEX idx_whatsapp_inbound_professional ON public.whatsapp_inbound_messages(professional_id);
CREATE INDEX idx_whatsapp_inbound_processed ON public.whatsapp_inbound_messages(processed);
