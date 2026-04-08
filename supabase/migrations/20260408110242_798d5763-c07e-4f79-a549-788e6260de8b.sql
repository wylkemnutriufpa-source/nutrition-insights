
-- Add nutritionist_id to pix_payment_configs
ALTER TABLE public.pix_payment_configs
ADD COLUMN nutritionist_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Anyone can read active pix configs" ON public.pix_payment_configs;
DROP POLICY IF EXISTS "Authenticated users can manage pix configs" ON public.pix_payment_configs;
DROP POLICY IF EXISTS "Admins can manage pix configs" ON public.pix_payment_configs;
DROP POLICY IF EXISTS "pix_payment_configs_select" ON public.pix_payment_configs;
DROP POLICY IF EXISTS "pix_payment_configs_insert" ON public.pix_payment_configs;
DROP POLICY IF EXISTS "pix_payment_configs_update" ON public.pix_payment_configs;
DROP POLICY IF EXISTS "pix_payment_configs_delete" ON public.pix_payment_configs;

-- Enable RLS
ALTER TABLE public.pix_payment_configs ENABLE ROW LEVEL SECURITY;

-- Owner can read their own configs
CREATE POLICY "Users can read own pix configs"
ON public.pix_payment_configs FOR SELECT
TO authenticated
USING (nutritionist_id = auth.uid());

-- Owner can insert their own configs
CREATE POLICY "Users can insert own pix configs"
ON public.pix_payment_configs FOR INSERT
TO authenticated
WITH CHECK (nutritionist_id = auth.uid());

-- Owner can update their own configs
CREATE POLICY "Users can update own pix configs"
ON public.pix_payment_configs FOR UPDATE
TO authenticated
USING (nutritionist_id = auth.uid());

-- Owner can delete their own configs
CREATE POLICY "Users can delete own pix configs"
ON public.pix_payment_configs FOR DELETE
TO authenticated
USING (nutritionist_id = auth.uid());

-- Public read for patient-facing (active configs by specific nutritionist via public plans)
CREATE POLICY "Public can read active pix configs"
ON public.pix_payment_configs FOR SELECT
TO anon
USING (is_active = true);
