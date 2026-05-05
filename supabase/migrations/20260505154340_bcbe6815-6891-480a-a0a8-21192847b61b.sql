-- Fix systemic onboarding loop by marking appropriate patients as completed
UPDATE public.profiles
SET onboarding_completed = true,
    patient_state = 'active_plan'
WHERE patient_state IN ('active_plan', 'plan_generated', 'ready_for_plan', 'collecting_profile')
   OR id IN (
     SELECT patient_id FROM public.meal_plans WHERE is_active = true AND plan_status = 'published_to_patient'
   );

-- Also ensure any user who already has a completed anamnesis is at least in anamnesis state or beyond
UPDATE public.profiles
SET patient_state = 'anamnesis'
WHERE patient_state = 'onboarding_slides'
  AND user_id IN (SELECT user_id FROM public.patient_anamnesis WHERE status = 'completed');