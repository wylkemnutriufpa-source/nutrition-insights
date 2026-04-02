
-- 1. Add per-gram macro columns to ifj_food_database
ALTER TABLE public.ifj_food_database
  ADD COLUMN IF NOT EXISTS portion_grams numeric DEFAULT 100,
  ADD COLUMN IF NOT EXISTS protein_per_gram numeric GENERATED ALWAYS AS (
    CASE WHEN portion_grams > 0 THEN ROUND(protein / portion_grams, 4) ELSE 0 END
  ) STORED,
  ADD COLUMN IF NOT EXISTS carbs_per_gram numeric GENERATED ALWAYS AS (
    CASE WHEN portion_grams > 0 THEN ROUND(carbs / portion_grams, 4) ELSE 0 END
  ) STORED,
  ADD COLUMN IF NOT EXISTS fat_per_gram numeric GENERATED ALWAYS AS (
    CASE WHEN portion_grams > 0 THEN ROUND(fats / portion_grams, 4) ELSE 0 END
  ) STORED,
  ADD COLUMN IF NOT EXISTS calories_per_gram numeric GENERATED ALWAYS AS (
    CASE WHEN portion_grams > 0 THEN ROUND(calories / portion_grams, 4) ELSE 0 END
  ) STORED;

-- 2. Backfill portion_grams from portion_reference text (e.g. "120g" → 120)
UPDATE public.ifj_food_database 
SET portion_grams = NULLIF(regexp_replace(portion_reference, '[^0-9.]', '', 'g'), '')::numeric
WHERE portion_reference IS NOT NULL 
  AND portion_reference ~ '[0-9]';

-- 3. Create recipe_items table linking recipes to foods with reference grams
CREATE TABLE IF NOT EXISTS public.recipe_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id uuid NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  food_id uuid REFERENCES public.ifj_food_database(id) ON DELETE SET NULL,
  food_name text NOT NULL,
  grams_reference numeric NOT NULL DEFAULT 100,
  is_scalable boolean NOT NULL DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.recipe_items ENABLE ROW LEVEL SECURITY;

-- RLS: recipe_items inherit access from parent recipe
CREATE POLICY "Users can view recipe items for their recipes"
  ON public.recipe_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.recipes r 
      WHERE r.id = recipe_items.recipe_id 
        AND r.nutritionist_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage recipe items for their recipes"
  ON public.recipe_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.recipes r 
      WHERE r.id = recipe_items.recipe_id 
        AND r.nutritionist_id = auth.uid()
    )
  );

-- Index for fast lookups
CREATE INDEX idx_recipe_items_recipe_id ON public.recipe_items(recipe_id);
CREATE INDEX idx_recipe_items_food_id ON public.recipe_items(food_id);
