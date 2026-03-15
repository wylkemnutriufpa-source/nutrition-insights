
-- ═══════════════════════════════════════════
-- PHASE 23: Population Nutrition Intelligence Engine
-- ═══════════════════════════════════════════

-- BLOCO 1: Cohorts Populacionais Nutricionais
CREATE TABLE IF NOT EXISTS public.population_nutrition_cohorts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_slug TEXT NOT NULL UNIQUE,
  cohort_signature JSONB NOT NULL DEFAULT '{}',
  goal_category TEXT,
  caloric_band TEXT,
  metabolic_cluster TEXT,
  adherence_band TEXT,
  bmi_band TEXT,
  sex TEXT,
  age_band TEXT,
  activity_level TEXT,
  patients_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.population_nutrition_cohorts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read nutrition cohorts" ON public.population_nutrition_cohorts FOR SELECT TO authenticated USING (true);

-- BLOCO 2: Métricas Populacionais de Resposta Nutricional
CREATE TABLE IF NOT EXISTS public.population_nutrition_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_id UUID NOT NULL REFERENCES public.population_nutrition_cohorts(id) ON DELETE CASCADE,
  avg_weight_change_14d NUMERIC DEFAULT 0,
  avg_weight_change_30d NUMERIC DEFAULT 0,
  avg_body_fat_change NUMERIC DEFAULT 0,
  avg_adherence NUMERIC DEFAULT 0,
  avg_dropout_rate NUMERIC DEFAULT 0,
  avg_stagnation_rate NUMERIC DEFAULT 0,
  avg_regression_rate NUMERIC DEFAULT 0,
  avg_performance_score NUMERIC DEFAULT 0,
  avg_protocol_success_score NUMERIC DEFAULT 0,
  engine_version TEXT NOT NULL DEFAULT '1.0.0',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(cohort_id)
);

ALTER TABLE public.population_nutrition_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read nutrition metrics" ON public.population_nutrition_metrics FOR SELECT TO authenticated USING (true);

-- BLOCO 3: Matriz Protocolo × Perfil
CREATE TABLE IF NOT EXISTS public.protocol_population_success_matrix (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  protocol_id UUID REFERENCES public.nutrition_protocols(id) ON DELETE CASCADE,
  cohort_id UUID REFERENCES public.population_nutrition_cohorts(id) ON DELETE CASCADE,
  cluster_type TEXT,
  success_rate NUMERIC DEFAULT 0,
  adherence_rate NUMERIC DEFAULT 0,
  stagnation_rate NUMERIC DEFAULT 0,
  dropout_rate NUMERIC DEFAULT 0,
  metabolic_response_score NUMERIC DEFAULT 0,
  evidence_strength TEXT DEFAULT 'low',
  sample_size INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(protocol_id, cohort_id)
);

ALTER TABLE public.protocol_population_success_matrix ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read protocol matrix" ON public.protocol_population_success_matrix FOR SELECT TO authenticated USING (true);

-- BLOCO 4: Padrões Populacionais de Resposta
CREATE TABLE IF NOT EXISTS public.population_response_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_type TEXT NOT NULL,
  pattern_description TEXT NOT NULL,
  supporting_metrics JSONB NOT NULL DEFAULT '{}',
  confidence_score NUMERIC DEFAULT 0,
  affected_cohort TEXT,
  engine_version TEXT NOT NULL DEFAULT '1.0.0',
  nutritionist_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.population_response_patterns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read response patterns" ON public.population_response_patterns FOR SELECT TO authenticated USING (true);

-- BLOCO 5: Benchmark Nutricional Relativo Individual
CREATE TABLE IF NOT EXISTS public.patient_nutrition_benchmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL,
  cohort_id UUID REFERENCES public.population_nutrition_cohorts(id) ON DELETE CASCADE,
  weight_response_percentile NUMERIC DEFAULT 50,
  adherence_percentile NUMERIC DEFAULT 50,
  performance_percentile NUMERIC DEFAULT 50,
  risk_percentile NUMERIC DEFAULT 50,
  benchmark_classification TEXT NOT NULL DEFAULT 'average',
  engine_version TEXT NOT NULL DEFAULT '1.0.0',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(patient_id)
);

ALTER TABLE public.patient_nutrition_benchmarks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read nutrition benchmarks" ON public.patient_nutrition_benchmarks FOR SELECT TO authenticated USING (true);
