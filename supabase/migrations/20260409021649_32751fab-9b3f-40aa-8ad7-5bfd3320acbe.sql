
-- ============================================================
-- FIX 1: booking_payments INSERT - validate nutritionist exists
-- ============================================================
DROP POLICY IF EXISTS "Anyone can insert booking payments with valid data" ON public.booking_payments;
DROP POLICY IF EXISTS "booking_insert_valid_nutritionist" ON public.booking_payments;

CREATE POLICY "booking_insert_valid_nutritionist"
ON public.booking_payments
FOR INSERT
WITH CHECK (
  (length(customer_name) > 0) AND (length(customer_name) <= 200)
  AND (length(customer_email) > 2) AND (length(customer_email) <= 320)
  AND (amount > 0::numeric)
  AND (nutritionist_id IS NOT NULL)
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = booking_payments.nutritionist_id
      AND ur.role = 'nutritionist'::app_role
  )
);

-- ============================================================
-- FIX 2: lead_requests INSERT - validate nutritionist exists
-- ============================================================
DROP POLICY IF EXISTS "Anyone can submit lead requests with valid data" ON public.lead_requests;
DROP POLICY IF EXISTS "lead_insert_valid_nutritionist" ON public.lead_requests;

CREATE POLICY "lead_insert_valid_nutritionist"
ON public.lead_requests
FOR INSERT
WITH CHECK (
  (length(name) > 0) AND (length(name) <= 200)
  AND (length(email) > 2) AND (length(email) <= 320)
  AND (length(COALESCE(message, ''::text)) <= 2000)
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = lead_requests.nutritionist_id
      AND ur.role = 'nutritionist'::app_role
  )
);

-- ============================================================
-- FIX 3: WhatsApp token vault functions
-- ============================================================
CREATE EXTENSION IF NOT EXISTS supabase_vault;

-- Store token securely (called from edge functions with service role)
CREATE OR REPLACE FUNCTION public.store_whatsapp_token(
  _professional_id uuid,
  _token text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _secret_name text;
  _existing_id uuid;
BEGIN
  _secret_name := 'whatsapp_token_' || _professional_id::text;

  SELECT id INTO _existing_id FROM vault.secrets WHERE name = _secret_name LIMIT 1;

  IF _existing_id IS NOT NULL THEN
    UPDATE vault.secrets SET secret = _token, updated_at = now() WHERE id = _existing_id;
  ELSE
    INSERT INTO vault.secrets (name, secret, description)
    VALUES (_secret_name, _token, 'WhatsApp API token for professional ' || _professional_id::text);
  END IF;
END;
$$;

-- Retrieve token (called from edge functions with service role)
CREATE OR REPLACE FUNCTION public.get_whatsapp_token(_professional_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _secret_name text;
  _token text;
BEGIN
  _secret_name := 'whatsapp_token_' || _professional_id::text;
  
  SELECT decrypted_secret INTO _token
  FROM vault.decrypted_secrets
  WHERE name = _secret_name
  LIMIT 1;
  
  RETURN _token;
END;
$$;

-- Migrate existing tokens to vault via the SECURITY DEFINER function
CREATE OR REPLACE FUNCTION public._migrate_whatsapp_tokens_to_vault()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _rec record;
BEGIN
  FOR _rec IN
    SELECT professional_id, token
    FROM public.whatsapp_integrations
    WHERE token IS NOT NULL AND token != ''
  LOOP
    BEGIN
      PERFORM public.store_whatsapp_token(_rec.professional_id, _rec.token);
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Failed to migrate token for %: %', _rec.professional_id, SQLERRM;
    END;
  END LOOP;
END;
$$;

-- Run migration
SELECT public._migrate_whatsapp_tokens_to_vault();

-- Drop the migration function
DROP FUNCTION IF EXISTS public._migrate_whatsapp_tokens_to_vault();

-- Drop plaintext token column
ALTER TABLE public.whatsapp_integrations DROP COLUMN IF EXISTS token;

-- ============================================================
-- FIX 4: Safer tenant resolution
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_user_active_tenant(_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _tenant_id uuid;
BEGIN
  SELECT tenant_id INTO _tenant_id
  FROM public.user_tenants
  WHERE user_id = _user_id
    AND is_active = true
  ORDER BY joined_at ASC
  LIMIT 1;
  
  RETURN _tenant_id;
END;
$$;
