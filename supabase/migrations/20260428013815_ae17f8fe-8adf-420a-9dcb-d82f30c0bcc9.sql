CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role app_role := 'patient'; 
  v_nutri_id UUID;
  v_tenant_id UUID;
  v_invitation_id UUID;
  v_invite_code TEXT;
  v_error_msg TEXT;
BEGIN
  -- 1. Create Profile
  -- Fix: remove 'email' column as it doesn't exist in profiles table
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
    -- A. Check metadata for nutritionist_id (Priority 1)
    v_nutri_id := (NEW.raw_user_meta_data->>'nutritionist_id')::UUID;
    
    -- B. Check metadata for invitation_code (Priority 2)
    v_invite_code := NEW.raw_user_meta_data->>'invitation_code';

    IF v_nutri_id IS NULL AND v_invite_code IS NOT NULL THEN
       SELECT professional_id, tenant_id, id
       INTO v_nutri_id, v_tenant_id, v_invitation_id
       FROM public.invitations
       WHERE code = v_invite_code
       AND status IN ('pending', 'sent')
       LIMIT 1;
       
       IF v_nutri_id IS NOT NULL THEN
          RAISE NOTICE 'Resolved nutritionist % via invite code %', v_nutri_id, v_invite_code;
       END IF;
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
      
      IF v_nutri_id IS NOT NULL THEN
         RAISE NOTICE 'Resolved nutritionist % via email %', v_nutri_id, NEW.email;
      END IF;
    END IF;

    -- D. Process Linkage if nutritionist resolved
    IF v_nutri_id IS NOT NULL THEN
      -- Resolve tenant if needed
      IF v_tenant_id IS NULL THEN
        SELECT id INTO v_tenant_id FROM public.tenants WHERE owner_id = v_nutri_id LIMIT 1;
      END IF;

      IF v_tenant_id IS NOT NULL THEN
        -- Update profile with resolved tenant
        UPDATE public.profiles 
        SET tenant_id = v_tenant_id, 
            is_orphan = false 
        WHERE user_id = NEW.id;

        -- Create membership in user_tenants
        INSERT INTO public.user_tenants (user_id, tenant_id, role, is_active)
        VALUES (NEW.id, v_tenant_id, 'patient'::tenant_role, true)
        ON CONFLICT (user_id, tenant_id) DO UPDATE SET is_active = true;

        -- Create linkage record in nutritionist_patients
        INSERT INTO public.nutritionist_patients (
          nutritionist_id,
          patient_id,
          tenant_id,
          status,
          journey_status,
          attendance_mode
        ) VALUES (
          v_nutri_id,
          NEW.id,
          v_tenant_id,
          'active',
          'awaiting_consent',
          'online'
        )
        ON CONFLICT (nutritionist_id, patient_id) DO UPDATE SET 
          status = 'active',
          tenant_id = v_tenant_id;

        -- Mark invitation as used
        IF v_invitation_id IS NOT NULL THEN
          UPDATE public.invitations 
          SET status = 'completed', 
              used_at = now() 
          WHERE id = v_invitation_id;
        END IF;

        RAISE NOTICE 'SUCCESS: Linked patient % to nutritionist % in tenant %', NEW.id, v_nutri_id, v_tenant_id;
      ELSE
        -- Fail-safe: nutritionist resolved but tenant missing
        v_error_msg := 'Tenant not found for resolved nutritionist ' || v_nutri_id::TEXT;
        INSERT INTO public.onboarding_runtime_errors (patient_id, context, error_message, error_payload)
        VALUES (NEW.id, 'trigger_linkage_failure', v_error_msg, 
          jsonb_build_object('nutritionist_id', v_nutri_id, 'email', NEW.email, 'invite_code', v_invite_code));
        
        UPDATE public.profiles SET is_orphan = true WHERE user_id = NEW.id;
        RAISE WARNING 'CRITICAL: %', v_error_msg;
      END IF;
    ELSE
      -- Fail-safe: No linkage could be resolved
      v_error_msg := 'Vínculo incompleto: nutricionista não resolvido no signup';
      INSERT INTO public.onboarding_runtime_errors (patient_id, context, error_message, error_payload)
      VALUES (NEW.id, 'orphan_detected', v_error_msg, 
        jsonb_build_object('email', NEW.email, 'invite_code', v_invite_code, 'metadata', NEW.raw_user_meta_data));
      
      UPDATE public.profiles SET is_orphan = true WHERE user_id = NEW.id;
      RAISE WARNING 'CRITICAL: % for user %', v_error_msg, NEW.id;
    END IF;
  END IF;

  -- 4. Initial Player Stats
  INSERT INTO public.player_stats (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
