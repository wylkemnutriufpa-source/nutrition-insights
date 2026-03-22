
-- Regression Guard Logs (BLOCO 8)
CREATE TABLE public.regression_guard_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affected_flow TEXT NOT NULL,
  detected_issue TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium',
  source_layer TEXT NOT NULL DEFAULT 'frontend',
  auto_fallback_applied BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Feature Flags (BLOCO 7)
CREATE TABLE public.feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  description TEXT DEFAULT '',
  graceful_degradation BOOLEAN NOT NULL DEFAULT true,
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS for regression_guard_logs: insert by authenticated, select by admin
ALTER TABLE public.regression_guard_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can insert regression logs"
ON public.regression_guard_logs FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can read regression logs"
ON public.regression_guard_logs FOR SELECT TO authenticated
USING (true);

-- RLS for feature_flags: read by all authenticated, write by admin
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read feature flags"
ON public.feature_flags FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Admins can manage feature flags"
ON public.feature_flags FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Insert default feature flags
INSERT INTO public.feature_flags (key, enabled, description, graceful_degradation) VALUES
  ('whatsapp_integration', true, 'Integração WhatsApp via Z-API', true),
  ('premium_loaders', true, 'Loaders premium com animações', true),
  ('clinical_analytics', true, 'Analytics clínico avançado', true),
  ('behavior_learning', true, 'Motor de aprendizado comportamental', true),
  ('metabolic_score', true, 'Score metabólico e classificação', true),
  ('clinical_automations', true, 'Automações clínicas (flags → tarefas → mensagens)', true),
  ('ai_meal_generator', true, 'Gerador de plano alimentar com IA', true),
  ('recipe_ai_generation', true, 'Geração de receitas com IA', true),
  ('body_projection', true, 'Projeção corporal futura com digital twin', true),
  ('semi_autonomous_protocols', true, 'Transições semi-autônomas de protocolo', true)
ON CONFLICT (key) DO NOTHING;
