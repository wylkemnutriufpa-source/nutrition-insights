
-- Create meal_type_enum if not exists (reuse existing)
-- Create goal_tag enum
DO $$ BEGIN
  CREATE TYPE public.meal_goal_tag AS ENUM ('weight_loss', 'hypertrophy', 'metabolic', 'low_carb', 'functional', 'maintenance');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Create meal_library table
CREATE TABLE IF NOT EXISTS public.meal_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  meal_type text NOT NULL CHECK (meal_type IN ('breakfast', 'morning_snack', 'lunch', 'afternoon_snack', 'dinner', 'evening_snack')),
  goal_tag text NOT NULL CHECK (goal_tag IN ('weight_loss', 'hypertrophy', 'metabolic', 'low_carb', 'functional', 'maintenance')),
  clinical_tags text[] DEFAULT '{}',
  base_calories integer NOT NULL DEFAULT 0,
  protein integer NOT NULL DEFAULT 0,
  carbs integer NOT NULL DEFAULT 0,
  fat integer NOT NULL DEFAULT 0,
  foods jsonb NOT NULL DEFAULT '[]',
  substitutions jsonb DEFAULT '[]',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_meal_library_type ON public.meal_library (meal_type);
CREATE INDEX IF NOT EXISTS idx_meal_library_goal ON public.meal_library (goal_tag);
CREATE INDEX IF NOT EXISTS idx_meal_library_active ON public.meal_library (is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE public.meal_library ENABLE ROW LEVEL SECURITY;

-- RLS: anyone authenticated can read active meals
CREATE POLICY "Anyone can read active meal_library"
  ON public.meal_library FOR SELECT TO authenticated
  USING (is_active = true);

-- RLS: admins/nutritionists can insert/update
CREATE POLICY "Professionals can manage meal_library"
  ON public.meal_library FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'nutritionist')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'nutritionist')
  );
