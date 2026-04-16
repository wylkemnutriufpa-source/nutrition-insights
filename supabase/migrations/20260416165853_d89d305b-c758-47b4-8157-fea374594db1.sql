
-- Reset pipeline to force proper completion
UPDATE onboarding_pipelines 
SET anamnesis_completed = false,
    body_data_completed = true,
    preferences_completed = false,
    plan_generated = false,
    plan_approved = false,
    status = 'pending_anamnesis'
WHERE id = '5138f1bc-1cd2-476d-a523-ad9ad1846869'
  AND patient_id = '8ad20a58-6f9d-4a74-a4f8-8dfdfa0935d1';

-- Ensure journey_status is onboarding_active so she gets routed to onboarding
UPDATE nutritionist_patients
SET journey_status = 'onboarding_active'
WHERE patient_id = '8ad20a58-6f9d-4a74-a4f8-8dfdfa0935d1'
  AND status = 'active';
