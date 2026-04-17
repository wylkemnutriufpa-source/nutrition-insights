-- ============================================================================
-- SECURITY HARDENING — Realtime channel auth + Affiliate email masking
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) REALTIME — Lock down channel subscriptions
-- ----------------------------------------------------------------------------
-- Without RLS on realtime.messages, any authenticated user can subscribe to
-- any topic (including other patients' notifications, chats, alerts, etc.).
-- We allow subscriptions only when the topic explicitly references either:
--   (a) the subscriber's own user_id, OR
--   (b) a patient_id linked to the subscriber as a nutritionist/personal/admin.
-- Topics convention used across the app: "user:<uuid>", "patient:<uuid>",
-- "notifications:<uuid>", "chat:<uuid>" — all include a UUID we can match.

-- Helper: extract first UUID found in topic string
CREATE OR REPLACE FUNCTION public.extract_topic_uuid(_topic text)
RETURNS uuid
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT (regexp_match(_topic, '([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})'))[1]::uuid;
$$;

-- Helper: caller is linked professional for a patient
CREATE OR REPLACE FUNCTION public.is_linked_professional_for(_patient_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.nutritionist_patients
    WHERE patient_id = _patient_id
      AND nutritionist_id = auth.uid()
      AND status = 'active'
  );
$$;

-- Enable RLS on realtime.messages and add scoped policy
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated subscribe to own scoped topics" ON realtime.messages;
CREATE POLICY "Authenticated subscribe to own scoped topics"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  -- Admins see everything
  public.has_role(auth.uid(), 'admin'::app_role)
  OR (
    -- Topic must contain a UUID, and that UUID must reference the caller
    -- or a patient the caller is professionally linked to
    public.extract_topic_uuid(topic) IS NOT NULL AND (
      public.extract_topic_uuid(topic) = auth.uid()
      OR public.is_linked_professional_for(public.extract_topic_uuid(topic))
    )
  )
);

-- ----------------------------------------------------------------------------
-- 2) AFFILIATE_REFERRALS — Mask referred users' emails from affiliates
-- ----------------------------------------------------------------------------
-- The previous "Affiliates view own referrals" policy exposed referred_email
-- (PII) directly. We replace it with a policy that still lets the affiliate
-- read their own referral rows (needed for analytics) but emails are masked
-- via a column-level grant + view. Admins keep raw access.

-- Drop the over-permissive policy
DROP POLICY IF EXISTS "Affiliates view own referrals" ON public.affiliate_referrals;

-- Revoke direct table SELECT for authenticated; admins still have via policy
REVOKE SELECT ON public.affiliate_referrals FROM authenticated;

-- Re-grant column-level SELECT EXCLUDING referred_email
GRANT SELECT (
  id, affiliate_id, referral_code_used, referred_type,
  referred_plan, status, created_at, converted_at, referred_user_id
) ON public.affiliate_referrals TO authenticated;

-- New row-scoped policy: affiliate sees own rows (without email column access)
CREATE POLICY "Affiliates view own referrals (email masked)"
ON public.affiliate_referrals
FOR SELECT
TO authenticated
USING (
  affiliate_id IN (
    SELECT id FROM public.affiliates WHERE user_id = auth.uid()
  )
);

-- Safe view that returns a masked email for affiliates' UI
CREATE OR REPLACE VIEW public.affiliate_referrals_safe
WITH (security_invoker = true)
AS
SELECT
  r.id,
  r.affiliate_id,
  r.referral_code_used,
  r.referred_type,
  r.referred_plan,
  r.status,
  r.created_at,
  r.converted_at,
  r.referred_user_id,
  CASE
    WHEN public.has_role(auth.uid(), 'admin'::app_role) THEN r.referred_email
    WHEN position('@' IN r.referred_email) > 0 THEN
      left(split_part(r.referred_email, '@', 1), 2)
        || '***@'
        || left(split_part(r.referred_email, '@', 2), 2)
        || '***'
    ELSE '***'
  END AS referred_email_masked
FROM public.affiliate_referrals r;

GRANT SELECT ON public.affiliate_referrals_safe TO authenticated;