
-- =============================================
-- BLOCK 1: Nutrition Search Index
-- =============================================
CREATE TABLE IF NOT EXISTS public.nutrition_search_index (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL, -- 'recipe', 'meal_library', 'meal_plan_template', 'caloric_template'
  entity_id UUID NOT NULL,
  title TEXT NOT NULL,
  keywords TEXT DEFAULT '',
  clinical_tags TEXT DEFAULT '',
  goal_tags TEXT DEFAULT '',
  strategy_tags TEXT DEFAULT '',
  extra_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(entity_type, entity_id)
);

-- GIN index for full-text search
CREATE INDEX IF NOT EXISTS idx_nutrition_search_tsvector 
ON public.nutrition_search_index 
USING GIN (to_tsvector('portuguese', coalesce(title,'') || ' ' || coalesce(keywords,'') || ' ' || coalesce(clinical_tags,'') || ' ' || coalesce(goal_tags,'') || ' ' || coalesce(strategy_tags,'')));

-- Trigram index for fuzzy search
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_nutrition_search_title_trgm 
ON public.nutrition_search_index USING GIN (title gin_trgm_ops);

-- RLS
ALTER TABLE public.nutrition_search_index ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated can read search index"
ON public.nutrition_search_index FOR SELECT TO authenticated USING (true);

-- =============================================
-- BLOCK 2: Patient Daily Focus
-- =============================================
CREATE TABLE IF NOT EXISTS public.patient_daily_focus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL,
  focus_type TEXT NOT NULL, -- meal, hydration, behavioral, clinical_alert, progress, motivation
  focus_priority INT DEFAULT 50,
  focus_title TEXT NOT NULL,
  focus_description TEXT DEFAULT '',
  focus_action_label TEXT DEFAULT '',
  focus_action_route TEXT DEFAULT '',
  focus_reference_id UUID,
  focus_color TEXT DEFAULT 'primary',
  generated_at TIMESTAMPTZ DEFAULT now(),
  valid_until TIMESTAMPTZ DEFAULT (now() + interval '1 day'),
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ
);

ALTER TABLE public.patient_daily_focus ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Patients see own focus"
ON public.patient_daily_focus FOR SELECT TO authenticated
USING (patient_id = auth.uid());

CREATE POLICY "System can manage focus"
ON public.patient_daily_focus FOR ALL TO authenticated
USING (patient_id = auth.uid());

-- =============================================
-- BLOCK 3: Patient Behavior Memory
-- =============================================
CREATE TABLE IF NOT EXISTS public.patient_behavior_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL,
  behavior_key TEXT NOT NULL,
  last_occurrence TIMESTAMPTZ,
  frequency_score NUMERIC(5,2) DEFAULT 0,
  adherence_score NUMERIC(5,2) DEFAULT 0,
  clinical_relevance_score NUMERIC(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(patient_id, behavior_key)
);

ALTER TABLE public.patient_behavior_memory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Patients see own behavior memory"
ON public.patient_behavior_memory FOR SELECT TO authenticated
USING (patient_id = auth.uid());

-- =============================================
-- BLOCK 4: Lab Results & Rules
-- =============================================
CREATE TABLE IF NOT EXISTS public.patient_lab_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL,
  exam_date DATE NOT NULL DEFAULT CURRENT_DATE,
  raw_text TEXT,
  structured_json JSONB DEFAULT '{}',
  interpreted_flags_json JSONB DEFAULT '[]',
  source_file_url TEXT,
  source_file_name TEXT,
  status TEXT DEFAULT 'pending', -- pending, processed, reviewed
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.patient_lab_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Patients see own lab results"
ON public.patient_lab_results FOR SELECT TO authenticated
USING (patient_id = auth.uid());
CREATE POLICY "Professionals manage lab results"
ON public.patient_lab_results FOR ALL TO authenticated
USING (true);

CREATE TABLE IF NOT EXISTS public.lab_marker_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  marker_key TEXT NOT NULL,
  marker_name TEXT NOT NULL,
  operator TEXT NOT NULL DEFAULT 'gt', -- gt, lt, gte, lte, eq, between
  threshold_value NUMERIC,
  threshold_max NUMERIC, -- for 'between' operator
  gender_filter TEXT, -- 'male', 'female', null=both
  generated_flag TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'metabolico',
  severity TEXT NOT NULL DEFAULT 'moderada',
  suggested_strategy TEXT DEFAULT '',
  clinical_note TEXT DEFAULT '',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.lab_marker_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read lab rules"
