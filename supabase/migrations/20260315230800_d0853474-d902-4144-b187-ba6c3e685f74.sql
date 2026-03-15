
-- ══════════════════════════════════════════════
-- PHASE 22: Digital Twin Metabólico Individual
-- ══════════════════════════════════════════════

-- BLOCO 1: Patient Metabolic Twin
CREATE TABLE public.patient_metabolic_twin (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  metabolic_efficiency_score numeric DEFAULT 50,
  adaptive_resistance_score numeric DEFAULT 50,
  fat_loss_response_index numeric DEFAULT 50,
  lean_mass_preservation_index numeric DEFAULT 50,
  metabolic_flexibility_index numeric DEFAULT 50,
  predicted_plateau_weeks integer DEFAULT 8,
  regain_risk_score numeric DEFAULT 30,
  response_classification text DEFAULT 'adaptive_responder',
  twin_model_version text DEFAULT '1.0.0',
  model_confidence numeric DEFAULT 0,
  model_inputs jsonb DEFAULT '{}',
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(patient_id)
);

ALTER TABLE public.patient_metabolic_twin ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Nutritionists read own patients twin" ON public.patient_metabolic_twin
  FOR SELECT TO authenticated USING (
    patient_id IN (SELECT patient_id FROM public.nutritionist_patients WHERE nutritionist_id = auth.uid() AND status = 'active')
    OR patient_id = auth.uid()
  );

CREATE POLICY "System can manage twin" ON public.patient_metabolic_twin
  FOR ALL TO authenticated USING (
    patient_id IN (SELECT patient_id FROM public.nutritionist_patients WHERE nutritionist_id = auth.uid() AND status = 'active')
  );

-- BLOCO 4: Plateau Predictions
CREATE TABLE public.patient_plateau_predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  predicted_plateau_start_week integer,
  predicted_plateau_intensity text DEFAULT 'moderate',
  preventive_recommendation text,
  prediction_confidence numeric DEFAULT 50,
  prediction_model_version text DEFAULT '1.0.0',
  was_accurate boolean,
  actual_plateau_week integer,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.patient_plateau_predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Nutritionists read own patients plateaus" ON public.patient_plateau_predictions
  FOR SELECT TO authenticated USING (
    patient_id IN (SELECT patient_id FROM public.nutritionist_patients WHERE nutritionist_id = auth.uid() AND status = 'active')
    OR patient_id = auth.uid()
  );

CREATE POLICY "System can manage plateaus" ON public.patient_plateau_predictions
  FOR ALL TO authenticated USING (
    patient_id IN (SELECT patient_id FROM public.nutritionist_patients WHERE nutritionist_id = auth.uid() AND status = 'active')
  );
