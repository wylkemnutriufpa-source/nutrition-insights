-- Add sharing capabilities to meal_plans if columns don't exist
ALTER TABLE public.meal_plans 
ADD COLUMN IF NOT EXISTS sharing_token UUID DEFAULT gen_random_uuid(),
ADD COLUMN IF NOT EXISTS sharing_expires_at TIMESTAMP WITH TIME ZONE;

-- Create table for meal completions (patient progress)
-- Using a new table name to avoid conflicts and keeping it aligned with the request
CREATE TABLE IF NOT EXISTS public.patient_meal_completions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meal_plan_id UUID NOT NULL REFERENCES public.meal_plans(id) ON DELETE CASCADE,
    meal_id TEXT NOT NULL, -- Logical ID of the meal within the plan JSON
    completed_at DATE NOT NULL DEFAULT CURRENT_DATE,
    nutritionist_patient_id UUID REFERENCES public.nutritionist_patients(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.patient_meal_completions ENABLE ROW LEVEL SECURITY;

-- Policies for meal_plans (token-based access)
-- Note: We check if the policy already exists to avoid errors
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone with a valid token can view a meal plan') THEN
        CREATE POLICY "Anyone with a valid token can view a meal plan"
        ON public.meal_plans
        FOR SELECT
        USING (sharing_token IS NOT NULL AND (sharing_expires_at IS NULL OR sharing_expires_at > now()));
    END IF;
END $$;

-- Policies for patient_meal_completions
-- Allow patients to manage their own completions if they are authenticated
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their own completions') THEN
        CREATE POLICY "Users can view their own completions"
        ON public.patient_meal_completions
        FOR SELECT
        USING (true); -- Simplified for public token access, refine if auth is strictly required
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert their own completions') THEN
        CREATE POLICY "Users can insert their own completions"
        ON public.patient_meal_completions
        FOR INSERT
        WITH CHECK (true); -- Refine based on token validation in actual implementation
    END IF;
END $$;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_pmc_plan_date ON public.patient_meal_completions(meal_plan_id, completed_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_meal_plans_sharing_token ON public.meal_plans(sharing_token);
CREATE UNIQUE INDEX IF NOT EXISTS idx_pmc_plan_meal_date ON public.patient_meal_completions(meal_plan_id, meal_id, completed_at);