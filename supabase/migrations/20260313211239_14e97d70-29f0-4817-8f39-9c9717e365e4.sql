
-- ━━━ 1. Enhance diet_templates with clinical taxonomy ━━━
ALTER TABLE public.diet_templates 
  ADD COLUMN IF NOT EXISTS goal_category TEXT NOT NULL DEFAULT 'emagrecimento',
  ADD COLUMN IF NOT EXISTS diet_style TEXT NOT NULL DEFAULT 'tradicional',
  ADD COLUMN IF NOT EXISTS complexity_level TEXT NOT NULL DEFAULT 'simples',
  ADD COLUMN IF NOT EXISTS food_access_level TEXT NOT NULL DEFAULT 'básico',
  ADD COLUMN IF NOT EXISTS clinical_tags TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS caloric_versions JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS weekly_variation_strategy JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS meal_distribution JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Indexes for taxonomy queries
CREATE INDEX IF NOT EXISTS idx_diet_templates_goal ON public.diet_templates (goal_category);
CREATE INDEX IF NOT EXISTS idx_diet_templates_style ON public.diet_templates (diet_style);
CREATE INDEX IF NOT EXISTS idx_diet_templates_tags ON public.diet_templates USING GIN (clinical_tags);
CREATE INDEX IF NOT EXISTS idx_diet_templates_active_goal ON public.diet_templates (is_active, goal_category);

-- ━━━ 2. Food Substitution Groups ━━━
CREATE TABLE IF NOT EXISTS public.food_substitution_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_key TEXT NOT NULL UNIQUE,
  group_name TEXT NOT NULL,
  macro_category TEXT NOT NULL, -- proteina, carbo, gordura, vegetal, fruta
  avg_calories_per_100g NUMERIC,
  avg_protein_per_100g NUMERIC,
  avg_carbs_per_100g NUMERIC,
  avg_fat_per_100g NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Link foods to substitution groups
CREATE TABLE IF NOT EXISTS public.food_substitution_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES public.food_substitution_groups(id) ON DELETE CASCADE NOT NULL,
  food_id UUID REFERENCES public.food_database(id) ON DELETE CASCADE,
  food_name TEXT NOT NULL,
  portion_grams NUMERIC NOT NULL DEFAULT 100,
  calories_per_portion NUMERIC,
  protein_per_portion NUMERIC,
  carbs_per_portion NUMERIC,
  fat_per_portion NUMERIC,
  clinical_notes TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(group_id, food_name)
);

CREATE INDEX IF NOT EXISTS idx_sub_members_group ON public.food_substitution_members (group_id);
CREATE INDEX IF NOT EXISTS idx_sub_members_food ON public.food_substitution_members (food_id);

-- RLS
ALTER TABLE public.food_substitution_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_substitution_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read substitution groups" ON public.food_substitution_groups FOR SELECT USING (true);
CREATE POLICY "Anyone can read substitution members" ON public.food_substitution_members FOR SELECT USING (true);
