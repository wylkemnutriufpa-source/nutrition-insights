
-- ============================================
-- CLINICAL KNOWLEDGE BASE V1 — SCHEMA
-- ============================================

-- 1. clinical_flags_catalog
CREATE TABLE public.clinical_flags_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_key text NOT NULL UNIQUE,
  display_name text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.clinical_flags_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read clinical flags"
  ON public.clinical_flags_catalog FOR SELECT TO authenticated
  USING (true);

-- 2. anamnese_trigger_map
CREATE TABLE public.anamnese_trigger_map (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_key text NOT NULL,
  answer_condition jsonb NOT NULL DEFAULT '{}',
  generated_flag text NOT NULL REFERENCES public.clinical_flags_catalog(flag_key),
  priority int NOT NULL DEFAULT 5,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.anamnese_trigger_map ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read anamnese triggers"
  ON public.anamnese_trigger_map FOR SELECT TO authenticated
  USING (true);

-- 3. clinical_checklist_templates
CREATE TABLE public.clinical_checklist_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_code text NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  frequency text NOT NULL DEFAULT 'daily',
  category text NOT NULL DEFAULT 'general',
  action_type text NOT NULL DEFAULT 'check',
  icon text NOT NULL DEFAULT '✅',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.clinical_checklist_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read checklist templates"
  ON public.clinical_checklist_templates FOR SELECT TO authenticated
  USING (true);

-- 4. clinical_message_templates
CREATE TABLE public.clinical_message_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_code text NOT NULL UNIQUE,
  channel text NOT NULL DEFAULT 'notification',
  title text NOT NULL,
  body text NOT NULL,
  tone text NOT NULL DEFAULT 'empathetic',
  category text NOT NULL DEFAULT 'general',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.clinical_message_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read message templates"
  ON public.clinical_message_templates FOR SELECT TO authenticated
  USING (true);

-- 5. clinical_behavior_rules
CREATE TABLE public.clinical_behavior_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_flag text NOT NULL REFERENCES public.clinical_flags_catalog(flag_key),
  objective_context text,
  strategy_context text,
  severity_level text NOT NULL DEFAULT 'medium',
  checklist_template_code text REFERENCES public.clinical_checklist_templates(template_code),
  message_template_code text REFERENCES public.clinical_message_templates(message_code),
  priority int NOT NULL DEFAULT 5,
  frequency text NOT NULL DEFAULT 'daily',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.clinical_behavior_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read behavior rules"
  ON public.clinical_behavior_rules FOR SELECT TO authenticated
  USING (true);

-- Indexes
CREATE INDEX idx_flags_category ON public.clinical_flags_catalog(category);
CREATE INDEX idx_flags_active ON public.clinical_flags_catalog(is_active);
CREATE INDEX idx_trigger_map_question ON public.anamnese_trigger_map(question_key);
CREATE INDEX idx_trigger_map_flag ON public.anamnese_trigger_map(generated_flag);
CREATE INDEX idx_checklist_tpl_category ON public.clinical_checklist_templates(category);
CREATE INDEX idx_message_tpl_channel ON public.clinical_message_templates(channel);
CREATE INDEX idx_behavior_rules_flag ON public.clinical_behavior_rules(trigger_flag);
CREATE INDEX idx_behavior_rules_active ON public.clinical_behavior_rules(is_active);
