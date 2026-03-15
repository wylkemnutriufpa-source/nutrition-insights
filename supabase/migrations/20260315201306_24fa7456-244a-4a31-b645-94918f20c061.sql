
-- ═══════════════════════════════════════════════════════════
-- FASE 12: Enterprise Multi-Clinic Architecture
-- ═══════════════════════════════════════════════════════════

-- BLOCO 1: Organizations
CREATE TABLE IF NOT EXISTS public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  brand_name text,
  brand_colors jsonb DEFAULT '{}',
  logo_url text,
  timezone text DEFAULT 'America/Sao_Paulo',
  country text DEFAULT 'BR',
  subscription_plan text DEFAULT 'starter_clinic',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- BLOCO 2: Organization Members
CREATE TABLE IF NOT EXISTS public.organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'nutritionist',
  invited_at timestamptz DEFAULT now(),
  joined_at timestamptz,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX IF NOT EXISTS idx_org_members_unique ON public.organization_members(organization_id, user_id);

-- BLOCO 4: Organization Brand Settings (White-Label)
CREATE TABLE IF NOT EXISTS public.organization_brand_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL UNIQUE,
  primary_color text DEFAULT '#10b981',
  secondary_color text DEFAULT '#059669',
  accent_color text DEFAULT '#f59e0b',
  logo_url text,
  font_family text DEFAULT 'Inter',
  login_background text,
  app_name text,
  email_signature text,
  onboarding_copy jsonb DEFAULT '{}',
  custom_css text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.organization_brand_settings ENABLE ROW LEVEL SECURITY;

-- BLOCO 5: Clinical Methodologies
CREATE TABLE IF NOT EXISTS public.clinical_methodologies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  protocol_rules jsonb DEFAULT '{}',
  scoring_weights jsonb DEFAULT '{"nutrition": 0.25, "recovery": 0.15, "training": 0.15, "consistency": 0.15, "metabolic": 0.20, "stress": 0.10}',
  alert_thresholds jsonb DEFAULT '{"stagnation_days": 14, "abandonment_days": 7, "caloric_excess_percent": 20}',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.clinical_methodologies ENABLE ROW LEVEL SECURITY;

-- BLOCO 6: Organization Engine Config
CREATE TABLE IF NOT EXISTS public.organization_engine_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL UNIQUE,
  adherence_threshold numeric DEFAULT 70,
  stagnation_days integer DEFAULT 14,
  caloric_excess_threshold numeric DEFAULT 20,
  abandonment_days integer DEFAULT 7,
  performance_weights jsonb DEFAULT '{"nutrition": 0.25, "recovery": 0.15, "training": 0.15, "consistency": 0.15, "metabolic": 0.20, "stress": 0.10}',
  cluster_rules jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.organization_engine_config ENABLE ROW LEVEL SECURITY;

-- BLOCO 8: Organization Subscriptions
CREATE TABLE IF NOT EXISTS public.organization_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL UNIQUE,
  plan text DEFAULT 'starter_clinic',
  max_patients integer DEFAULT 50,
  max_professionals integer DEFAULT 3,
  ai_features_enabled boolean DEFAULT false,
  billing_cycle text DEFAULT 'monthly',
  status text DEFAULT 'active',
  stripe_subscription_id text,
  current_period_end timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.organization_subscriptions ENABLE ROW LEVEL SECURITY;

-- BLOCO 9: Organization Regional Settings
CREATE TABLE IF NOT EXISTS public.organization_regional_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL UNIQUE,
  timezone text DEFAULT 'America/Sao_Paulo',
  locale text DEFAULT 'pt-BR',
  measurement_system text DEFAULT 'metric',
  currency text DEFAULT 'BRL',
  nutritional_guidelines text DEFAULT 'brazilian',
  date_format text DEFAULT 'DD/MM/YYYY',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.organization_regional_settings ENABLE ROW LEVEL SECURITY;

