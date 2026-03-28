
-- =============================================
-- FASE 2 — Batch 2: Tabelas de suporte, analytics e secundárias
-- =============================================

-- === BRANDING & CONFIG ===
ALTER TABLE public.branding_settings ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.professional_profiles ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.intelligence_settings ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);

-- === WHATSAPP ===
ALTER TABLE public.whatsapp_integrations ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.whatsapp_logs ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.whatsapp_message_logs ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.whatsapp_inbound_messages ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.professional_whatsapp_connections ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);

-- === TREINO (Personal) ===
ALTER TABLE public.workout_plans ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.workout_routines ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.workout_completions ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.personal_trainer_students ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.cardio_prescriptions ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);

-- === TIMELINE & JOURNEY ===
ALTER TABLE public.patient_timeline ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.patient_journey_events ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.timeline_events ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);

-- === IFJ ===
ALTER TABLE public.ifj_patient_permissions ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.ifj_intent_logs ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.ifj_session_context ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);

-- === DOCUMENTS & STORAGE ===
ALTER TABLE public.patient_documents ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);

-- === ORGANIZATIONS ===
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.organization_members ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);

-- === AFFILIATE ===
ALTER TABLE public.affiliates ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);

-- === CAMPAIGNS ===
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);

-- === LEAD REQUESTS ===
ALTER TABLE public.lead_requests ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.booking_payments ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);

-- === FEEDBACKS ===
ALTER TABLE public.feedbacks ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);

-- === BEHAVIORAL ===
ALTER TABLE public.behavioral_profile ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.behavioral_recovery_actions ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.patient_behavioral_tasks ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);

-- === CLINICAL EXTRAS ===
ALTER TABLE public.patient_clinical_messages ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.patient_supplements ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.patient_lab_results ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.patient_recommendations ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.clinical_action_recommendations ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);

-- === PORTFOLIO & ANALYTICS ===
ALTER TABLE public.clinic_portfolio_state ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.clinic_clinical_evolution_metrics ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.patient_prestige ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.player_stats ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);

-- =============================================
-- SEED: Preencher tenant_id nos registros existentes (batch 2)
-- =============================================
DO $$
DECLARE
  _default_tenant UUID := '20081963-8db9-4a6c-8181-6a820b86e12f';
  _tables TEXT[] := ARRAY[
    'branding_settings', 'professional_profiles', 'intelligence_settings',
    'whatsapp_integrations', 'whatsapp_logs', 'whatsapp_message_logs', 'whatsapp_inbound_messages', 'professional_whatsapp_connections',
    'workout_plans', 'workout_routines', 'workout_completions', 'personal_trainer_students', 'cardio_prescriptions',
    'patient_timeline', 'patient_journey_events', 'timeline_events',
    'ifj_patient_permissions', 'ifj_intent_logs', 'ifj_session_context',
    'patient_documents',
    'organizations', 'organization_members',
    'affiliates',
    'campaigns',
    'lead_requests', 'booking_payments',
    'feedbacks',
    'behavioral_profile', 'behavioral_recovery_actions', 'patient_behavioral_tasks',
    'patient_clinical_messages', 'patient_supplements', 'patient_lab_results', 'patient_recommendations', 'clinical_action_recommendations',
    'clinic_portfolio_state', 'clinic_clinical_evolution_metrics', 'patient_prestige', 'player_stats'
  ];
  _t TEXT;
BEGIN
  FOREACH _t IN ARRAY _tables LOOP
    EXECUTE format('UPDATE public.%I SET tenant_id = %L WHERE tenant_id IS NULL', _t, _default_tenant);
    RAISE NOTICE 'Updated table: %', _t;
  END LOOP;
END
$$;

-- Índices batch 2
CREATE INDEX IF NOT EXISTS idx_branding_settings_tenant ON public.branding_settings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_integrations_tenant ON public.whatsapp_integrations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_workout_plans_tenant ON public.workout_plans(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ifj_patient_permissions_tenant ON public.ifj_patient_permissions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_patient_documents_tenant ON public.patient_documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_organizations_tenant ON public.organizations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_player_stats_tenant ON public.player_stats(tenant_id);
