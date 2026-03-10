
-- Professional profiles for SaaS multi-tenant management
CREATE TABLE public.professional_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  plan_id uuid REFERENCES public.pricing_plans(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'active',
  clinic_name text,
  onboarding_completed boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.professional_profiles ENABLE ROW LEVEL SECURITY;

-- Admins can manage all professional profiles
CREATE POLICY "Admins manage professional profiles"
ON public.professional_profiles FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Professionals can view and update their own profile
CREATE POLICY "Professionals view own profile"
ON public.professional_profiles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Professionals update own profile"
ON public.professional_profiles FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_professional_profiles_updated_at
  BEFORE UPDATE ON public.professional_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RPC: Reset professional password (admin only)
CREATE OR REPLACE FUNCTION public.reset_professional_password(_user_id uuid, _new_password text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can reset passwords';
  END IF;

  UPDATE auth.users
  SET encrypted_password = extensions.crypt(_new_password, extensions.gen_salt('bf')),
      updated_at = now()
  WHERE id = _user_id;
END;
$$;
