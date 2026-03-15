
-- ═══════════════════════════════════════════
-- Phase 18: Semi-Autonomous Clinical Orchestration
-- ═══════════════════════════════════════════

-- 1. Patient Therapeutic Priority State (enhanced from clinical priority)
CREATE TABLE IF NOT EXISTS public.patient_therapeutic_priority_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  nutritionist_id uuid NOT NULL,
  therapeutic_priority_score numeric DEFAULT 0,
  priority_classification text DEFAULT 'monitoramento',
  clinical_risk_component numeric DEFAULT 0,
  dropout_risk_component numeric DEFAULT 0,
  regression_risk_component numeric DEFAULT 0,
  performance_component numeric DEFAULT 0,
  time_since_intervention_component numeric DEFAULT 0,
  cluster_behavior_component numeric DEFAULT 0,
  physiological_component numeric DEFAULT 0,
  main_driver text,
  recommended_clinical_action text DEFAULT 'monitor_without_change',
  action_urgency text DEFAULT 'low',
  action_expected_impact text,
  action_clinical_driver text,
  action_group text DEFAULT 'monitoramento_leve',
  engine_version text DEFAULT '1.0.0',
  last_calculated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(patient_id, nutritionist_id)
);

ALTER TABLE public.patient_therapeutic_priority_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Professionals see own patients therapeutic priority"
  ON public.patient_therapeutic_priority_state FOR SELECT TO authenticated
  USING (nutritionist_id = auth.uid());

-- 2. Organization Action Groups Snapshot
CREATE TABLE IF NOT EXISTS public.organization_action_groups_snapshot (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid,
  nutritionist_id uuid NOT NULL,
  snapshot_date date DEFAULT CURRENT_DATE,
  group_type text NOT NULL,
  patients_count integer DEFAULT 0,
  avg_risk numeric DEFAULT 0,
  avg_priority numeric DEFAULT 0,
  patient_ids jsonb DEFAULT '[]'::jsonb,
  engine_version text DEFAULT '1.0.0',
  created_at timestamptz DEFAULT now(),
  UNIQUE(nutritionist_id, snapshot_date, group_type)
);

ALTER TABLE public.organization_action_groups_snapshot ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Professionals see own action groups"
  ON public.organization_action_groups_snapshot FOR SELECT TO authenticated
  USING (nutritionist_id = auth.uid());
