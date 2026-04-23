-- Add plan_type column to meal_library
ALTER TABLE public.meal_library 
ADD COLUMN IF NOT EXISTS plan_type TEXT DEFAULT 'normal' CHECK (plan_type IN ('normal', 'marmita'));

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_meal_library_plan_type ON public.meal_library(plan_type);

-- Ensure all current items are 'normal'
UPDATE public.meal_library SET plan_type = 'normal' WHERE plan_type IS NULL;