ON public.lab_marker_rules FOR SELECT TO authenticated USING (true);

-- =============================================
-- BLOCK 5: Body Assessments
-- =============================================
CREATE TABLE IF NOT EXISTS public.patient_body_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL,
  assessment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  source_file_url TEXT,
  source_file_name TEXT,
  raw_text TEXT,
  weight_kg NUMERIC(6,2),
  height_m NUMERIC(4,2),
  bmi NUMERIC(5,2),
  body_fat_percent NUMERIC(5,2),
  lean_mass_kg NUMERIC(6,2),
  fat_mass_kg NUMERIC(6,2),
  waist_cm NUMERIC(6,2),
  hip_cm NUMERIC(6,2),
  abdomen_cm NUMERIC(6,2),
  chest_cm NUMERIC(6,2),
  arm_cm NUMERIC(6,2),
  thigh_cm NUMERIC(6,2),
  calf_cm NUMERIC(6,2),
  waist_hip_ratio NUMERIC(5,2),
  visceral_fat_level NUMERIC(5,2),
  metabolic_age NUMERIC(5,2),
  hydration_percent NUMERIC(5,2),
  bone_mass_kg NUMERIC(5,2),
  notes TEXT,
  extraction_status TEXT DEFAULT 'pending',
  parser_version TEXT DEFAULT '1.0',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.patient_body_assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Patients see own body assessments"
ON public.patient_body_assessments FOR SELECT TO authenticated
USING (patient_id = auth.uid());
CREATE POLICY "Professionals manage body assessments"
ON public.patient_body_assessments FOR ALL TO authenticated
USING (true);

