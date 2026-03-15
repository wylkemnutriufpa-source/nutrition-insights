
-- ═══════════════════════════════════════════
-- FASE 2: Longitudinal Intelligence Columns
-- ═══════════════════════════════════════════

-- BLOCO 1: Weight trend + Adherence momentum + Engagement index on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS weight_trend_status text DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS weight_velocity_kg_week numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS adherence_momentum text DEFAULT 'stable',
  ADD COLUMN IF NOT EXISTS adherence_score_7d numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS adherence_score_prev_7d numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS engagement_index numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS engagement_level text DEFAULT 'moderate';

-- BLOCO 4: Expand patient_clinical_snapshots
ALTER TABLE public.patient_clinical_snapshots
  ADD COLUMN IF NOT EXISTS weight_velocity numeric,
  ADD COLUMN IF NOT EXISTS weight_trend_status text,
  ADD COLUMN IF NOT EXISTS engagement_index numeric,
  ADD COLUMN IF NOT EXISTS adherence_momentum text,
  ADD COLUMN IF NOT EXISTS engine_version text DEFAULT '1.0.0';

-- Index for longitudinal queries on snapshots
CREATE INDEX IF NOT EXISTS idx_snapshots_patient_date 
  ON public.patient_clinical_snapshots (patient_id, snapshot_date DESC);
