
-- ═══════════════════════════════════════════
-- PHASE 7: Clinical Protocol Intelligence Engine v1.0.0
-- ═══════════════════════════════════════════

-- Add effectiveness_tier to protocol_clinical_performance
ALTER TABLE public.protocol_clinical_performance 
  ADD COLUMN IF NOT EXISTS effectiveness_tier text DEFAULT 'performance_estavel',
  ADD COLUMN IF NOT EXISTS avg_weight_response_14d numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS avg_weight_response_30d numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS metabolic_stability numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS alert_rate numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS engine_version text DEFAULT '1.0.0';

-- Cluster × Protocol success matrix
CREATE TABLE IF NOT EXISTS public.cluster_protocol_matrix (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  protocol_id uuid REFERENCES public.nutrition_protocols(id) ON DELETE CASCADE NOT NULL,
  cluster_type text NOT NULL,
  sample_size integer DEFAULT 0,
  avg_adherence numeric DEFAULT 0,
  avg_weight_response numeric DEFAULT 0,
  stagnation_rate numeric DEFAULT 0,
  dropout_rate numeric DEFAULT 0,
  success_score numeric DEFAULT 0,
  effectiveness_tier text DEFAULT 'performance_estavel',
  last_updated timestamptz DEFAULT now(),
  UNIQUE(protocol_id, cluster_type)
);

ALTER TABLE public.cluster_protocol_matrix ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read cluster_protocol_matrix"
  ON public.cluster_protocol_matrix FOR SELECT TO authenticated USING (true);

-- Clinic global evolution metrics
CREATE TABLE IF NOT EXISTS public.clinic_clinical_evolution_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nutritionist_id uuid NOT NULL,
  avg_transformation_velocity numeric DEFAULT 0,
  base_at_risk_percent numeric DEFAULT 0,
  avg_protocol_efficacy numeric DEFAULT 0,
  avg_metabolic_stability numeric DEFAULT 0,
  total_patients_analyzed integer DEFAULT 0,
  total_protocols_analyzed integer DEFAULT 0,
  top_protocol_id uuid REFERENCES public.nutrition_protocols(id),
  top_protocol_name text,
  worst_protocol_id uuid REFERENCES public.nutrition_protocols(id),
  worst_protocol_name text,
  engine_version text DEFAULT '1.0.0',
  computed_at timestamptz DEFAULT now(),
  UNIQUE(nutritionist_id)
);

ALTER TABLE public.clinic_clinical_evolution_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read clinic_clinical_evolution_metrics"
  ON public.clinic_clinical_evolution_metrics FOR SELECT TO authenticated USING (true);

-- Protocol change timeline
CREATE TABLE IF NOT EXISTS public.nutrition_protocol_changed (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  previous_protocol_id uuid REFERENCES public.nutrition_protocols(id),
  new_protocol_id uuid REFERENCES public.nutrition_protocols(id),
  change_reason text,
  metabolic_reason text,
  behavioral_reason text,
  cluster_at_change text,
  adherence_at_change numeric,
  expected_impact text,
  changed_by uuid,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.nutrition_protocol_changed ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read nutrition_protocol_changed"
  ON public.nutrition_protocol_changed FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert nutrition_protocol_changed"
  ON public.nutrition_protocol_changed FOR INSERT TO authenticated WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cluster_protocol_matrix_protocol ON public.cluster_protocol_matrix(protocol_id);
CREATE INDEX IF NOT EXISTS idx_cluster_protocol_matrix_cluster ON public.cluster_protocol_matrix(cluster_type);
CREATE INDEX IF NOT EXISTS idx_nutrition_protocol_changed_patient ON public.nutrition_protocol_changed(patient_id);
CREATE INDEX IF NOT EXISTS idx_clinic_evolution_nutritionist ON public.clinic_clinical_evolution_metrics(nutritionist_id);
