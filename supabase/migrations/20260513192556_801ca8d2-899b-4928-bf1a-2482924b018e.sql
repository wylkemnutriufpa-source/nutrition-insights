-- Mark onboarding as completed for any patient who already has an active published plan
-- but is currently stuck in early onboarding states.
UPDATE public.profiles
SET onboarding_completed = true,
    patient_state = 'active_plan',
    updated_at = now()
WHERE user_id IN (
  SELECT patient_id 
  FROM public.meal_plans 
  WHERE is_active = true 
    AND plan_status IN ('published', 'published_to_patient')
)
AND (onboarding_completed = false OR patient_state IN ('onboarding_slides', 'anamnesis'));
