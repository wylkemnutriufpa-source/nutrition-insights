-- Recreate view as security_invoker so callers' RLS applies
DROP VIEW IF EXISTS public.public_profile_settings_safe;

CREATE VIEW public.public_profile_settings_safe
WITH (security_invoker = true)
AS
SELECT
  id, slug, is_public, bio, specialties,
  booking_enabled, booking_price, booking_payment_required,
  created_at, updated_at
FROM public.public_profile_settings
WHERE is_public = true;

GRANT SELECT ON public.public_profile_settings_safe TO anon, authenticated;

-- Allow anon to read public rows so the safe view works for unauthenticated visitors
CREATE POLICY "Anon read public profiles (safe columns)"
ON public.public_profile_settings
FOR SELECT
TO anon
USING (is_public = true);

-- Revoke direct SELECT on the underlying table for anon — they must use the view
-- (RLS still checks; column-level revoke ensures nutritionist_id is unreachable)
REVOKE SELECT ON public.public_profile_settings FROM anon;
GRANT SELECT (id, slug, is_public, bio, specialties, booking_enabled, booking_price, booking_payment_required, created_at, updated_at)
  ON public.public_profile_settings TO anon;