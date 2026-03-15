
-- Phase 4: Metabolic Strategy Cluster Engine
-- Add cluster fields to patient_clinical_state

ALTER TABLE public.patient_clinical_state
ADD COLUMN IF NOT EXISTS metabolic_cluster text DEFAULT 'unknown',
ADD COLUMN IF NOT EXISTS metabolic_cluster_confidence text DEFAULT 'low',
ADD COLUMN IF NOT EXISTS metabolic_feature_vector jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS cluster_strategy jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS cluster_changed_at timestamptz,
ADD COLUMN IF NOT EXISTS cluster_engine_version text DEFAULT '1.0.0',
ADD COLUMN IF NOT EXISTS cluster_data_points integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS cluster_min_days_met boolean DEFAULT false;

-- Add cluster to snapshots for historical tracking
ALTER TABLE public.patient_clinical_snapshots
ADD COLUMN IF NOT EXISTS metabolic_cluster text,
ADD COLUMN IF NOT EXISTS cluster_confidence text;

-- Create index for cluster-based queries
CREATE INDEX IF NOT EXISTS idx_patient_clinical_state_cluster 
ON public.patient_clinical_state(metabolic_cluster);
