-- 1) AFFILIATE_REFERRALS — Real email masking
DROP POLICY IF EXISTS "Affiliates view own referrals (email masked)" ON public.affiliate_referrals;
REVOKE SELECT ON public.affiliate_referrals FROM authenticated, anon;
GRANT SELECT (
  id, affiliate_id, referral_code_used, referred_type,
  referred_plan, status, created_at, converted_at, referred_user_id
) ON public.affiliate_referrals TO authenticated;

CREATE POLICY "Affiliates view own referrals (no email)"
ON public.affiliate_referrals
FOR SELECT
TO authenticated
USING (
  affiliate_id IN (
    SELECT id FROM public.affiliates WHERE user_id = auth.uid()
  )
);

-- 2) PUBLIC_PROFILE_SETTINGS — Hide nutritionist_id from anonymous
DROP POLICY IF EXISTS "Anyone can view public profiles" ON public.public_profile_settings;

CREATE POLICY "Authenticated read public profiles"
ON public.public_profile_settings
FOR SELECT
TO authenticated
USING (is_public = true OR auth.uid() = nutritionist_id);

CREATE OR REPLACE VIEW public.public_profile_settings_safe
WITH (security_invoker = false)
AS
SELECT
  id, slug, is_public, bio, specialties,
  booking_enabled, booking_price, booking_payment_required,
  created_at, updated_at
FROM public.public_profile_settings
WHERE is_public = true;

GRANT SELECT ON public.public_profile_settings_safe TO anon, authenticated;

-- 3) AUDIT_LOGS — Tenant-scoped admin SELECT (using user_tenants)
DROP POLICY IF EXISTS "Admins can view all audit logs" ON public.audit_logs;

CREATE POLICY "Admins view audit logs of their tenant"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  AND tenant_id IN (
    SELECT tenant_id FROM public.user_tenants WHERE user_id = auth.uid()
  )
);