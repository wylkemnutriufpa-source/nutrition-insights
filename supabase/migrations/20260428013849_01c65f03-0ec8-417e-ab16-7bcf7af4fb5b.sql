-- Create user_linkage_log table
CREATE TABLE IF NOT EXISTS public.user_linkage_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    email TEXT,
    invite_code TEXT,
    nutritionist_id_resolved UUID,
    tenant_id_resolved UUID,
    status TEXT NOT NULL, -- 'success', 'failure'
    error_message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_linkage_log ENABLE ROW LEVEL SECURITY;

-- Allow admins/system to view logs (can be restricted further as needed)
CREATE POLICY "Admins can view linkage logs" 
ON public.user_linkage_log 
FOR SELECT 
USING (true);

-- Update handle_new_user to use this log table
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role app_role := 'patient'; 
  v_nutri_id UUID;
  v_tenant_id UUID;
  v_invitation_id UUID;
  v_invite_code TEXT;
  v_error_msg TEXT;
  v_success BOOLEAN := FALSE;
BEGIN
  -- 1. Create Profile
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''))
  ON CONFLICT (user_id) DO UPDATE SET
    full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), profiles.full_name);

  -- 2. Handle Role Assignment
  IF (NEW.raw_user_meta_data->>'role') = 'nutritionist' THEN
    v_role := 'nutritionist';
  ELSIF (NEW.raw_user_meta_data->>'role') = 'personal' THEN
    v_role := 'personal';
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, v_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  -- 3. Automatic Linkage for Patients
  IF v_role = 'patient' THEN
    -- A. Check metadata (Priority 1)
    v_nutri_id := (NEW.raw_user_meta_data->>'nutritionist_id')::UUID;
    v_invite_code := NEW.raw_user_meta_data->>'invitation_code';

    -- B. Lookup by invite code (Priority 2)
    IF v_nutri_id IS NULL AND v_invite_code IS NOT NULL THEN
       SELECT professional_id, tenant_id, id
       INTO v_nutri_id, v_tenant_id, v_invitation_id
       FROM public.invitations
       WHERE code = v_invite_code
       AND status IN ('pending', 'sent')
       LIMIT 1;
    END IF;

    -- C. Lookup by email (Priority 3)
    IF v_nutri_id IS NULL THEN
      SELECT professional_id, tenant_id, id
      INTO v_nutri_id, v_tenant_id, v_invitation_id
      FROM public.invitations
      WHERE LOWER(patient_email) = LOWER(NEW.email)
      AND status IN ('pending', 'sent')
      ORDER BY created_at DESC
      LIMIT 1;
    END IF;

    -- D. Process Linkage
    IF v_nutri_id IS NOT NULL THEN
      IF v_tenant_id IS NULL THEN
        SELECT id INTO v_tenant_id FROM public.tenants WHERE owner_id = v_nutri_id LIMIT 1;
      END IF;

      IF v_tenant_id IS NOT NULL THEN
        -- Linkage Logic
        UPDATE public.profiles SET tenant_id = v_tenant_id, is_orphan = false WHERE user_id = NEW.id;
        
        INSERT INTO public.user_tenants (user_id, tenant_id, role, is_active)
        VALUES (NEW.id, v_tenant_id, 'patient'::tenant_role, true)
        ON CONFLICT (user_id, tenant_id) DO UPDATE SET is_active = true;

        INSERT INTO public.nutritionist_patients (nutritionist_id, patient_id, tenant_id, status, journey_status, attendance_mode)
        VALUES (v_nutri_id, NEW.id, v_tenant_id, 'active', 'awaiting_consent', 'online')
        ON CONFLICT (nutritionist_id, patient_id) DO UPDATE SET status = 'active', tenant_id = v_tenant_id;

        IF v_invitation_id IS NOT NULL THEN
          UPDATE public.invitations SET status = 'completed', used_at = now() WHERE id = v_invitation_id;
        END IF;

        v_success := TRUE;
      ELSE
        v_error_msg := 'Tenant not found for resolved nutritionist ' || v_nutri_id::TEXT;
      END IF;
    ELSE
      v_error_msg := 'No linkage resolved (metadata, code, or email)';
    END IF;

    -- E. Log to user_linkage_log
    INSERT INTO public.user_linkage_log (
      user_id, email, invite_code, nutritionist_id_resolved, tenant_id_resolved, 
      status, error_message, metadata
    ) VALUES (
      NEW.id, NEW.email, v_invite_code, v_nutri_id, v_tenant_id,
      CASE WHEN v_success THEN 'success' ELSE 'failure' END,
      v_error_msg,
      jsonb_build_object('metadata', NEW.raw_user_meta_data)
    );

    -- F. Onboarding errors for failures
    IF NOT v_success THEN
      INSERT INTO public.onboarding_runtime_errors (patient_id, context, error_message, error_payload)
      VALUES (NEW.id, 'trigger_linkage', v_error_msg, 
        jsonb_build_object('email', NEW.email, 'invite_code', v_invite_code));
      
      UPDATE public.profiles SET is_orphan = true WHERE user_id = NEW.id;
    END IF;
  END IF;

  -- 4. Player Stats
  INSERT INTO public.player_stats (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
