CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_role app_role := 'patient'; -- Default for invited users
  v_nutri_id UUID;
  v_tenant_id UUID;
  v_invitation_id UUID;
  v_invitation_nutri_id UUID;
  v_invitation_tenant_id UUID;
BEGIN
  -- 1. Create Profile
  -- We insert without tenant_id initially, auto_resolve_tenant_profiles trigger will handle it if we don't resolve it here
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), NEW.email)
  ON CONFLICT (user_id) DO UPDATE SET
    full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), profiles.full_name),
    email = COALESCE(EXCLUDED.email, profiles.email);

  -- 2. Handle Role Assignment
  IF (NEW.raw_user_meta_data->>'role') = 'nutritionist' THEN
    v_role := 'nutritionist';
  ELSIF (NEW.raw_user_meta_data->>'role') = 'personal' THEN
    v_role := 'personal';
  END IF;

  -- Insert role (idempotent)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, v_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  -- 3. Automatic Patient Linkage (Single Source of Truth)
  IF v_role = 'patient' THEN
    -- Try to get nutritionist_id from metadata first
    v_nutri_id := (NEW.raw_user_meta_data->>'nutritionist_id')::UUID;

    -- FALLBACK: If not in metadata, search for a pending invitation by email
    IF v_nutri_id IS NULL THEN
      SELECT professional_id, tenant_id, id
      INTO v_invitation_nutri_id, v_invitation_tenant_id, v_invitation_id
      FROM public.invitations
      WHERE LOWER(patient_email) = LOWER(NEW.email)
      AND status = 'pending'
      ORDER BY created_at DESC
      LIMIT 1;

      IF v_invitation_nutri_id IS NOT NULL THEN
        v_nutri_id := v_invitation_nutri_id;
        v_tenant_id := v_invitation_tenant_id;

        -- Update invitation status
        UPDATE public.invitations
        SET status = 'completed', used_at = now()
        WHERE id = v_invitation_id;

        RAISE NOTICE 'Found fallback invitation for user % from nutritionist %', NEW.id, v_nutri_id;
      END IF;
    END IF;

    -- If we have a nutritionist_id (from metadata or invitation), create the link
    IF v_nutri_id IS NOT NULL THEN
      -- Resolve tenant_id if not already found via invitation
      IF v_tenant_id IS NULL THEN
        SELECT id INTO v_tenant_id FROM public.tenants WHERE owner_id = v_nutri_id LIMIT 1;
      END IF;

      IF v_tenant_id IS NOT NULL THEN
        -- CRITICAL: Update profile with the resolved tenant_id immediately to prevent orphanhood
        UPDATE public.profiles SET tenant_id = v_tenant_id, is_orphan = false WHERE user_id = NEW.id;

        -- CRITICAL: Create membership in user_tenants
        INSERT INTO public.user_tenants (user_id, tenant_id, role, is_active)
        VALUES (NEW.id, v_tenant_id, 'patient'::tenant_role, true)
        ON CONFLICT (user_id, tenant_id) DO UPDATE SET is_active = true;

        -- Create the linkage record if it doesn't exist
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
        ON CONFLICT (nutritionist_id, patient_id) DO NOTHING;

        -- Log success in the audit table (using RAISE for standard DB logs)
        RAISE NOTICE 'SUCCESS: Linked patient % to nutritionist % in tenant %', NEW.id, v_nutri_id, v_tenant_id;
      ELSE
        -- Log failure to resolve tenant
        INSERT INTO public.onboarding_runtime_errors (patient_id, context, error_message, error_payload)
        VALUES (NEW.id, 'trigger_linkage', 'Tenant not found for nutritionist', jsonb_build_object('nutritionist_id', v_nutri_id));

        UPDATE public.profiles SET is_orphan = true WHERE user_id = NEW.id;
        RAISE WARNING 'CRITICAL: Tenant not found for nutritionist % during signup of %', v_nutri_id, NEW.id;
      END IF;
    ELSE
      -- No nutritionist_id found at all (neither metadata nor invitation)
      INSERT INTO public.onboarding_runtime_errors (patient_id, context, error_message, error_payload)
      VALUES (NEW.id, 'trigger_linkage', 'No nutritionist_id found in metadata or invitations', jsonb_build_object('email', NEW.email));

      UPDATE public.profiles SET is_orphan = true WHERE user_id = NEW.id;
      RAISE WARNING 'CRITICAL: Patient % registered without nutritionist link', NEW.id;
    END IF;
  END IF;

  -- 4. Player Stats (Gamification)
  INSERT INTO public.player_stats (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$function$;