-- Allow public to see if a user has a professional role
CREATE POLICY "Public can view professional user_roles"
ON public.user_roles
FOR SELECT
USING (role IN ('nutritionist'::public.app_role, 'personal'::public.app_role, 'admin'::public.app_role));

-- Allow public to see professional profiles
CREATE POLICY "Public can view professional profiles"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = profiles.user_id
    AND role IN ('nutritionist'::public.app_role, 'personal'::public.app_role, 'admin'::public.app_role)
  )
);

-- Allow public to see professional profile details (clinic name, etc)
-- First check if the policy exists to avoid errors
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'professional_profiles' 
        AND policyname = 'Public can view professional_profiles'
    ) THEN
        CREATE POLICY "Public can view professional_profiles"
        ON public.professional_profiles
        FOR SELECT
        USING (true);
    END IF;
END $$;
