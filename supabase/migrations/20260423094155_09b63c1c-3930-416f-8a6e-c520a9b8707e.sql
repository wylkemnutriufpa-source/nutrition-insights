ALTER TABLE public.meal_plans 
ADD COLUMN total_calories numeric DEFAULT 0,
ADD COLUMN total_protein numeric DEFAULT 0,
ADD COLUMN total_carbs numeric DEFAULT 0,
ADD COLUMN total_fat numeric DEFAULT 0;

COMMENT ON COLUMN public.meal_plans.total_calories IS 'Total real de calorias calculado para o plano';
COMMENT ON COLUMN public.meal_plans.total_protein IS 'Total real de proteínas calculado para o plano';
COMMENT ON COLUMN public.meal_plans.total_carbs IS 'Total real de carboidratos calculado para o plano';
COMMENT ON COLUMN public.meal_plans.total_fat IS 'Total real de gorduras calculado para o plano';