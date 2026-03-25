
-- Intelligence custom prompts/messages configurable by nutritionist
CREATE TABLE public.intelligence_custom_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nutritionist_id UUID NOT NULL,
  prompt_type TEXT NOT NULL DEFAULT 'custom',
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  emoji TEXT NOT NULL DEFAULT '💬',
  tone TEXT NOT NULL DEFAULT 'gentle',
  is_active BOOLEAN NOT NULL DEFAULT true,
  schedule_hours INTEGER[] DEFAULT NULL,
  schedule_days TEXT[] DEFAULT NULL,
  escalation_level INTEGER NOT NULL DEFAULT 0,
  quick_actions JSONB DEFAULT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Intelligence custom questions for patients
CREATE TABLE public.intelligence_custom_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nutritionist_id UUID NOT NULL,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL DEFAULT 'quick_reply',
  options JSONB DEFAULT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  delivery_mode TEXT NOT NULL DEFAULT 'prompt',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Intelligence global settings per nutritionist
CREATE TABLE public.intelligence_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nutritionist_id UUID NOT NULL UNIQUE,
  default_tone TEXT NOT NULL DEFAULT 'gentle',
  default_motivation_style TEXT NOT NULL DEFAULT 'gentle',
  hydration_enabled BOOLEAN NOT NULL DEFAULT true,
  workout_enabled BOOLEAN NOT NULL DEFAULT true,
  weekend_risk_enabled BOOLEAN NOT NULL DEFAULT true,
  clinical_warnings_enabled BOOLEAN NOT NULL DEFAULT true,
  motivation_enabled BOOLEAN NOT NULL DEFAULT true,
  non_adherence_enabled BOOLEAN NOT NULL DEFAULT true,
  custom_prompts_enabled BOOLEAN NOT NULL DEFAULT true,
  cooldown_minutes INTEGER NOT NULL DEFAULT 60,
  max_prompts_per_day INTEGER NOT NULL DEFAULT 6,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.intelligence_custom_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intelligence_custom_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intelligence_settings ENABLE ROW LEVEL SECURITY;

-- Nutritionist can manage their own prompts
CREATE POLICY "Nutritionists manage own prompts" ON public.intelligence_custom_prompts
  FOR ALL TO authenticated
  USING (nutritionist_id = auth.uid())
  WITH CHECK (nutritionist_id = auth.uid());

-- Nutritionist can manage their own questions
CREATE POLICY "Nutritionists manage own questions" ON public.intelligence_custom_questions
  FOR ALL TO authenticated
  USING (nutritionist_id = auth.uid())
  WITH CHECK (nutritionist_id = auth.uid());

-- Nutritionist can manage their own settings
CREATE POLICY "Nutritionists manage own settings" ON public.intelligence_settings
  FOR ALL TO authenticated
  USING (nutritionist_id = auth.uid())
  WITH CHECK (nutritionist_id = auth.uid());
