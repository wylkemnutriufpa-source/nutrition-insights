
-- ═══════════════════════════════════════════
-- USER RECIPES — Patient-created recipes
-- ═══════════════════════════════════════════
CREATE TABLE public.user_recipes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  instructions TEXT,
  ingredients_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  image_url TEXT,
  image_path TEXT,
  total_calories NUMERIC,
  total_protein NUMERIC,
  total_carbs NUMERIC,
  total_fat NUMERIC,
  servings INTEGER NOT NULL DEFAULT 1,
  target_meal_type TEXT,
  is_approved BOOLEAN NOT NULL DEFAULT false,
  approved_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_recipes ENABLE ROW LEVEL SECURITY;

-- Patient can CRUD own recipes
CREATE POLICY "Users manage own recipes"
  ON public.user_recipes FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Nutritionists can read recipes of their patients
CREATE POLICY "Nutritionists read patient recipes"
  ON public.user_recipes FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.nutritionist_patients np
      WHERE np.patient_id = user_recipes.user_id
        AND np.nutritionist_id = auth.uid()
        AND np.status = 'active'
    )
  );

-- Nutritionists can update approval status
CREATE POLICY "Nutritionists approve patient recipes"
  ON public.user_recipes FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.nutritionist_patients np
      WHERE np.patient_id = user_recipes.user_id
        AND np.nutritionist_id = auth.uid()
        AND np.status = 'active'
    )
  );

-- ═══════════════════════════════════════════
-- RECIPE CURATION QUEUE
-- ═══════════════════════════════════════════
CREATE TABLE public.recipe_curation_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recipe_id UUID NOT NULL REFERENCES public.user_recipes(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL,
  nutritionist_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ
);

ALTER TABLE public.recipe_curation_queue ENABLE ROW LEVEL SECURITY;

-- Nutritionists see their queue
CREATE POLICY "Nutritionists manage own queue"
  ON public.recipe_curation_queue FOR ALL TO authenticated
  USING (auth.uid() = nutritionist_id)
  WITH CHECK (auth.uid() = nutritionist_id);

-- Patients see their submissions
CREATE POLICY "Patients see own submissions"
  ON public.recipe_curation_queue FOR SELECT TO authenticated
  USING (auth.uid() = patient_id);

-- Patients can insert submissions
CREATE POLICY "Patients submit to queue"
  ON public.recipe_curation_queue FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = patient_id);

-- Updated_at trigger for user_recipes
CREATE TRIGGER update_user_recipes_updated_at
  BEFORE UPDATE ON public.user_recipes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
