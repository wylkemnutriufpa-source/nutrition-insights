
-- ============================================
-- FASE 10: Human Performance Intelligence Engine
-- Tables: patient_human_performance_state, patient_performance_snapshots
-- ============================================

-- 1. Performance State (current state per patient)
CREATE TABLE IF NOT EXISTS public.patient_human_performance_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  nutrition_score numeric DEFAULT 0,
  recovery_score numeric DEFAULT 0,
  training_score numeric DEFAULT 0,
  consistency_score numeric DEFAULT 0,
  metabolic_score numeric DEFAULT 0,
  stress_load_score numeric DEFAULT 0,
  overall_performance_score numeric DEFAULT 0,
  performance_level text DEFAULT 'unstable',
  performance_profile text DEFAULT 'inconsistent_responder',
  recommended_focus text DEFAULT 'hold_strategy_and_monitor',
  engine_version text DEFAULT '1.0.0',
  metadata jsonb DEFAULT '{}',
  updated_at timestamptz DEFAULT now(),
  UNIQUE(patient_id)
);

ALTER TABLE public.patient_human_performance_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Nutritionists view own patients performance"
  ON public.patient_human_performance_state FOR SELECT TO authenticated
  USING (
    patient_id IN (
      SELECT np.patient_id FROM public.nutritionist_patients np
      WHERE np.nutritionist_id = auth.uid() AND np.status = 'active'
    )
    OR patient_id = auth.uid()
  );

CREATE POLICY "System can upsert performance state"
  ON public.patient_human_performance_state FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- 2. Performance Snapshots (daily history)
CREATE TABLE IF NOT EXISTS public.patient_performance_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  snapshot_date date NOT NULL DEFAULT CURRENT_DATE,
  nutrition_score numeric DEFAULT 0,
  recovery_score numeric DEFAULT 0,
  training_score numeric DEFAULT 0,
  consistency_score numeric DEFAULT 0,
  metabolic_score numeric DEFAULT 0,
  stress_load_score numeric DEFAULT 0,
  overall_performance_score numeric DEFAULT 0,
  performance_level text DEFAULT 'unstable',
  performance_profile text DEFAULT 'inconsistent_responder',
  engine_version text DEFAULT '1.0.0',
  created_at timestamptz DEFAULT now(),
  UNIQUE(patient_id, snapshot_date)
);

ALTER TABLE public.patient_performance_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Nutritionists view own patients snapshots"
  ON public.patient_performance_snapshots FOR SELECT TO authenticated
  USING (
    patient_id IN (
      SELECT np.patient_id FROM public.nutritionist_patients np
      WHERE np.nutritionist_id = auth.uid() AND np.status = 'active'
    )
    OR patient_id = auth.uid()
  );

CREATE POLICY "System can insert snapshots"
  ON public.patient_performance_snapshots FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "System can update snapshots"
  ON public.patient_performance_snapshots FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);
