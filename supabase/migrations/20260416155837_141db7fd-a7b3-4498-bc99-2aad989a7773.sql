
-- Create meal_recipes table for reusable meal templates (marmitas)
CREATE TABLE public.meal_recipes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  meal_type TEXT NOT NULL DEFAULT 'almoço',
  foods_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  nutritionist_id UUID NOT NULL,
  tenant_id UUID REFERENCES public.tenants(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.meal_recipes ENABLE ROW LEVEL SECURITY;

-- Nutritionists can view their own recipes
CREATE POLICY "Nutritionists can view own meal_recipes"
ON public.meal_recipes FOR SELECT
TO authenticated
USING (auth.uid() = nutritionist_id);

-- Nutritionists can create their own recipes
CREATE POLICY "Nutritionists can create meal_recipes"
ON public.meal_recipes FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = nutritionist_id);

-- Nutritionists can update their own recipes
CREATE POLICY "Nutritionists can update own meal_recipes"
ON public.meal_recipes FOR UPDATE
TO authenticated
USING (auth.uid() = nutritionist_id);

-- Nutritionists can delete their own recipes
CREATE POLICY "Nutritionists can delete own meal_recipes"
ON public.meal_recipes FOR DELETE
TO authenticated
USING (auth.uid() = nutritionist_id);

-- Timestamp trigger
CREATE TRIGGER update_meal_recipes_updated_at
BEFORE UPDATE ON public.meal_recipes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Index for fast lookups
CREATE INDEX idx_meal_recipes_nutritionist ON public.meal_recipes(nutritionist_id);
CREATE INDEX idx_meal_recipes_meal_type ON public.meal_recipes(meal_type);
