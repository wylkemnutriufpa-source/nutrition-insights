
-- Add journey_status to nutritionist_patients for controlled onboarding flow
ALTER TABLE public.nutritionist_patients 
ADD COLUMN IF NOT EXISTS journey_status TEXT NOT NULL DEFAULT 'active';

-- For new patients: lead_created -> awaiting_payment -> awaiting_onboarding_release -> onboarding_active -> onboarding_completed -> clinical_followup_active
-- Existing patients default to 'active' (compatible with current system)

COMMENT ON COLUMN public.nutritionist_patients.journey_status IS 'Patient journey state: lead_created, awaiting_payment, awaiting_onboarding_release, onboarding_active, onboarding_completed, clinical_followup_active, active (legacy)';

-- Create a function to search professionals (for patient signup flow)
CREATE OR REPLACE FUNCTION public.search_professionals(_query TEXT, _limit INT DEFAULT 10)
RETURNS TABLE(
  user_id UUID,
  full_name TEXT,
  avatar_url TEXT,
  clinic_name TEXT,
  phone TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.user_id,
    p.full_name,
    p.avatar_url,
    pp.clinic_name,
    p.phone
  FROM profiles p
  INNER JOIN user_roles ur ON ur.user_id = p.user_id AND ur.role = 'nutritionist'
  LEFT JOIN professional_profiles pp ON pp.user_id = p.user_id
  WHERE 
    p.full_name ILIKE '%' || _query || '%'
    AND LENGTH(_query) >= 2
  ORDER BY p.full_name
  LIMIT _limit;
$$;
