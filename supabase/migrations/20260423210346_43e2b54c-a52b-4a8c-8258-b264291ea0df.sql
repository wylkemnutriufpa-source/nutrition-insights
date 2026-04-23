-- First, populate any NULL values based on basic classification
UPDATE public.meal_recipes 
SET protein_type = 'FRANGO', visual_library_item_id = 'db86423f-bf3a-4eb8-b660-1d2f2dc559f6'
WHERE protein_type IS NULL OR visual_library_item_id IS NULL;

-- Now make them NOT NULL
ALTER TABLE public.meal_recipes 
ALTER COLUMN protein_type SET NOT NULL,
ALTER COLUMN protein_type SET DEFAULT 'FRANGO',
ALTER COLUMN visual_library_item_id SET NOT NULL,
ALTER COLUMN visual_library_item_id SET DEFAULT 'db86423f-bf3a-4eb8-b660-1d2f2dc559f6';

-- Add a constraint to ensure visual_library_item_id exists
ALTER TABLE public.meal_recipes
ADD CONSTRAINT fk_meal_recipes_visual_library
FOREIGN KEY (visual_library_item_id) 
REFERENCES public.meal_visual_library(id);

-- Create a table for Clinical Engine Audit Logs
CREATE TABLE IF NOT EXISTS public.clinical_engine_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    patient_id UUID NOT NULL,
    meal_plan_id UUID,
    event_type TEXT NOT NULL, -- e.g., 'plan_generation'
    marmita_name TEXT,
    protein_type TEXT,
    image_url TEXT,
    resolution_source TEXT, -- 'library', 'fallback', 'default'
    metadata JSONB
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_patient ON public.clinical_engine_audit_logs(patient_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.clinical_engine_audit_logs(created_at);
