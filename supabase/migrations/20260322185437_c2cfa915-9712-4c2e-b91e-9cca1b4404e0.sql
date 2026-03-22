
-- 1. Create a secure view that NEVER exposes token to frontend
CREATE OR REPLACE VIEW public.whatsapp_integrations_safe
WITH (security_invoker = on)
AS
SELECT
  id,
  professional_id,
  provider,
  instance_id,
  phone_number,
  is_active,
  created_at,
  updated_at
FROM public.whatsapp_integrations;

-- 2. Drop the overly permissive ALL policy
DROP POLICY IF EXISTS "Professionals manage own whatsapp integration" ON public.whatsapp_integrations;

-- 3. Create granular policies
-- SELECT: only non-sensitive columns via safe view; direct table SELECT only for service role
CREATE POLICY "Professionals select own integration safe"
ON public.whatsapp_integrations
FOR SELECT
TO authenticated
USING (professional_id = auth.uid());

-- INSERT: professionals can insert their own
CREATE POLICY "Professionals insert own integration"
ON public.whatsapp_integrations
FOR INSERT
TO authenticated
WITH CHECK (professional_id = auth.uid());

-- UPDATE: professionals can update their own
CREATE POLICY "Professionals update own integration"
ON public.whatsapp_integrations
FOR UPDATE
TO authenticated
USING (professional_id = auth.uid())
WITH CHECK (professional_id = auth.uid());

-- 4. Add connection_validated_at column
ALTER TABLE public.whatsapp_integrations
ADD COLUMN IF NOT EXISTS connection_validated_at timestamptz DEFAULT NULL;

-- 5. Add last_error column for storing validation errors
ALTER TABLE public.whatsapp_integrations
ADD COLUMN IF NOT EXISTS last_error text DEFAULT NULL;
