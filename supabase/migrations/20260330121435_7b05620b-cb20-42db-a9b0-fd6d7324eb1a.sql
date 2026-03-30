ALTER TABLE public.professional_profiles 
  ADD COLUMN IF NOT EXISTS coach_bodybuilder_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS personal_trainer_enabled boolean NOT NULL DEFAULT false;