-- BLOCO 10: Clinical Audit Logs (Enterprise)
CREATE TABLE IF NOT EXISTS public.clinical_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  patient_id uuid,
  action_type text NOT NULL,
  action_metadata jsonb DEFAULT '{}',
  created_by uuid,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.clinical_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_clinical_audit_org ON public.clinical_audit_logs(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_clinical_audit_patient ON public.clinical_audit_logs(patient_id, created_at DESC);

-- Organization Metrics Cache
CREATE TABLE IF NOT EXISTS public.organization_metrics_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL UNIQUE,
  total_patients integer DEFAULT 0,
  active_patients integer DEFAULT 0,
  total_professionals integer DEFAULT 0,
  avg_adherence numeric DEFAULT 0,
  avg_performance_score numeric DEFAULT 0,
  dropout_rate numeric DEFAULT 0,
  avg_plan_efficacy numeric DEFAULT 0,
  patients_at_risk_percent numeric DEFAULT 0,
  portfolio_classification text DEFAULT 'stable',
  top_protocol_name text,
  new_patients_30d integer DEFAULT 0,
  retention_rate numeric DEFAULT 0,
  engine_version text DEFAULT '1.0.0',
  computed_at timestamptz DEFAULT now()
);

ALTER TABLE public.organization_metrics_cache ENABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════════════
-- SECURITY DEFINER: Check org membership
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.is_org_member(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE user_id = _user_id AND organization_id = _org_id AND status = 'active'
  )
$$;

CREATE OR REPLACE FUNCTION public.is_org_owner(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE user_id = _user_id AND organization_id = _org_id AND role = 'owner' AND status = 'active'
  )
$$;

CREATE OR REPLACE FUNCTION public.get_user_org_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM public.organization_members
  WHERE user_id = _user_id AND status = 'active'
  ORDER BY joined_at ASC NULLS LAST
  LIMIT 1
$$;

-- ═══════════════════════════════════════════════════════════
-- RLS POLICIES
-- ═══════════════════════════════════════════════════════════

-- Organizations: members can view their org, admins see all
CREATE POLICY "Members can view own org" ON public.organizations
  FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), id) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Owners can update org" ON public.organizations
  FOR UPDATE TO authenticated
  USING (public.is_org_owner(auth.uid(), id) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert orgs" ON public.organizations
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR true);

-- Organization Members
CREATE POLICY "Members can view own org members" ON public.organization_members
  FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Owners can manage members" ON public.organization_members
  FOR ALL TO authenticated
  USING (public.is_org_owner(auth.uid(), organization_id) OR public.has_role(auth.uid(), 'admin'));

-- Brand Settings
CREATE POLICY "Members can view brand" ON public.organization_brand_settings
  FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Owners can manage brand" ON public.organization_brand_settings
  FOR ALL TO authenticated
  USING (public.is_org_owner(auth.uid(), organization_id) OR public.has_role(auth.uid(), 'admin'));

-- Clinical Methodologies
CREATE POLICY "Members can view methodologies" ON public.clinical_methodologies
  FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Owners can manage methodologies" ON public.clinical_methodologies
  FOR ALL TO authenticated
  USING (public.is_org_owner(auth.uid(), organization_id) OR public.has_role(auth.uid(), 'admin'));

-- Engine Config
CREATE POLICY "Members can view engine config" ON public.organization_engine_config
  FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Owners can manage engine config" ON public.organization_engine_config
  FOR ALL TO authenticated
  USING (public.is_org_owner(auth.uid(), organization_id) OR public.has_role(auth.uid(), 'admin'));

-- Subscriptions
CREATE POLICY "Members can view subscription" ON public.organization_subscriptions
  FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage subscriptions" ON public.organization_subscriptions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Regional Settings
CREATE POLICY "Members can view regional" ON public.organization_regional_settings
  FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Owners can manage regional" ON public.organization_regional_settings
  FOR ALL TO authenticated
  USING (public.is_org_owner(auth.uid(), organization_id) OR public.has_role(auth.uid(), 'admin'));

-- Clinical Audit Logs
CREATE POLICY "Members can view audit logs" ON public.clinical_audit_logs
  FOR SELECT TO authenticated
  USING (
    (organization_id IS NOT NULL AND public.is_org_member(auth.uid(), organization_id))
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Authenticated can insert audit" ON public.clinical_audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Organization Metrics Cache
CREATE POLICY "Members can view metrics" ON public.organization_metrics_cache
  FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can manage metrics" ON public.organization_metrics_cache
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.is_org_owner(auth.uid(), organization_id));

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.organization_metrics_cache;
