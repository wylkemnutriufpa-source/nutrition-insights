
-- Phase 17: Executive Command & Operations Intelligence Engine

-- 1. Organization Operational Snapshots
CREATE TABLE IF NOT EXISTS public.organization_operational_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  snapshot_date date NOT NULL DEFAULT CURRENT_DATE,
  active_patients integer DEFAULT 0,
  high_risk_patients integer DEFAULT 0,
  average_adherence numeric DEFAULT 0,
  average_performance_score numeric DEFAULT 0,
  dropout_rate_30d numeric DEFAULT 0,
  stagnation_rate_30d numeric DEFAULT 0,
  clinical_intervention_rate numeric DEFAULT 0,
  protocol_adjustment_rate numeric DEFAULT 0,
  avg_time_between_interventions numeric DEFAULT 0,
  clinical_efficiency_index numeric DEFAULT 0,
  portfolio_stability_index numeric DEFAULT 0,
  intervention_load_level text DEFAULT 'low',
  predicted_portfolio_growth_rate numeric DEFAULT 0,
  predicted_portfolio_contraction_rate numeric DEFAULT 0,
  avg_patient_ltv_estimate numeric DEFAULT 0,
  engine_version text DEFAULT '1.0.0',
  created_at timestamptz DEFAULT now(),
  UNIQUE(organization_id, snapshot_date)
);

ALTER TABLE public.organization_operational_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage operational snapshots"
  ON public.organization_operational_snapshots FOR ALL
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Org members can view operational snapshots"
  ON public.organization_operational_snapshots FOR SELECT
  TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

-- 2. Professional Operational Metrics
CREATE TABLE IF NOT EXISTS public.professional_operational_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid NOT NULL,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  active_patients integer DEFAULT 0,
  avg_patient_performance numeric DEFAULT 0,
  avg_patient_risk numeric DEFAULT 0,
  intervention_frequency numeric DEFAULT 0,
  dropout_rate numeric DEFAULT 0,
  adherence_mean numeric DEFAULT 0,
  clinical_efficiency_score numeric DEFAULT 0,
  portfolio_stability_score numeric DEFAULT 0,
  patient_ltv_estimate numeric DEFAULT 0,
  rank_position integer DEFAULT 0,
  engine_version text DEFAULT '1.0.0',
  computed_at timestamptz DEFAULT now(),
  UNIQUE(professional_id)
);

ALTER TABLE public.professional_operational_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage professional metrics"
  ON public.professional_operational_metrics FOR ALL
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Org members can view professional metrics"
  ON public.professional_operational_metrics FOR SELECT
  TO authenticated
  USING (
    professional_id = auth.uid()
    OR (organization_id IS NOT NULL AND public.is_org_member(auth.uid(), organization_id))
  );

-- 3. Organization Operational Alerts
CREATE TABLE IF NOT EXISTS public.organization_operational_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  alert_type text NOT NULL,
  severity text DEFAULT 'medium',
  title text NOT NULL,
  description text,
  metadata jsonb DEFAULT '{}',
  is_active boolean DEFAULT true,
  resolved_at timestamptz,
  resolved_by uuid,
  detected_at timestamptz DEFAULT now()
);

ALTER TABLE public.organization_operational_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage operational alerts"
  ON public.organization_operational_alerts FOR ALL
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Org members can view operational alerts"
  ON public.organization_operational_alerts FOR SELECT
  TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

-- 4. Organization Recommended Actions
CREATE TABLE IF NOT EXISTS public.organization_recommended_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  priority integer DEFAULT 5,
  title text NOT NULL,
  description text,
  rationale text,
  expected_impact text,
  status text DEFAULT 'pending',
  acted_at timestamptz,
  acted_by uuid,
  engine_version text DEFAULT '1.0.0',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.organization_recommended_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage recommended actions"
  ON public.organization_recommended_actions FOR ALL
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Org members can view recommended actions"
  ON public.organization_recommended_actions FOR SELECT
  TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));
