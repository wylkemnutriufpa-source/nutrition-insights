
-- ==========================================
-- 1. FEEDBACKS TABLE
-- ==========================================
CREATE TABLE public.feedbacks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  nutritionist_id uuid NOT NULL,
  message text NOT NULL,
  response text,
  is_anonymous boolean DEFAULT false,
  category text NOT NULL DEFAULT 'general',
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz
);
ALTER TABLE public.feedbacks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients manage own feedbacks" ON public.feedbacks FOR ALL TO authenticated
  USING (auth.uid() = patient_id) WITH CHECK (auth.uid() = patient_id);
CREATE POLICY "Nutritionists view patient feedbacks" ON public.feedbacks FOR SELECT TO authenticated
  USING (auth.uid() = nutritionist_id);
CREATE POLICY "Nutritionists respond to feedbacks" ON public.feedbacks FOR UPDATE TO authenticated
  USING (auth.uid() = nutritionist_id);

-- ==========================================
-- 2. GLOBAL TIPS TABLE
-- ==========================================
CREATE TABLE public.global_tips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nutritionist_id uuid NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  category text NOT NULL DEFAULT 'nutrition',
  icon text NOT NULL DEFAULT '💡',
  is_published boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.global_tips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Nutritionists manage own tips" ON public.global_tips FOR ALL TO authenticated
  USING (auth.uid() = nutritionist_id) WITH CHECK (auth.uid() = nutritionist_id);
CREATE POLICY "Patients view published tips" ON public.global_tips FOR SELECT TO authenticated
  USING (is_published = true AND EXISTS (
    SELECT 1 FROM nutritionist_patients np WHERE np.patient_id = auth.uid() AND np.nutritionist_id = global_tips.nutritionist_id AND np.status = 'active'
  ));

CREATE TRIGGER update_global_tips_updated_at BEFORE UPDATE ON public.global_tips
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- 3. RECIPES TABLE
-- ==========================================
CREATE TABLE public.recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nutritionist_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  ingredients jsonb NOT NULL DEFAULT '[]',
  instructions jsonb NOT NULL DEFAULT '[]',
  prep_time_minutes integer DEFAULT 30,
  cook_time_minutes integer DEFAULT 30,
  servings integer DEFAULT 2,
  difficulty text DEFAULT 'medium',
  category text DEFAULT 'main',
  calories_per_serving integer,
  protein_per_serving numeric,
  carbs_per_serving numeric,
  fat_per_serving numeric,
  tags text[] DEFAULT '{}',
  image_url text,
  is_ai_generated boolean DEFAULT false,
  is_shared boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Nutritionists manage own recipes" ON public.recipes FOR ALL TO authenticated
  USING (auth.uid() = nutritionist_id) WITH CHECK (auth.uid() = nutritionist_id);
CREATE POLICY "Patients view shared recipes" ON public.recipes FOR SELECT TO authenticated
  USING (is_shared = true AND EXISTS (
    SELECT 1 FROM nutritionist_patients np WHERE np.patient_id = auth.uid() AND np.nutritionist_id = recipes.nutritionist_id AND np.status = 'active'
  ));

CREATE TRIGGER update_recipes_updated_at BEFORE UPDATE ON public.recipes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- 4. PATIENT FAVORITE RECIPES
-- ==========================================
CREATE TABLE public.patient_favorite_recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  recipe_id uuid NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(patient_id, recipe_id)
);
ALTER TABLE public.patient_favorite_recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients manage own favorites" ON public.patient_favorite_recipes FOR ALL TO authenticated
  USING (auth.uid() = patient_id) WITH CHECK (auth.uid() = patient_id);

-- ==========================================
-- 5. SHOPPING LIST ITEMS
-- ==========================================
CREATE TABLE public.shopping_list_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  meal_plan_id uuid REFERENCES public.meal_plans(id) ON DELETE SET NULL,
  item_name text NOT NULL,
  quantity text,
  category text DEFAULT 'other',
  is_checked boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.shopping_list_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients manage own shopping list" ON public.shopping_list_items FOR ALL TO authenticated
  USING (auth.uid() = patient_id) WITH CHECK (auth.uid() = patient_id);
CREATE POLICY "Nutritionists view patient shopping list" ON public.shopping_list_items FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM nutritionist_patients np WHERE np.patient_id = shopping_list_items.patient_id AND np.nutritionist_id = auth.uid() AND np.status = 'active'
  ));

-- ==========================================
-- 6. FOOD DATABASE (TACO)
-- ==========================================
CREATE TABLE public.food_database (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  calories numeric NOT NULL DEFAULT 0,
  protein numeric NOT NULL DEFAULT 0,
  carbs numeric NOT NULL DEFAULT 0,
  fat numeric NOT NULL DEFAULT 0,
  fiber numeric DEFAULT 0,
  sodium numeric DEFAULT 0,
  calcium numeric DEFAULT 0,
  iron numeric DEFAULT 0,
  serving_size text DEFAULT '100g',
  source text DEFAULT 'TACO',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.food_database ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view food database" ON public.food_database FOR SELECT TO authenticated
  USING (true);

-- ==========================================
-- 7. BODY ANALYSES TABLE
-- ==========================================
CREATE TABLE public.body_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  assessor_id uuid NOT NULL,
  front_image_url text,
  side_image_url text,
  back_image_url text,
  ai_analysis jsonb DEFAULT '{}',
  body_fat_estimate numeric,
  muscle_definition integer,
  body_type text,
  fat_distribution jsonb DEFAULT '{}',
  progress_comparison jsonb,
  notes text,
  analysis_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.body_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Nutritionists manage body analyses" ON public.body_analyses FOR ALL TO authenticated
  USING (assessor_id = auth.uid() OR EXISTS (
    SELECT 1 FROM nutritionist_patients np WHERE np.patient_id = body_analyses.patient_id AND np.nutritionist_id = auth.uid() AND np.status = 'active'
  ))
  WITH CHECK (assessor_id = auth.uid() OR EXISTS (
    SELECT 1 FROM nutritionist_patients np WHERE np.patient_id = body_analyses.patient_id AND np.nutritionist_id = auth.uid() AND np.status = 'active'
  ));
CREATE POLICY "Patients view own body analyses" ON public.body_analyses FOR SELECT TO authenticated
  USING (patient_id = auth.uid());
