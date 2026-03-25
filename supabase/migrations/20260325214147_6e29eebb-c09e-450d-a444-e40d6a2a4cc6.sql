
-- Add comprehensive fields to trainer_assessments for the intelligent anamnesis
ALTER TABLE public.trainer_assessments
  -- Exercise readiness screening (PAR-Q style)
  ADD COLUMN IF NOT EXISTS readiness_screening jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS requires_medical_review boolean DEFAULT false,
  
  -- Pain details
  ADD COLUMN IF NOT EXISTS current_pain boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS pain_locations jsonb DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS pain_intensity integer,
  ADD COLUMN IF NOT EXISTS does_physiotherapy boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_medical_report boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS movements_to_avoid text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS movements_that_worsen text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS specific_conditions text[] DEFAULT '{}',
  
  -- Training history
  ADD COLUMN IF NOT EXISTS has_trained_before boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS training_years integer,
  ADD COLUMN IF NOT EXISTS last_training_period text,
  ADD COLUMN IF NOT EXISTS perceived_level text DEFAULT 'beginner',
  ADD COLUMN IF NOT EXISTS modalities_practiced text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS previous_frequency integer,
  ADD COLUMN IF NOT EXISTS liked_exercises text,
  ADD COLUMN IF NOT EXISTS disliked_exercises text,
  ADD COLUMN IF NOT EXISTS training_difficulties text,
  
  -- Availability & structure  
  ADD COLUMN IF NOT EXISTS available_hours text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS session_duration integer DEFAULT 60,
  ADD COLUMN IF NOT EXISTS training_location text DEFAULT 'gym',
  ADD COLUMN IF NOT EXISTS training_modality text DEFAULT 'presencial',
  ADD COLUMN IF NOT EXISTS work_routine text,
  ADD COLUMN IF NOT EXISTS sleep_quality text,
  ADD COLUMN IF NOT EXISTS energy_level text,
  
  -- Goals
  ADD COLUMN IF NOT EXISTS primary_goal text,
  ADD COLUMN IF NOT EXISTS secondary_goals text[] DEFAULT '{}',
  
  -- Coaching style
  ADD COLUMN IF NOT EXISTS coaching_intensity text DEFAULT 'moderate',
  ADD COLUMN IF NOT EXISTS wants_reminders boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS wants_video_tutorials boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS wants_post_workout_feedback boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS plan_flexibility text DEFAULT 'flexible',
  
  -- Synced data snapshot
  ADD COLUMN IF NOT EXISTS synced_patient_data jsonb DEFAULT '{}',
  
  -- Wizard progress
  ADD COLUMN IF NOT EXISTS wizard_step integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_complete boolean DEFAULT false;
