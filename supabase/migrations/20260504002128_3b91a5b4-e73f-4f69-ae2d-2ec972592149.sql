-- Add protocol fields to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS protocol_type TEXT DEFAULT 'default_v3';

-- Add audit fields to meal_plans
ALTER TABLE public.meal_plans
ADD COLUMN IF NOT EXISTS protocol_used TEXT,
ADD COLUMN IF NOT EXISTS engine_version TEXT,
ADD COLUMN IF NOT EXISTS plan_version TEXT DEFAULT '1.0.0';

-- Add index for performance on protocol lookups
CREATE INDEX IF NOT EXISTS idx_profiles_protocol_type ON public.profiles(protocol_type);
CREATE INDEX IF NOT EXISTS idx_meal_plans_protocol_used ON public.meal_plans(protocol_used);
