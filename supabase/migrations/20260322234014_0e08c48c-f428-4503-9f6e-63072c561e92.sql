
-- ═══════════════════════════════════════════
-- AI Clinical Brain & Mission Control & CRM & Campaigns & Growth
-- ═══════════════════════════════════════════

-- 1. Patient Clinical State (AI Clinical Brain - Central State)
CREATE TABLE IF NOT EXISTS public.patient_clinical_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL,
  zone TEXT NOT NULL DEFAULT 'adaptation' CHECK (zone IN ('accelerated_evolution','metabolic_adaptation','clinical_risk','potential_abandonment','high_performance')),
  zone_confidence NUMERIC DEFAULT 50,
  adherence_score NUMERIC DEFAULT 0,
  metabolic_score NUMERIC DEFAULT 0,
  behavioral_score NUMERIC DEFAULT 0,
  risk_score NUMERIC DEFAULT 0,
  engagement_score NUMERIC DEFAULT 0,
  composite_score NUMERIC DEFAULT 0,
  drivers JSONB DEFAULT '[]',
  last_computed_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Clinical Decisions (AI Brain suggestions)
CREATE TABLE IF NOT EXISTS public.clinical_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL,
  nutritionist_id UUID NOT NULL,
  decision_type TEXT NOT NULL,
  title TEXT NOT NULL,
  reason TEXT NOT NULL,
  urgency TEXT DEFAULT 'medium' CHECK (urgency IN ('low','medium','high','critical')),
  expected_impact TEXT,
  confidence NUMERIC DEFAULT 50,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected','auto_applied')),
  acted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Patient Clinical Learning Profile
