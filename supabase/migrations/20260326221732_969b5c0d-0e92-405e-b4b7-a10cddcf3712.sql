ALTER TABLE public.ifj_patient_permissions 
ADD COLUMN IF NOT EXISTS substitutions boolean NOT NULL DEFAULT true;