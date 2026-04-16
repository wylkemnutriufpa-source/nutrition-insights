-- Add fixed macro fields to meal_recipes for "frozen marmita" support
ALTER TABLE public.meal_recipes
  ADD COLUMN IF NOT EXISTS fixed_calories numeric,
  ADD COLUMN IF NOT EXISTS fixed_protein numeric,
  ADD COLUMN IF NOT EXISTS fixed_carbs numeric,
  ADD COLUMN IF NOT EXISTS fixed_fat numeric,
  ADD COLUMN IF NOT EXISTS is_fixed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_scalable boolean NOT NULL DEFAULT true;

-- Index for fast lookup of fixed marmitas by meal_type
CREATE INDEX IF NOT EXISTS idx_meal_recipes_is_fixed ON public.meal_recipes(is_fixed) WHERE is_fixed = true;

COMMENT ON COLUMN public.meal_recipes.is_fixed IS 'When true, marmita is a frozen product. Macros locked, no scaling allowed.';
COMMENT ON COLUMN public.meal_recipes.is_scalable IS 'When false, engine cannot scale grams/macros of this recipe.';
COMMENT ON COLUMN public.meal_recipes.fixed_calories IS 'Fixed kcal for frozen marmita products (immutable by engine).';