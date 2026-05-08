-- 1. ENUM FOR ROLES
DO $$ BEGIN
    CREATE TYPE public.nc_app_role AS ENUM ('nutritionist', 'patient', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. PROFILES (Isolated professional data)
CREATE TABLE IF NOT EXISTS public.nc_profiles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE,
    full_name TEXT,
    role public.nc_app_role NOT NULL DEFAULT 'nutritionist',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. PATIENTS (Linked to professional)
CREATE TABLE IF NOT EXISTS public.nc_patients (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    nutritionist_id UUID REFERENCES public.nc_profiles(id) ON DELETE CASCADE NOT NULL,
    user_id UUID UNIQUE, -- If the patient has an auth account
    full_name TEXT NOT NULL,
    email TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. ONBOARDING DATA (Consolidated Anamnesis + Body + Prefs)
CREATE TABLE IF NOT EXISTS public.nc_onboarding_data (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    patient_id UUID REFERENCES public.nc_patients(id) ON DELETE CASCADE NOT NULL UNIQUE,
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_complete BOOLEAN DEFAULT false,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 5. MEAL PLANS (Header)
CREATE TABLE IF NOT EXISTS public.nc_meal_plans (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    patient_id UUID REFERENCES public.nc_patients(id) ON DELETE CASCADE NOT NULL,
    nutritionist_id UUID REFERENCES public.nc_profiles(id) NOT NULL,
    title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft', -- draft, published, archived
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 6. MEAL PLAN ITEMS (Content)
CREATE TABLE IF NOT EXISTS public.nc_meal_plan_items (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    plan_id UUID REFERENCES public.nc_meal_plans(id) ON DELETE CASCADE NOT NULL,
    meal_type TEXT NOT NULL, -- breakfast, lunch, snack, dinner, etc.
    food_name TEXT NOT NULL,
    quantity NUMERIC NOT NULL,
    unit TEXT NOT NULL,
    calories NUMERIC DEFAULT 0,
    protein NUMERIC DEFAULT 0,
    carbs NUMERIC DEFAULT 0,
    fat NUMERIC DEFAULT 0,
    sort_order INTEGER DEFAULT 0
);

-- 7. FOOD LIBRARY (Validated core items)
CREATE TABLE IF NOT EXISTS public.nc_food_library (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL, -- protein, carb, fat, fruit, etc.
    base_quantity NUMERIC DEFAULT 100,
    unit TEXT DEFAULT 'g',
    calories NUMERIC NOT NULL,
    protein NUMERIC NOT NULL,
    carbs NUMERIC NOT NULL,
    fat NUMERIC NOT NULL,
    is_global BOOLEAN DEFAULT true
);

-- ENABLE RLS
ALTER TABLE public.nc_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nc_patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nc_onboarding_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nc_meal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nc_meal_plan_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nc_food_library ENABLE ROW LEVEL SECURITY;

-- POLICIES: PROFILES
DROP POLICY IF EXISTS "Users can view their own profile" ON public.nc_profiles;
CREATE POLICY "Users can view their own profile" ON public.nc_profiles FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.nc_profiles;
CREATE POLICY "Users can update their own profile" ON public.nc_profiles FOR UPDATE USING (auth.uid() = user_id);

-- POLICIES: PATIENTS
DROP POLICY IF EXISTS "Nutritionists manage their patients" ON public.nc_patients;
CREATE POLICY "Nutritionists manage their patients" ON public.nc_patients 
FOR ALL USING (nutritionist_id IN (SELECT p_sub.id FROM public.nc_profiles p_sub WHERE p_sub.user_id = auth.uid()));

-- POLICIES: ONBOARDING
DROP POLICY IF EXISTS "Nutritionists manage patient onboarding" ON public.nc_onboarding_data;
CREATE POLICY "Nutritionists manage patient onboarding" ON public.nc_onboarding_data
FOR ALL USING (patient_id IN (SELECT pat.id FROM public.nc_patients pat JOIN public.nc_profiles prof ON pat.nutritionist_id = prof.id WHERE prof.user_id = auth.uid()));

-- POLICIES: MEAL PLANS
DROP POLICY IF EXISTS "Nutritionists manage their plans" ON public.nc_meal_plans;
CREATE POLICY "Nutritionists manage their plans" ON public.nc_meal_plans
FOR ALL USING (nutritionist_id IN (SELECT p_sub.id FROM public.nc_profiles p_sub WHERE p_sub.user_id = auth.uid()));

DROP POLICY IF EXISTS "Patients view their own active plans" ON public.nc_meal_plans;
CREATE POLICY "Patients view their own active plans" ON public.nc_meal_plans
FOR SELECT USING (patient_id IN (SELECT pat.id FROM public.nc_patients pat WHERE pat.user_id = auth.uid()) AND status = 'published');

-- POLICIES: MEAL ITEMS
DROP POLICY IF EXISTS "Nutritionists manage plan items" ON public.nc_meal_plan_items;
CREATE POLICY "Nutritionists manage plan items" ON public.nc_meal_plan_items
FOR ALL USING (plan_id IN (SELECT mp.id FROM public.nc_meal_plans mp JOIN public.nc_profiles prof ON mp.nutritionist_id = prof.id WHERE prof.user_id = auth.uid()));

-- POLICIES: FOOD LIBRARY
DROP POLICY IF EXISTS "Everyone can view food library" ON public.nc_food_library;
CREATE POLICY "Everyone can view food library" ON public.nc_food_library FOR SELECT USING (true);
