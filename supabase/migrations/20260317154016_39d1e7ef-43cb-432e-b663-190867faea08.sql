
-- =============================================
-- METABOLIC PHASE CALORIC STRATEGY ENGINE
-- =============================================

-- 1. Enum for metabolic phases
CREATE TYPE public.metabolic_phase_type AS ENUM (
  'initial_response',
  'active_loss',
  'slowing_response',
  'plateau_risk',
  'plateau_active',
  'consolidation',
  'recovery',
  'maintenance',
  'recomposition'
);

-- 2. Enum for caloric adjustment types
CREATE TYPE public.caloric_adjustment_type AS ENUM (
  'keep_current',
  'reduce_calories_light',
  'reduce_calories_moderate',
  'increase_calories_gradual',
  'start_diet_break',
  'start_reverse_phase',
  'maintain_and_monitor',
  'switch_template_same_calories',
  'require_manual_review'
);

-- 3. Add phase fields to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS metabolic_phase text DEFAULT 'initial_response',
  ADD COLUMN IF NOT EXISTS metabolic_phase_last_updated_at timestamptz;

-- 4. Phase history table
CREATE TABLE public.metabolic_phase_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  phase_type text NOT NULL,
  previous_phase text,
  strategy_type text NOT NULL DEFAULT 'keep_current',
  calories_before numeric,
  calories_after numeric,
  macro_adjustments jsonb DEFAULT '{}',
  confidence_score numeric DEFAULT 0,
  clinical_reason text,
  trigger_source text DEFAULT 'automatic',
  engine_version text DEFAULT '1.0.0',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.metabolic_phase_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own phase history"
  ON public.metabolic_phase_history FOR SELECT
  USING (patient_id = auth.uid());

CREATE POLICY "Nutritionists can view patient phase history"
  ON public.metabolic_phase_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.nutritionist_patients np
      WHERE np.patient_id = metabolic_phase_history.patient_id
        AND np.nutritionist_id = auth.uid()
        AND np.status = 'active'
    )
  );

CREATE POLICY "Service can insert phase history"
  ON public.metabolic_phase_history FOR INSERT
  WITH CHECK (true);

-- 5. Strategy rules configuration table
CREATE TABLE public.metabolic_phase_strategy_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_type text NOT NULL UNIQUE,
  default_adjustment_type text NOT NULL DEFAULT 'keep_current',
  caloric_adjustment_range jsonb DEFAULT '{"min_percent": -5, "max_percent": 5}',
  protein_priority text DEFAULT 'moderate',
  macro_redistribution jsonb DEFAULT '{}',
  clinical_guidelines text,
  guardrails jsonb DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.metabolic_phase_strategy_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read strategy rules"
  ON public.metabolic_phase_strategy_rules FOR SELECT
  TO authenticated USING (true);

-- 6. Clinical system parameters table
CREATE TABLE public.clinical_system_parameters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parameter_key text NOT NULL UNIQUE,
  parameter_value numeric NOT NULL,
  description text,
  category text DEFAULT 'general',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.clinical_system_parameters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read system parameters"
  ON public.clinical_system_parameters FOR SELECT
  TO authenticated USING (true);

-- 7. Seed strategy rules
INSERT INTO public.metabolic_phase_strategy_rules (phase_type, default_adjustment_type, caloric_adjustment_range, protein_priority, clinical_guidelines) VALUES
  ('initial_response', 'keep_current', '{"min_percent": 0, "max_percent": 0}', 'moderate', 'Manter déficit atual. Foco em consistência. Evitar ajustes agressivos.'),
  ('active_loss', 'keep_current', '{"min_percent": -3, "max_percent": 0}', 'moderate', 'Manutenção do protocolo. Micro ajustes se necessário.'),
  ('slowing_response', 'reduce_calories_light', '{"min_percent": -8, "max_percent": 0}', 'high', 'Avaliar redução leve de calorias. Redistribuição de macros. Aumento de proteína.'),
  ('plateau_risk', 'reduce_calories_light', '{"min_percent": -10, "max_percent": 0}', 'high', 'Preparar intervenção preventiva. Considerar ciclagem calórica ou troca de template.'),
  ('plateau_active', 'start_diet_break', '{"min_percent": -12, "max_percent": 10}', 'high', 'Ativar estratégia de desbloqueio: diet break, refeed ou ajuste calórico. Revisão clínica sugerida.'),
  ('consolidation', 'increase_calories_gradual', '{"min_percent": 0, "max_percent": 10}', 'high', 'Aumento gradual controlado de calorias. Foco em preservação de peso.'),
  ('recovery', 'increase_calories_gradual', '{"min_percent": 5, "max_percent": 15}', 'moderate', 'Estratégia de recuperação metabólica. Subida calórica progressiva. Foco em adesão e energia.'),
  ('maintenance', 'maintain_and_monitor', '{"min_percent": -3, "max_percent": 3}', 'moderate', 'Calorias estabilizadas. Foco em constância.'),
  ('recomposition', 'maintain_and_monitor', '{"min_percent": -5, "max_percent": 3}', 'very_high', 'Alta proteína. Ajustes finos. Leve déficit ou manutenção estratégica.');

-- 8. Seed clinical system parameters
INSERT INTO public.clinical_system_parameters (parameter_key, parameter_value, description, category) VALUES
  ('max_deficit_adjustment_percent', 12, 'Máximo de redução calórica por ajuste (%)', 'caloric_strategy'),
  ('plateau_days_threshold', 21, 'Dias sem perda para considerar platô ativo', 'caloric_strategy'),
  ('consolidation_min_days', 14, 'Dias mínimos em consolidação', 'caloric_strategy'),
  ('reverse_start_threshold', 28, 'Dias mínimos em platô para sugerir reverse', 'caloric_strategy'),
  ('min_adherence_for_auto_adjust', 40, 'Adesão mínima para permitir ajuste automático (%)', 'caloric_strategy'),
  ('min_plan_age_days', 7, 'Idade mínima do plano para permitir ajustes', 'caloric_strategy'),
  ('min_confidence_for_automation', 0.6, 'Confiança mínima para ajustes automáticos', 'caloric_strategy'),
  ('max_caloric_floor_female', 1200, 'Piso calórico feminino (kcal)', 'safety'),
  ('max_caloric_floor_male', 1500, 'Piso calórico masculino (kcal)', 'safety');

-- Index for fast lookups
CREATE INDEX idx_metabolic_phase_history_patient ON public.metabolic_phase_history (patient_id, created_at DESC);
