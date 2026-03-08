
-- AI insights generated from anamnesis
CREATE TABLE public.anamnesis_ai_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  anamnesis_id uuid NOT NULL REFERENCES public.patient_anamnesis(id) ON DELETE CASCADE,
  risk_level text NOT NULL DEFAULT 'low',
  primary_goal text,
  metabolic_profile text,
  main_pains jsonb DEFAULT '[]'::jsonb,
  nutrition_focus jsonb DEFAULT '[]'::jsonb,
  behavior_focus jsonb DEFAULT '[]'::jsonb,
  movement_focus jsonb DEFAULT '[]'::jsonb,
  suggested_protocol text,
  personalized_tips jsonb DEFAULT '[]'::jsonb,
  ai_summary text,
  raw_response jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.anamnesis_ai_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients view own insights"
  ON public.anamnesis_ai_insights FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Nutritionists view patient insights"
  ON public.anamnesis_ai_insights FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.nutritionist_patients np
    WHERE np.patient_id = anamnesis_ai_insights.user_id
    AND np.nutritionist_id = auth.uid()
    AND np.status = 'active'
  ));

-- Service role inserts only (from edge function)
CREATE POLICY "Service insert insights"
  ON public.anamnesis_ai_insights FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Patient recommendations (actionable items from AI)
CREATE TABLE public.patient_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  insight_id uuid REFERENCES public.anamnesis_ai_insights(id) ON DELETE CASCADE,
  category text NOT NULL DEFAULT 'nutrition',
  title text NOT NULL,
  description text,
  priority text NOT NULL DEFAULT 'medium',
  icon text NOT NULL DEFAULT '💡',
  is_completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.patient_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients manage own recommendations"
  ON public.patient_recommendations FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Nutritionists view patient recommendations"
  ON public.patient_recommendations FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.nutritionist_patients np
    WHERE np.patient_id = patient_recommendations.user_id
    AND np.nutritionist_id = auth.uid()
    AND np.status = 'active'
  ));
