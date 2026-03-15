
-- ═══════════════════════════════════════════
-- FASE 8: Semi-Autonomous Protocol Engine
-- ═══════════════════════════════════════════

-- 1. Protocol Transition Suggestions
CREATE TABLE public.protocol_transition_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL,
  nutritionist_id UUID NOT NULL,
  current_plan_id UUID REFERENCES public.meal_plans(id),
  current_protocol_id UUID REFERENCES public.nutrition_protocols(id),
  suggested_protocol_id UUID REFERENCES public.nutrition_protocols(id),
  suggested_template_id UUID REFERENCES public.diet_templates(id),
  transition_type TEXT NOT NULL DEFAULT 'maintain_current_protocol',
  calorie_adjustment_percent NUMERIC DEFAULT 0,
  expected_strategy_outcome TEXT,
  clinical_reason TEXT NOT NULL,
  supporting_metrics JSONB DEFAULT '{}'::jsonb,
  confidence_score NUMERIC DEFAULT 50,
  confidence_level TEXT DEFAULT 'medium_confidence',
  engine_version TEXT DEFAULT '1.0.0',
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  approved_at TIMESTAMPTZ,
  approved_by UUID
);

-- 2. Autonomy settings per nutritionist
CREATE TABLE public.protocol_autonomy_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nutritionist_id UUID NOT NULL UNIQUE,
  autonomy_mode TEXT DEFAULT 'SUGGEST_ONLY',
  min_confidence_for_auto_draft NUMERIC DEFAULT 70,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Add previous_plan_id and transition_origin_id to meal_plans
ALTER TABLE public.meal_plans
  ADD COLUMN IF NOT EXISTS previous_plan_id UUID REFERENCES public.meal_plans(id),
  ADD COLUMN IF NOT EXISTS transition_origin_id UUID REFERENCES public.protocol_transition_suggestions(id);

-- 4. RLS
ALTER TABLE public.protocol_transition_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.protocol_autonomy_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Nutritionists manage own transition suggestions"
  ON public.protocol_transition_suggestions
  FOR ALL TO authenticated
  USING (nutritionist_id = auth.uid())
  WITH CHECK (nutritionist_id = auth.uid());

CREATE POLICY "System can insert transition suggestions"
  ON public.protocol_transition_suggestions
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Nutritionists manage own autonomy settings"
  ON public.protocol_autonomy_settings
  FOR ALL TO authenticated
  USING (nutritionist_id = auth.uid())
  WITH CHECK (nutritionist_id = auth.uid());

-- 5. Indexes
CREATE INDEX idx_transition_suggestions_patient ON public.protocol_transition_suggestions(patient_id);
CREATE INDEX idx_transition_suggestions_status ON public.protocol_transition_suggestions(status);
CREATE INDEX idx_transition_suggestions_nutritionist ON public.protocol_transition_suggestions(nutritionist_id);
CREATE INDEX idx_meal_plans_previous ON public.meal_plans(previous_plan_id) WHERE previous_plan_id IS NOT NULL;

-- 6. Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.protocol_transition_suggestions;