CREATE TABLE IF NOT EXISTS public.patient_clinical_learning_profile (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL UNIQUE,
  best_adherence_days JSONB DEFAULT '[]',
  worst_adherence_days JSONB DEFAULT '[]',
  effective_strategies JSONB DEFAULT '[]',
  failed_strategies JSONB DEFAULT '[]',
  emotional_patterns JSONB DEFAULT '{}',
  metabolic_response_type TEXT,
  optimal_meal_times JSONB DEFAULT '[]',
  learning_version INTEGER DEFAULT 1,
  last_updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Global Action Catalog (Mission Control)
CREATE TABLE IF NOT EXISTS public.global_action_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_code TEXT NOT NULL UNIQUE,
  action_name TEXT NOT NULL,
  action_description TEXT,
  entity_type TEXT NOT NULL,
  category TEXT DEFAULT 'operations',
  supports_preview BOOLEAN DEFAULT true,
  supports_rollback BOOLEAN DEFAULT false,
  risk_level TEXT DEFAULT 'medium' CHECK (risk_level IN ('low','medium','high','critical')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Global Action Logs
CREATE TABLE IF NOT EXISTS public.global_action_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_code TEXT NOT NULL,
  executed_by UUID NOT NULL,
  filters_json JSONB DEFAULT '{}',
  payload_json JSONB DEFAULT '{}',
  affected_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  execution_status TEXT DEFAULT 'running' CHECK (execution_status IN ('running','completed','failed','rolled_back')),
  execution_summary TEXT,
  started_at TIMESTAMPTZ DEFAULT now(),
  finished_at TIMESTAMPTZ
);

-- 6. Global Rules Engine
CREATE TABLE IF NOT EXISTS public.global_rules_engine (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_code TEXT NOT NULL,
  rule_name TEXT NOT NULL,
  rule_description TEXT,
  target_scope TEXT DEFAULT 'all',
  conditions_json JSONB DEFAULT '{}',
  actions_json JSONB DEFAULT '{}',
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Campaigns
CREATE TABLE IF NOT EXISTS public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_name TEXT NOT NULL,
  campaign_type TEXT DEFAULT 'operational' CHECK (campaign_type IN ('operational','promotional','educational','clinical')),
  audience_type TEXT DEFAULT 'patients' CHECK (audience_type IN ('patients','professionals','mixed')),
  delivery_channels_json JSONB DEFAULT '["notification"]',
  title TEXT NOT NULL,
  message_body TEXT NOT NULL,
  call_to_action_label TEXT,
  call_to_action_url TEXT,
  filters_json JSONB DEFAULT '{}',
  scheduling_type TEXT DEFAULT 'immediate' CHECK (scheduling_type IN ('immediate','scheduled')),
  scheduled_at TIMESTAMPTZ,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','ready','running','completed','canceled','failed')),
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 8. Campaign Deliveries
CREATE TABLE IF NOT EXISTS public.campaign_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE NOT NULL,
  recipient_type TEXT NOT NULL,
  recipient_id UUID NOT NULL,
  channel TEXT NOT NULL,
  delivery_status TEXT DEFAULT 'pending' CHECK (delivery_status IN ('pending','sent','delivered','failed','clicked')),
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 9. Patient Relationship Score (CRM)
CREATE TABLE IF NOT EXISTS public.patient_relationship_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL UNIQUE,
  relationship_score NUMERIC DEFAULT 50,
  engagement_level TEXT DEFAULT 'stable' CHECK (engagement_level IN ('engaged','stable','attention','high_risk')),
  upgrade_moment_score NUMERIC DEFAULT 0,
  churn_risk_score NUMERIC DEFAULT 0,
  last_computed_at TIMESTAMPTZ DEFAULT now(),
  factors JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 10. Relationship Notes (CRM)
CREATE TABLE IF NOT EXISTS public.relationship_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL,
  professional_id UUID NOT NULL,
  note TEXT NOT NULL,
  note_type TEXT DEFAULT 'observation',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.patient_clinical_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinical_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_clinical_learning_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_action_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_action_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_rules_engine ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_relationship_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.relationship_notes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated read clinical state" ON public.patient_clinical_state FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read clinical decisions" ON public.clinical_decisions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Pro insert clinical decisions" ON public.clinical_decisions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Pro update clinical decisions" ON public.clinical_decisions FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated read learning profile" ON public.patient_clinical_learning_profile FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin read action catalog" ON public.global_action_catalog FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manage action logs" ON public.global_action_logs FOR ALL TO authenticated USING (true);
CREATE POLICY "Admin manage rules" ON public.global_rules_engine FOR ALL TO authenticated USING (true);
CREATE POLICY "Admin manage campaigns" ON public.campaigns FOR ALL TO authenticated USING (true);
CREATE POLICY "Admin manage deliveries" ON public.campaign_deliveries FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated read relationship scores" ON public.patient_relationship_scores FOR SELECT TO authenticated USING (true);
CREATE POLICY "Pro manage relationship notes" ON public.relationship_notes FOR ALL TO authenticated USING (true);

-- Seed initial action catalog
INSERT INTO public.global_action_catalog (action_code, action_name, action_description, entity_type, category, risk_level, supports_rollback) VALUES
  ('grant_premium_days', 'Conceder Premium Temporário', 'Concede dias premium a um grupo de usuários', 'users', 'premium', 'medium', true),
  ('deactivate_patients', 'Desativar Pacientes', 'Desativa pacientes filtrados', 'patients', 'patients', 'high', true),
  ('activate_patients', 'Ativar Pacientes', 'Reativa pacientes filtrados', 'patients', 'patients', 'medium', true),
  ('archive_legacy_plans', 'Arquivar Planos Legados', 'Arquiva planos pendentes do onboarding legado', 'meal_plans', 'plans', 'high', false),
  ('release_onboarding_paid', 'Liberar Onboarding (Pagos)', 'Libera onboarding para pacientes com pagamento confirmado', 'patients', 'onboarding', 'medium', false),
  ('send_campaign', 'Enviar Campanha', 'Envia comunicação segmentada', 'users', 'communication', 'low', false),
  ('publish_global_notice', 'Publicar Aviso Global', 'Publica aviso para todos os usuários', 'users', 'communication', 'low', true),
  ('enable_feature_flag', 'Ativar Feature Flag', 'Ativa uma funcionalidade globalmente', 'system', 'feature_flags', 'medium', true),
  ('disable_feature_flag', 'Desativar Feature Flag', 'Desativa uma funcionalidade globalmente', 'system', 'feature_flags', 'medium', true),
  ('recalculate_scores', 'Recalcular Scores Clínicos', 'Recalcula scores para pacientes filtrados', 'patients', 'clinical', 'low', false),
  ('rerun_pipeline', 'Re-executar Pipeline', 'Re-executa pipeline clínico para segmento', 'patients', 'clinical', 'medium', false);
