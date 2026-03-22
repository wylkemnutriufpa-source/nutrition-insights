
-- =====================================================
-- BLOCK: Smart Checklist + Clinical Learning Memory + Therapeutic Adjustment History
-- =====================================================

-- 1. Smart Checklist Tasks
CREATE TABLE IF NOT EXISTS public.patient_smart_checklist_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL,
  task_code TEXT NOT NULL,
  task_title TEXT NOT NULL,
  task_description TEXT,
  task_category TEXT NOT NULL DEFAULT 'general',
  clinical_domain TEXT,
  priority_score INT NOT NULL DEFAULT 50,
  generated_from TEXT NOT NULL DEFAULT 'manual',
  valid_from DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_until DATE,
  recurrence_type TEXT NOT NULL DEFAULT 'daily',
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completion_timestamp TIMESTAMPTZ,
  emotional_feedback TEXT,
  adherence_score NUMERIC(5,2),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.patient_smart_checklist_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "patients_own_smart_checklist" ON public.patient_smart_checklist_tasks
  FOR ALL TO authenticated
  USING (patient_id = auth.uid())
  WITH CHECK (patient_id = auth.uid());

CREATE INDEX idx_smart_checklist_patient_date ON public.patient_smart_checklist_tasks(patient_id, valid_from, is_active);

-- 2. Clinical Learning Memory
CREATE TABLE IF NOT EXISTS public.patient_clinical_learning_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL,
  learning_type TEXT NOT NULL,
  learned_pattern_code TEXT NOT NULL,
  learned_pattern_description TEXT,
  confidence_score NUMERIC(5,2) NOT NULL DEFAULT 50,
  first_detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_reinforced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reinforcement_count INT NOT NULL DEFAULT 1,
  outcome_impact_score NUMERIC(5,2),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.patient_clinical_learning_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "patients_own_learning_memory" ON public.patient_clinical_learning_memory
  FOR SELECT TO authenticated
  USING (patient_id = auth.uid());

CREATE POLICY "service_manage_learning" ON public.patient_clinical_learning_memory
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE INDEX idx_learning_memory_patient ON public.patient_clinical_learning_memory(patient_id, active);

-- 3. Clinical Population Patterns
CREATE TABLE IF NOT EXISTS public.clinical_population_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_type TEXT NOT NULL,
  pattern_key TEXT NOT NULL,
  pattern_description TEXT,
  sample_size INT NOT NULL DEFAULT 0,
  avg_response_score NUMERIC(5,2),
  success_rate NUMERIC(5,2),
  confidence_level TEXT DEFAULT 'low',
  metadata JSONB DEFAULT '{}',
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(pattern_type, pattern_key)
);

ALTER TABLE public.clinical_population_patterns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_read_patterns" ON public.clinical_population_patterns
  FOR SELECT TO authenticated USING (true);

-- 4. Therapeutic Adjustment History
CREATE TABLE IF NOT EXISTS public.therapeutic_adjustment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL,
  flag_origin TEXT,
  adjustment_type TEXT NOT NULL,
  adjustment_description TEXT,
  before_snapshot JSONB,
  after_snapshot JSONB,
  clinical_response_7d JSONB,
  response_score NUMERIC(5,2),
  applied_by TEXT,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.therapeutic_adjustment_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_manage_adjustment_history" ON public.therapeutic_adjustment_history
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE INDEX idx_adj_history_patient ON public.therapeutic_adjustment_history(patient_id, applied_at DESC);
