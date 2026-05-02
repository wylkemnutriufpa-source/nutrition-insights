-- Remove legacy columns and all dependent triggers/objects
ALTER TABLE public.profiles DROP COLUMN IF EXISTS fit_intelligence_onboarded CASCADE;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS is_anamnesis_completed CASCADE;

-- Ensure patient_state is never null
UPDATE public.profiles SET patient_state = 'onboarding_slides' WHERE patient_state IS NULL;
ALTER TABLE public.profiles ALTER COLUMN patient_state SET DEFAULT 'onboarding_slides';
ALTER TABLE public.profiles ALTER COLUMN patient_state SET NOT NULL;
