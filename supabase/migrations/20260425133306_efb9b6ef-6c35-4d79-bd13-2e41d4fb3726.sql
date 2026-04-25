-- Force complete all onboarding pipelines for patients who already have published plans
UPDATE public.onboarding_pipelines
SET status = 'completed',
    updated_at = now()
WHERE status NOT IN ('completed', 'plan_delivered', 'finished')
  AND patient_id IN (
    SELECT patient_id 
    FROM public.meal_plans 
    WHERE plan_status IN ('published', 'published_to_patient') 
      AND is_active = true
  );

-- Also ensure any other 'blocking' states in nutritionist_patients are cleared
UPDATE public.nutritionist_patients
SET journey_status = 'plan_published'
WHERE journey_status != 'plan_published'
  AND patient_id IN (
    SELECT patient_id 
    FROM public.meal_plans 
    WHERE plan_status IN ('published', 'published_to_patient') 
      AND is_active = true
  );
