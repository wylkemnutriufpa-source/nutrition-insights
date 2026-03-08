
-- Table for saved individual meal items (reusable)
CREATE TABLE public.saved_meals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nutritionist_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  meal_type public.meal_type NOT NULL DEFAULT 'lunch',
  calories_target integer,
  protein_target numeric,
  carbs_target numeric,
  fat_target numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.saved_meals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Nutritionists manage own saved meals"
  ON public.saved_meals FOR ALL
  TO authenticated
  USING (auth.uid() = nutritionist_id)
  WITH CHECK (auth.uid() = nutritionist_id);

-- Table for saved plan templates (entire plan)
CREATE TABLE public.saved_plan_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nutritionist_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  source_plan_id uuid REFERENCES public.meal_plans(id) ON DELETE SET NULL,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.saved_plan_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Nutritionists manage own plan templates"
  ON public.saved_plan_templates FOR ALL
  TO authenticated
  USING (auth.uid() = nutritionist_id)
  WITH CHECK (auth.uid() = nutritionist_id);
