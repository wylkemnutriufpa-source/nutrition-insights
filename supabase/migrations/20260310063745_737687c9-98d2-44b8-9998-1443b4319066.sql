
-- Public profile settings for nutritionists
CREATE TABLE public.public_profile_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nutritionist_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slug text NOT NULL UNIQUE,
  is_public boolean NOT NULL DEFAULT false,
  bio text DEFAULT '',
  specialties text[] DEFAULT '{}',
  booking_enabled boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(nutritionist_id)
);

ALTER TABLE public.public_profile_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can view public profiles
CREATE POLICY "Anyone can view public profiles"
  ON public.public_profile_settings FOR SELECT
  TO public
  USING (is_public = true);

-- Nutritionists manage own profile
CREATE POLICY "Nutritionists manage own public profile"
  ON public.public_profile_settings FOR ALL
  TO authenticated
  USING (auth.uid() = nutritionist_id)
  WITH CHECK (auth.uid() = nutritionist_id);

-- Admins view all
CREATE POLICY "Admins view all public profiles"
  ON public.public_profile_settings FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Lead requests from public pages
CREATE TABLE public.lead_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nutritionist_id uuid NOT NULL,
  program_id uuid REFERENCES public.programs(id) ON DELETE SET NULL,
  referral_code text,
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  message text,
  source text NOT NULL DEFAULT 'profile',
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.lead_requests ENABLE ROW LEVEL SECURITY;

-- Anyone can insert leads (public form)
CREATE POLICY "Anyone can submit lead requests"
  ON public.lead_requests FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Nutritionists view own leads
CREATE POLICY "Nutritionists view own leads"
  ON public.lead_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = nutritionist_id);

-- Nutritionists update own leads
CREATE POLICY "Nutritionists update own leads"
  ON public.lead_requests FOR UPDATE
  TO authenticated
  USING (auth.uid() = nutritionist_id);

-- Admins view all leads
CREATE POLICY "Admins view all leads"
  ON public.lead_requests FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Patient referrals
CREATE TABLE public.patient_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  nutritionist_id uuid NOT NULL,
  program_id uuid REFERENCES public.programs(id) ON DELETE SET NULL,
  referral_code text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(6), 'hex'),
  clicks integer NOT NULL DEFAULT 0,
  leads_generated integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.patient_referrals ENABLE ROW LEVEL SECURITY;

-- Patients manage own referrals
CREATE POLICY "Patients manage own referrals"
  ON public.patient_referrals FOR ALL
  TO authenticated
  USING (auth.uid() = patient_id)
  WITH CHECK (auth.uid() = patient_id);

-- Nutritionists view referrals from their patients
CREATE POLICY "Nutritionists view patient referrals"
  ON public.patient_referrals FOR SELECT
  TO authenticated
  USING (auth.uid() = nutritionist_id);

-- Admins view all
CREATE POLICY "Admins view all referrals"
  ON public.patient_referrals FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Anyone can read referrals by code (for public link resolution)
CREATE POLICY "Public read referral by code"
  ON public.patient_referrals FOR SELECT
  TO anon
  USING (is_active = true);