CREATE TABLE IF NOT EXISTS public.patient_skinfold_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  body_assessment_id UUID REFERENCES public.patient_body_assessments(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL,
  triceps_mm NUMERIC(5,2),
  biceps_mm NUMERIC(5,2),
  subscapular_mm NUMERIC(5,2),
  suprailiac_mm NUMERIC(5,2),
  abdominal_mm NUMERIC(5,2),
  thigh_mm NUMERIC(5,2),
  chest_mm NUMERIC(5,2),
  axillary_mm NUMERIC(5,2),
  calculated_body_fat_percent NUMERIC(5,2),
  protocol_used TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.patient_skinfold_assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Patients see own skinfolds"
ON public.patient_skinfold_assessments FOR SELECT TO authenticated
USING (patient_id = auth.uid());
CREATE POLICY "Professionals manage skinfolds"
ON public.patient_skinfold_assessments FOR ALL TO authenticated
USING (true);

CREATE TABLE IF NOT EXISTS public.body_assessment_extraction_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL,
  file_name TEXT,
  extraction_status TEXT DEFAULT 'pending',
  parser_version TEXT DEFAULT '1.0',
  fields_detected_json JSONB DEFAULT '{}',
  warnings_json JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.body_assessment_extraction_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Professionals read extraction logs"
ON public.body_assessment_extraction_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "System manage extraction logs"
ON public.body_assessment_extraction_logs FOR ALL TO authenticated USING (true);

-- =============================================
-- Populate nutrition_search_index from meal_library
-- =============================================
INSERT INTO public.nutrition_search_index (entity_type, entity_id, title, keywords, clinical_tags, goal_tags)
SELECT 'meal_library', id, title, 
  coalesce(meal_type, ''),
  coalesce(clinical_tags::text, ''),
  coalesce(goal_tag, '')
FROM public.meal_library
WHERE is_active = true
ON CONFLICT (entity_type, entity_id) DO NOTHING;

-- Populate from recipes
INSERT INTO public.nutrition_search_index (entity_type, entity_id, title, keywords, clinical_tags, goal_tags)
SELECT 'recipe', id, title,
  coalesce(category, '') || ' ' || coalesce(tags::text, ''),
  coalesce(tags::text, ''),
  coalesce(category, '')
FROM public.recipes
ON CONFLICT (entity_type, entity_id) DO NOTHING;

-- =============================================
-- Seed 40+ lab marker rules
-- =============================================
INSERT INTO public.lab_marker_rules (marker_key, marker_name, operator, threshold_value, gender_filter, generated_flag, category, severity, suggested_strategy, clinical_note) VALUES
('vitamin_d', 'Vitamina D', 'lt', 30, null, 'low_vitamin_d', 'micronutrientes', 'moderada', 'anti_inflamatoria,exposicao_solar,suplementacao', 'Nível insuficiente de vitamina D'),
('vitamin_d', 'Vitamina D', 'lt', 20, null, 'deficiency_vitamin_d', 'micronutrientes', 'alta', 'suplementacao_urgente', 'Deficiência severa de vitamina D'),
('ferritin', 'Ferritina', 'lt', 40, 'female', 'low_iron_reserve_female', 'micronutrientes', 'moderada', 'aumento_ferro,vitamina_c', 'Reserva baixa de ferro'),
('ferritin', 'Ferritina', 'lt', 30, 'male', 'low_iron_reserve_male', 'micronutrientes', 'moderada', 'aumento_ferro,vitamina_c', 'Reserva baixa de ferro'),
('hemoglobin', 'Hemoglobina', 'lt', 12, 'female', 'anemia_risk_female', 'metabolico', 'alta', 'aumento_ferro,avaliacao_medica', 'Risco de anemia'),
('hemoglobin', 'Hemoglobina', 'lt', 13, 'male', 'anemia_risk_male', 'metabolico', 'alta', 'aumento_ferro,avaliacao_medica', 'Risco de anemia'),
('glucose_fasting', 'Glicose Jejum', 'gt', 99, null, 'insulin_resistance_suspected', 'metabolico', 'alta', 'low_carb,cetogenica_clinica', 'Glicose alterada em jejum'),
('glucose_fasting', 'Glicose Jejum', 'gt', 125, null, 'diabetes_risk', 'metabolico', 'critica', 'avaliacao_medica_urgente', 'Glicose compatível com diabetes'),
('hba1c', 'Hemoglobina Glicada', 'gt', 5.6, null, 'pre_diabetes_risk', 'metabolico', 'alta', 'low_carb,controle_glicemico', 'HbA1c pré-diabética'),
('hba1c', 'Hemoglobina Glicada', 'gt', 6.4, null, 'diabetes_confirmed', 'metabolico', 'critica', 'avaliacao_medica_urgente', 'HbA1c compatível com diabetes'),
('triglycerides', 'Triglicerídeos', 'gt', 150, null, 'hypertriglyceridemia_risk', 'metabolico', 'moderada', 'low_carb,reducao_ultraprocessados', 'Triglicerídeos elevados'),
('triglycerides', 'Triglicerídeos', 'gt', 200, null, 'hypertriglyceridemia_high', 'metabolico', 'alta', 'low_carb,omega3,reducao_acucar', 'Triglicerídeos muito elevados'),
('hdl', 'HDL', 'lt', 40, 'male', 'low_hdl_male', 'metabolico', 'moderada', 'exercicio,gorduras_boas', 'HDL baixo'),
('hdl', 'HDL', 'lt', 50, 'female', 'low_hdl_female', 'metabolico', 'moderada', 'exercicio,gorduras_boas', 'HDL baixo'),
('ldl', 'LDL', 'gt', 130, null, 'elevated_ldl', 'metabolico', 'moderada', 'dieta_mediterranea,fibras', 'LDL elevado'),
('ldl', 'LDL', 'gt', 160, null, 'high_ldl', 'metabolico', 'alta', 'avaliacao_cardiologica,estatinas', 'LDL muito elevado'),
('total_cholesterol', 'Colesterol Total', 'gt', 200, null, 'elevated_cholesterol', 'metabolico', 'moderada', 'dieta_mediterranea,exercicio', 'Colesterol total elevado'),
('tsh', 'TSH', 'gt', 4.5, null, 'hypothyroidism_risk', 'metabolico', 'moderada', 'avaliacao_endocrino,selenio,iodo', 'TSH elevado - risco hipotireoidismo'),
('tsh', 'TSH', 'lt', 0.4, null, 'hyperthyroidism_risk', 'metabolico', 'alta', 'avaliacao_endocrino', 'TSH baixo - risco hipertireoidismo'),
('t4_free', 'T4 Livre', 'lt', 0.8, null, 'low_t4', 'metabolico', 'moderada', 'avaliacao_endocrino', 'T4 livre baixo'),
('creatinine', 'Creatinina', 'gt', 1.3, 'male', 'elevated_creatinine_male', 'metabolico', 'alta', 'avaliacao_renal,hidratacao', 'Creatinina elevada'),
('creatinine', 'Creatinina', 'gt', 1.1, 'female', 'elevated_creatinine_female', 'metabolico', 'alta', 'avaliacao_renal,hidratacao', 'Creatinina elevada'),
('uric_acid', 'Ácido Úrico', 'gt', 7.0, 'male', 'hyperuricemia_male', 'metabolico', 'moderada', 'reducao_purinas,hidratacao', 'Ácido úrico elevado'),
('uric_acid', 'Ácido Úrico', 'gt', 6.0, 'female', 'hyperuricemia_female', 'metabolico', 'moderada', 'reducao_purinas,hidratacao', 'Ácido úrico elevado'),
('vitamin_b12', 'Vitamina B12', 'lt', 300, null, 'low_b12', 'micronutrientes', 'moderada', 'suplementacao_b12,fontes_animais', 'B12 insuficiente'),
('folate', 'Ácido Fólico', 'lt', 5, null, 'low_folate', 'micronutrientes', 'moderada', 'vegetais_verdes_escuros,suplementacao', 'Folato baixo'),
('iron_serum', 'Ferro Sérico', 'lt', 60, null, 'low_serum_iron', 'micronutrientes', 'moderada', 'fontes_ferro_heme,vitamina_c', 'Ferro sérico baixo'),
('calcium', 'Cálcio', 'lt', 8.5, null, 'low_calcium', 'micronutrientes', 'moderada', 'laticinios,suplementacao_calcio', 'Cálcio baixo'),
('magnesium', 'Magnésio', 'lt', 1.7, null, 'low_magnesium', 'micronutrientes', 'moderada', 'oleaginosas,vegetais_verdes,suplementacao', 'Magnésio baixo'),
('zinc', 'Zinco', 'lt', 70, null, 'low_zinc', 'micronutrientes', 'moderada', 'carne_vermelha,frutos_do_mar', 'Zinco baixo'),
('alt', 'TGP/ALT', 'gt', 40, null, 'elevated_liver_enzymes', 'metabolico', 'moderada', 'reducao_alcool,hepatoprotetores', 'Enzimas hepáticas elevadas'),
('ast', 'TGO/AST', 'gt', 40, null, 'elevated_ast', 'metabolico', 'moderada', 'avaliacao_hepatica', 'AST elevado'),
('ggt', 'GGT', 'gt', 50, null, 'elevated_ggt', 'metabolico', 'moderada', 'reducao_alcool,avaliacao_hepatica', 'GGT elevado'),
('pcr', 'PCR', 'gt', 3, null, 'elevated_inflammation', 'metabolico', 'moderada', 'anti_inflamatoria,omega3', 'Marcador inflamatório elevado'),
('insulin_fasting', 'Insulina Jejum', 'gt', 15, null, 'hyperinsulinemia', 'metabolico', 'alta', 'low_carb,exercicio_resistido', 'Hiperinsulinemia'),
('cortisol', 'Cortisol', 'gt', 25, null, 'elevated_cortisol', 'comportamental', 'moderada', 'gestao_estresse,sono,adaptogenos', 'Cortisol elevado'),
('testosterone', 'Testosterona', 'lt', 300, 'male', 'low_testosterone_male', 'metabolico', 'moderada', 'exercicio_resistido,sono,zinco', 'Testosterona baixa'),
('potassium', 'Potássio', 'lt', 3.5, null, 'low_potassium', 'micronutrientes', 'alta', 'banana,agua_coco,avaliacao_medica', 'Potássio baixo'),
('sodium', 'Sódio', 'gt', 145, null, 'elevated_sodium', 'metabolico', 'moderada', 'hidratacao,reducao_sal', 'Sódio elevado'),
('albumin', 'Albumina', 'lt', 3.5, null, 'low_albumin', 'metabolico', 'alta', 'aumento_proteina,avaliacao_nutricional', 'Albumina baixa - risco desnutrição');
