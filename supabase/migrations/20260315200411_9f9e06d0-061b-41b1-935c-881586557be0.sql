
-- ============================================
-- FASE 11: Population Clinical Intelligence Engine
-- ============================================

-- 1. Population Cohorts
CREATE TABLE IF NOT EXISTS public.population_cohorts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_key text NOT NULL UNIQUE,
  cohort_signature jsonb NOT NULL DEFAULT '{}',
  patients_count integer DEFAULT 0,
  nutritionist_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.population_cohorts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Nutritionists view own cohorts"
  ON public.population_cohorts FOR SELECT TO authenticated
  USING (nutritionist_id = auth.uid());

-- 2. Cohort Metrics
CREATE TABLE IF NOT EXISTS public.population_cohort_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_id uuid NOT NULL REFERENCES public.population_cohorts(id) ON DELETE CASCADE,
  avg_weight_loss_14d numeric DEFAULT 0,
  avg_weight_loss_30d numeric DEFAULT 0,
  stagnation_rate numeric DEFAULT 0,
  dropout_rate numeric DEFAULT 0,
  avg_adherence numeric DEFAULT 0,
  avg_response_velocity numeric DEFAULT 0,
  metabolic_stability numeric DEFAULT 0,
  avg_performance_score numeric DEFAULT 0,
  engine_version text DEFAULT '1.0.0',
  updated_at timestamptz DEFAULT now(),
  UNIQUE(cohort_id)
);

ALTER TABLE public.population_cohort_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Nutritionists view own cohort metrics"
  ON public.population_cohort_metrics FOR SELECT TO authenticated
  USING (
    cohort_id IN (SELECT id FROM public.population_cohorts WHERE nutritionist_id = auth.uid())
  );

-- 3. Patient Population Benchmark
CREATE TABLE IF NOT EXISTS public.patient_population_benchmark (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  cohort_id uuid REFERENCES public.population_cohorts(id) ON DELETE SET NULL,
  relative_weight_response numeric DEFAULT 0,
  relative_adherence numeric DEFAULT 0,
  relative_performance_score numeric DEFAULT 0,
  benchmark_classification text DEFAULT 'dentro_da_media',
  engine_version text DEFAULT '1.0.0',
  updated_at timestamptz DEFAULT now(),
  UNIQUE(patient_id)
);

ALTER TABLE public.patient_population_benchmark ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Nutritionists view own patient benchmarks"
  ON public.patient_population_benchmark FOR SELECT TO authenticated
  USING (
    patient_id IN (
      SELECT np.patient_id FROM public.nutritionist_patients np
      WHERE np.nutritionist_id = auth.uid() AND np.status = 'active'
    )
    OR patient_id = auth.uid()
  );

-- 4. Population Clinical Insights
CREATE TABLE IF NOT EXISTS public.population_clinical_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nutritionist_id uuid NOT NULL,
  insight_type text NOT NULL,
  insight_scope text DEFAULT 'population',
  insight_description text NOT NULL,
  statistical_confidence text DEFAULT 'medium',
  supporting_data jsonb DEFAULT '{}',
  engine_version text DEFAULT '1.0.0',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.population_clinical_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Nutritionists view own insights"
  ON public.population_clinical_insights FOR SELECT TO authenticated
  USING (nutritionist_id = auth.uid());
