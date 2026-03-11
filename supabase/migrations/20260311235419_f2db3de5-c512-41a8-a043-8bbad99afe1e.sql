
-- ============================================
-- DETERMINISTIC CLINICAL INTELLIGENCE ENGINE
-- ============================================

-- 1. CLINICAL SIGNALS CATALOG
CREATE TABLE public.clinical_signals_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_key text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'general',
  data_source text NOT NULL,
  detection_query text,
  default_severity text NOT NULL DEFAULT 'medium',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.clinical_signals_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_signals_catalog" ON public.clinical_signals_catalog FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_manage_signals_catalog" ON public.clinical_signals_catalog FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_update_signals_catalog" ON public.clinical_signals_catalog FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_delete_signals_catalog" ON public.clinical_signals_catalog FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 2. PATIENT SIGNALS
CREATE TABLE public.patient_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  signal_key text NOT NULL REFERENCES public.clinical_signals_catalog(signal_key),
  severity text NOT NULL DEFAULT 'medium',
  value numeric,
  context jsonb DEFAULT '{}',
  detected_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  detected_by text NOT NULL DEFAULT 'system'
);
CREATE INDEX idx_patient_signals_patient ON public.patient_signals(patient_id, is_active);
CREATE INDEX idx_patient_signals_key ON public.patient_signals(signal_key, detected_at DESC);
ALTER TABLE public.patient_signals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_patient_signals" ON public.patient_signals FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.nutritionist_patients np WHERE np.patient_id = patient_signals.patient_id AND np.nutritionist_id = auth.uid() AND np.status = 'active')
    OR patient_signals.patient_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
  );
CREATE POLICY "insert_patient_signals" ON public.patient_signals FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_patient_signals" ON public.patient_signals FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.nutritionist_patients np WHERE np.patient_id = patient_signals.patient_id AND np.nutritionist_id = auth.uid() AND np.status = 'active')
    OR public.has_role(auth.uid(), 'admin')
  );

-- 3. CLINICAL RULES
CREATE TABLE public.clinical_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_key text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'general',
  priority integer NOT NULL DEFAULT 50,
  min_score numeric NOT NULL DEFAULT 0.5,
  logic_operator text NOT NULL DEFAULT 'AND',
  is_active boolean NOT NULL DEFAULT true,
  target_audience text NOT NULL DEFAULT 'nutritionist',
  cooldown_hours integer NOT NULL DEFAULT 24,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.clinical_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_clinical_rules" ON public.clinical_rules FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_insert_clinical_rules" ON public.clinical_rules FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_update_clinical_rules" ON public.clinical_rules FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_delete_clinical_rules" ON public.clinical_rules FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 4. CLINICAL RULE CONDITIONS
CREATE TABLE public.clinical_rule_conditions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id uuid NOT NULL REFERENCES public.clinical_rules(id) ON DELETE CASCADE,
  signal_key text NOT NULL REFERENCES public.clinical_signals_catalog(signal_key),
  operator text NOT NULL DEFAULT 'exists',
  threshold numeric,
  weight numeric NOT NULL DEFAULT 1.0,
  is_required boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_rule_conditions_rule ON public.clinical_rule_conditions(rule_id);
ALTER TABLE public.clinical_rule_conditions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_rule_conditions" ON public.clinical_rule_conditions FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_insert_rule_conditions" ON public.clinical_rule_conditions FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_update_rule_conditions" ON public.clinical_rule_conditions FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_delete_rule_conditions" ON public.clinical_rule_conditions FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 5. RECOMMENDATION LIBRARY
CREATE TABLE public.recommendation_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rec_key text UNIQUE NOT NULL,
  title text NOT NULL,
  body_template text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  target_audience text NOT NULL DEFAULT 'nutritionist',
  priority text NOT NULL DEFAULT 'medium',
  icon text NOT NULL DEFAULT '💡',
  action_type text,
  action_route text,
  tags text[] DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.recommendation_library ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_recommendations" ON public.recommendation_library FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_insert_recommendations" ON public.recommendation_library FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_update_recommendations" ON public.recommendation_library FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_delete_recommendations" ON public.recommendation_library FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 6. CLINICAL RULE RECOMMENDATIONS
CREATE TABLE public.clinical_rule_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id uuid NOT NULL REFERENCES public.clinical_rules(id) ON DELETE CASCADE,
  recommendation_id uuid NOT NULL REFERENCES public.recommendation_library(id) ON DELETE CASCADE,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(rule_id, recommendation_id)
);
CREATE INDEX idx_rule_recs_rule ON public.clinical_rule_recommendations(rule_id);
ALTER TABLE public.clinical_rule_recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_rule_recs" ON public.clinical_rule_recommendations FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_insert_rule_recs" ON public.clinical_rule_recommendations FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_update_rule_recs" ON public.clinical_rule_recommendations FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_delete_rule_recs" ON public.clinical_rule_recommendations FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 7. TIP LIBRARY
CREATE TABLE public.tip_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tip_key text UNIQUE NOT NULL,
  content text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  severity text NOT NULL DEFAULT 'info',
  goal text,
  sex text,
  age_group text,
  behavior_pattern text,
  signal_key text REFERENCES public.clinical_signals_catalog(signal_key),
  icon text NOT NULL DEFAULT '💡',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_tip_library_signal ON public.tip_library(signal_key);
CREATE INDEX idx_tip_library_category ON public.tip_library(category, is_active);
ALTER TABLE public.tip_library ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_tip_library" ON public.tip_library FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_insert_tip_library" ON public.tip_library FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_update_tip_library" ON public.tip_library FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_delete_tip_library" ON public.tip_library FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Trigger for updated_at on clinical_rules
CREATE TRIGGER update_clinical_rules_updated_at
  BEFORE UPDATE ON public.clinical_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
