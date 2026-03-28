
-- =============================================
-- FASE 2 — Batch 1: Tabelas CORE clínicas e operacionais
-- Adiciona tenant_id NULLABLE com FK + DEFAULT do tenant 'default'
-- ZERO impacto em queries existentes
-- =============================================

-- Helper: função que retorna o tenant default do usuário autenticado
CREATE OR REPLACE FUNCTION public.default_tenant_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM public.user_tenants
  WHERE user_id = auth.uid() AND is_active = true
  ORDER BY joined_at ASC
  LIMIT 1
$$;

-- === PACIENTES & VÍNCULOS ===
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.nutritionist_patients ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.patient_professional_links ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);

-- === ANAMNESE & CLINICAL ===
ALTER TABLE public.patient_anamnesis ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.patient_clinical_flags ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.patient_clinical_state ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.clinical_alerts ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.clinical_decisions ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.clinical_daily_snapshots ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);

-- === PLANOS ALIMENTARES ===
ALTER TABLE public.meal_plans ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.meal_plan_items ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.meals ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.meal_item_completions ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.recipes ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);

-- === PROTOCOLOS & PROGRAMAS ===
ALTER TABLE public.nutrition_protocols ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.patient_protocols ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.protocol_tasks ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.programs ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.program_patients ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);

-- === CHECKLIST & ADESÃO ===
ALTER TABLE public.checklist_tasks ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.checklist_daily_summary ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.patient_daily_adherence ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);

-- === CHAT & NOTIFICAÇÕES ===
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);

-- === CONSULTAS ===
ALTER TABLE public.patient_appointments ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);

-- === AUTOMAÇÃO ===
ALTER TABLE public.automation_rules ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.automation_runs ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);

-- === PAGAMENTOS ===
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.financial_transactions ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);

-- === BODY ASSESSMENTS ===
ALTER TABLE public.patient_body_assessments ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.body_analyses ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.body_assessment_photos ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.patient_weight_history ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);

-- === ENGAGEMENT ===
ALTER TABLE public.patient_checkins ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.patient_missions ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.patient_points ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.engagement_signals ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.patient_daily_focus ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);

-- === AUDIT & LOGS ===
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);

-- =============================================
-- SEED: Preencher tenant_id em todos os registros existentes com tenant default
-- =============================================
DO $$
DECLARE
  _default_tenant UUID := '20081963-8db9-4a6c-8181-6a820b86e12f';
  _tables TEXT[] := ARRAY[
    'profiles', 'nutritionist_patients', 'patient_professional_links',
    'patient_anamnesis', 'patient_clinical_flags', 'patient_clinical_state',
    'clinical_alerts', 'clinical_decisions', 'clinical_daily_snapshots',
    'meal_plans', 'meal_plan_items', 'meals', 'meal_item_completions', 'recipes',
    'nutrition_protocols', 'patient_protocols', 'protocol_tasks', 'programs', 'program_patients',
    'checklist_tasks', 'checklist_daily_summary', 'patient_daily_adherence',
    'chat_messages', 'notifications',
    'patient_appointments',
    'automation_rules', 'automation_runs',
    'payments', 'subscriptions', 'financial_transactions',
    'patient_body_assessments', 'body_analyses', 'body_assessment_photos', 'patient_weight_history',
    'patient_checkins', 'patient_missions', 'patient_points', 'engagement_signals', 'patient_daily_focus',
    'audit_logs'
  ];
  _t TEXT;
BEGIN
  FOREACH _t IN ARRAY _tables LOOP
    EXECUTE format('UPDATE public.%I SET tenant_id = %L WHERE tenant_id IS NULL', _t, _default_tenant);
    RAISE NOTICE 'Updated table: %', _t;
  END LOOP;
END
$$;

-- =============================================
-- ÍNDICES para performance em queries futuras com tenant_id
-- =============================================
CREATE INDEX IF NOT EXISTS idx_profiles_tenant ON public.profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_nutritionist_patients_tenant ON public.nutritionist_patients(tenant_id);
CREATE INDEX IF NOT EXISTS idx_meal_plans_tenant ON public.meal_plans(tenant_id);
CREATE INDEX IF NOT EXISTS idx_checklist_tasks_tenant ON public.checklist_tasks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_tenant ON public.chat_messages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_patient_appointments_tenant ON public.patient_appointments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_programs_tenant ON public.programs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_nutrition_protocols_tenant ON public.nutrition_protocols(tenant_id);
CREATE INDEX IF NOT EXISTS idx_clinical_alerts_tenant ON public.clinical_alerts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notifications_tenant ON public.notifications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payments_tenant ON public.payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant ON public.audit_logs(tenant_id);
