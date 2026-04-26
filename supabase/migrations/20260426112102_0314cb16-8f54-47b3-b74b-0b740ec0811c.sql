ALTER TABLE public.nutritionist_patients 
ADD COLUMN default_meal_plan_id UUID REFERENCES public.meal_plans(id);