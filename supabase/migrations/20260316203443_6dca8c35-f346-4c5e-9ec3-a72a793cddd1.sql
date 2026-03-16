
-- Nutritionist Meal Templates (library of reusable meal blocks)
CREATE TABLE public.nutritionist_meal_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nutritionist_id uuid NOT NULL,
  name text NOT NULL,
  meal_type text NOT NULL DEFAULT 'lunch',
  goal_tags jsonb DEFAULT '[]'::jsonb,
  kcal_base integer DEFAULT 0,
  protein_base numeric DEFAULT 0,
  carbs_base numeric DEFAULT 0,
  fat_base numeric DEFAULT 0,
  foods_structure jsonb DEFAULT '[]'::jsonb,
  complexity_level text DEFAULT 'medium',
  satiety_score integer DEFAULT 5,
  usage_count integer DEFAULT 0,
  is_global boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.nutritionist_meal_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Nutritionists manage own templates"
  ON public.nutritionist_meal_templates FOR ALL TO authenticated
  USING (nutritionist_id = auth.uid() OR is_global = true)
  WITH CHECK (nutritionist_id = auth.uid());

CREATE POLICY "Read global templates"
  ON public.nutritionist_meal_templates FOR SELECT TO authenticated
  USING (is_global = true);

-- Meal Template Performance tracking
CREATE TABLE public.meal_template_performance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid REFERENCES public.nutritionist_meal_templates(id) ON DELETE CASCADE NOT NULL,
  avg_adherence numeric DEFAULT 0,
  avg_weight_response numeric DEFAULT 0,
  usage_count integer DEFAULT 0,
  success_rate numeric DEFAULT 0,
  last_used timestamptz,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.meal_template_performance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read template performance"
  ON public.meal_template_performance FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.nutritionist_meal_templates t 
    WHERE t.id = template_id AND (t.nutritionist_id = auth.uid() OR t.is_global = true)
  ));

-- Index for fast lookups
CREATE INDEX idx_meal_templates_nutritionist ON public.nutritionist_meal_templates(nutritionist_id);
CREATE INDEX idx_meal_templates_meal_type ON public.nutritionist_meal_templates(meal_type);
CREATE INDEX idx_meal_template_perf_template ON public.meal_template_performance(template_id);
