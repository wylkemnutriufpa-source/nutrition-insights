
-- ═══════════════════════════════════════════
-- PHASE 21: Weight Trajectory Engine
-- ═══════════════════════════════════════════

-- 1. Patient Weight History (longitudinal records)
CREATE TABLE IF NOT EXISTS public.patient_weight_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL,
  weight NUMERIC(5,2) NOT NULL,
  body_fat_percentage NUMERIC(5,2),
  waist_circumference NUMERIC(5,1),
  measurement_source TEXT NOT NULL DEFAULT 'manual_entry',
  measurement_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.patient_weight_history ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_pwh_patient_date ON public.patient_weight_history(patient_id, measurement_date);

CREATE POLICY "Service role full access on patient_weight_history"
  ON public.patient_weight_history FOR ALL
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Users can read own weight history"
  ON public.patient_weight_history FOR SELECT
  TO authenticated USING (patient_id = auth.uid());

CREATE POLICY "Nutritionists can read patient weight history"
  ON public.patient_weight_history FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.nutritionist_patients np WHERE np.patient_id = patient_weight_history.patient_id AND np.nutritionist_id = auth.uid() AND np.status = 'active')
  );

-- 2. Patient Weight Dynamics (computed summary)
CREATE TABLE IF NOT EXISTS public.patient_weight_dynamics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL UNIQUE,
  avg_weekly_weight_change NUMERIC(5,3) DEFAULT 0,
  historical_response_pattern TEXT DEFAULT 'unknown',
  volatility_score NUMERIC(5,2) DEFAULT 0,
  detected_plateaus INTEGER DEFAULT 0,
  metabolic_response_classification TEXT DEFAULT 'unknown',
  total_data_points INTEGER DEFAULT 0,
  first_measurement_date DATE,
  last_measurement_date DATE,
  total_weight_change NUMERIC(6,2) DEFAULT 0,
  best_weekly_loss NUMERIC(5,3) DEFAULT 0,
  worst_weekly_gain NUMERIC(5,3) DEFAULT 0,
  engine_version TEXT DEFAULT '1.0.0',
  computed_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.patient_weight_dynamics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on patient_weight_dynamics"
  ON public.patient_weight_dynamics FOR ALL
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Users can read own weight dynamics"
  ON public.patient_weight_dynamics FOR SELECT
  TO authenticated USING (patient_id = auth.uid());

CREATE POLICY "Nutritionists can read patient weight dynamics"
  ON public.patient_weight_dynamics FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.nutritionist_patients np WHERE np.patient_id = patient_weight_dynamics.patient_id AND np.nutritionist_id = auth.uid() AND np.status = 'active')
  );

-- 3. Patient Weight Projection (future forecasts)
CREATE TABLE IF NOT EXISTS public.patient_weight_projection (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL,
  projection_date DATE NOT NULL,
  projected_weight NUMERIC(5,2),
  projected_body_fat NUMERIC(5,2),
  projected_risk_level TEXT DEFAULT 'low',
  projection_confidence NUMERIC(5,2) DEFAULT 0,
  projection_model_version TEXT DEFAULT '1.0.0',
  horizon_weeks INTEGER DEFAULT 4,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.patient_weight_projection ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_pwp_patient ON public.patient_weight_projection(patient_id, created_at DESC);

CREATE POLICY "Service role full access on patient_weight_projection"
  ON public.patient_weight_projection FOR ALL
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Users can read own weight projections"
  ON public.patient_weight_projection FOR SELECT
  TO authenticated USING (patient_id = auth.uid());

CREATE POLICY "Nutritionists can read patient weight projections"
  ON public.patient_weight_projection FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.nutritionist_patients np WHERE np.patient_id = patient_weight_projection.patient_id AND np.nutritionist_id = auth.uid() AND np.status = 'active')
  );

-- 4. Patient Body Projection States (composition estimates)
CREATE TABLE IF NOT EXISTS public.patient_body_projection_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL,
  projection_date DATE NOT NULL,
  estimated_body_fat NUMERIC(5,2),
  estimated_lean_mass NUMERIC(5,2),
  silhouette_classification TEXT DEFAULT 'moderate_adiposity',
  projection_confidence NUMERIC(5,2) DEFAULT 0,
  engine_version TEXT DEFAULT '1.0.0',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.patient_body_projection_states ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_pbps_patient ON public.patient_body_projection_states(patient_id, created_at DESC);

CREATE POLICY "Service role full access on patient_body_projection_states"
  ON public.patient_body_projection_states FOR ALL
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Users can read own body projections"
  ON public.patient_body_projection_states FOR SELECT
  TO authenticated USING (patient_id = auth.uid());

CREATE POLICY "Nutritionists can read patient body projections"
  ON public.patient_body_projection_states FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.nutritionist_patients np WHERE np.patient_id = patient_body_projection_states.patient_id AND np.nutritionist_id = auth.uid() AND np.status = 'active')
  );
