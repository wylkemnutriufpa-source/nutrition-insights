
-- Add strategic fields to feature_registry
ALTER TABLE public.feature_registry 
  ADD COLUMN IF NOT EXISTS emotional_impact text NOT NULL DEFAULT 'medium' CHECK (emotional_impact IN ('low', 'medium', 'high', 'transformador')),
  ADD COLUMN IF NOT EXISTS journey_phase text NOT NULL DEFAULT 'adaptation' CHECK (journey_phase IN ('start', 'adaptation', 'acceleration', 'consolidation')),
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'experience_engagement' CHECK (category IN ('patient_journey', 'professional_journey', 'clinical_intelligence', 'performance_results', 'experience_engagement')),
  ADD COLUMN IF NOT EXISTS is_premium boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS version_history jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Update existing features with strategic classifications
UPDATE public.feature_registry SET 
  emotional_impact = 'high', journey_phase = 'start', category = 'professional_journey'
  WHERE feature_key IN ('cockpit', 'meal_editor', 'clinical_engine');

UPDATE public.feature_registry SET 
  emotional_impact = 'medium', journey_phase = 'acceleration', category = 'clinical_intelligence'
  WHERE feature_key IN ('analytics', 'clinical_alerts');

UPDATE public.feature_registry SET 
  emotional_impact = 'medium', journey_phase = 'consolidation', category = 'professional_journey'
  WHERE feature_key IN ('protocols', 'automation');

UPDATE public.feature_registry SET 
  emotional_impact = 'high', journey_phase = 'start', category = 'experience_engagement'
  WHERE feature_key IN ('chat', 'gamification');

UPDATE public.feature_registry SET 
  emotional_impact = 'transformador', journey_phase = 'acceleration', category = 'performance_results', is_premium = true
  WHERE feature_key = 'biquini_branco';

UPDATE public.feature_registry SET 
  emotional_impact = 'high', journey_phase = 'start', category = 'patient_journey'
  WHERE feature_key IN ('daily_routine', 'meal_plan_view');

UPDATE public.feature_registry SET 
  emotional_impact = 'high', journey_phase = 'adaptation', category = 'patient_journey'
  WHERE feature_key IN ('progress_tracking', 'results_view');

UPDATE public.feature_registry SET 
  emotional_impact = 'transformador', journey_phase = 'consolidation', category = 'experience_engagement'
  WHERE feature_key IN ('support_system', 'prestige');
