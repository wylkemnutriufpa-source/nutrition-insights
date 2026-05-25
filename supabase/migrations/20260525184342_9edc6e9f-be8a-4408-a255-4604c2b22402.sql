-- 1. Hardened handle_new_user with better name discovery and linkage
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
DECLARE
  v_role app_role := 'patient'; 
  v_nutri_id UUID;
  v_tenant_id UUID;
  v_invitation_id UUID;
  v_invite_code TEXT;
  v_success BOOLEAN := FALSE;
  v_full_name TEXT;
  v_slug TEXT;
  v_meta jsonb;
BEGIN
  v_meta := NEW.raw_user_meta_data;
  
  -- Capture full name from multiple possible fields
  v_full_name := COALESCE(
    v_meta->>'full_name', 
    v_meta->>'name', 
    v_meta->>'display_name',
    split_part(NEW.email, '@', 1)
  );
  
  -- 2. Create Profile
  INSERT INTO public.profiles (user_id, full_name, is_orphan)
  VALUES (NEW.id, v_full_name, TRUE)
  ON CONFLICT (user_id) DO UPDATE SET
    full_name = CASE WHEN v_full_name <> '' AND (profiles.full_name IS NULL OR profiles.full_name = '') THEN v_full_name ELSE profiles.full_name END;

  -- 3. Determine Role
  IF (v_meta->>'role') = 'nutritionist' THEN
    v_role := 'nutritionist';
  ELSIF (v_meta->>'role') = 'personal' THEN
    v_role := 'personal';
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, v_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  -- 4. Professional Logic
  IF v_role IN ('nutritionist', 'personal') THEN
    v_slug := lower(regexp_replace(v_full_name, '[^a-zA-Z0-9]', '-', 'g'));
    IF v_slug = '' OR v_slug IS NULL THEN v_slug := 'workspace'; END IF;
    v_slug := v_slug || '-' || substr(gen_random_uuid()::text, 1, 8);

    INSERT INTO public.tenants (name, slug, owner_user_id)
    VALUES (COALESCE(v_full_name, 'Meu Workspace'), v_slug, NEW.id)
    RETURNING id INTO v_tenant_id;

    INSERT INTO public.user_tenants (user_id, tenant_id, role, is_active)
    VALUES (NEW.id, v_tenant_id, 'owner', true);

    UPDATE public.profiles 
    SET tenant_id = v_tenant_id, 
        is_orphan = false 
    WHERE user_id = NEW.id;
    
    v_success := TRUE;
  
  -- 5. Patient Logic
  ELSIF v_role = 'patient' THEN
    -- Safely extract nutritionist_id
    BEGIN
      v_nutri_id := (v_meta->>'nutritionist_id')::UUID;
    EXCEPTION WHEN OTHERS THEN
      v_nutri_id := NULL;
    END;

    v_invite_code := v_meta->>'invitation_code';

    -- Try linking by code
    IF v_nutri_id IS NULL AND v_invite_code IS NOT NULL AND v_invite_code <> '' THEN
       SELECT professional_id, tenant_id, id
       INTO v_nutri_id, v_tenant_id, v_invitation_id
       FROM public.invitations
       WHERE code = v_invite_code AND status IN ('pending', 'sent', 'viewed') LIMIT 1;
    END IF;

    -- Try linking by email
    IF v_nutri_id IS NULL THEN
      SELECT professional_id, tenant_id, id
      INTO v_nutri_id, v_tenant_id, v_invitation_id
      FROM public.invitations
      WHERE LOWER(patient_email) = LOWER(NEW.email) AND status IN ('pending', 'sent', 'viewed')
      ORDER BY created_at DESC LIMIT 1;
    END IF;

    -- Execute linkage if NUTRI found
    IF v_nutri_id IS NOT NULL THEN
      IF v_tenant_id IS NULL THEN
        SELECT tenant_id INTO v_tenant_id FROM public.user_tenants WHERE user_id = v_nutri_id AND role = 'owner' LIMIT 1;
        IF v_tenant_id IS NULL THEN
          SELECT id INTO v_tenant_id FROM public.tenants WHERE owner_user_id = v_nutri_id LIMIT 1;
        END IF;
      END IF;

      IF v_tenant_id IS NOT NULL THEN
        UPDATE public.profiles SET tenant_id = v_tenant_id, is_orphan = false WHERE user_id = NEW.id;
        
        INSERT INTO public.user_tenants (user_id, tenant_id, role, is_active)
        VALUES (NEW.id, v_tenant_id, 'patient', true)
        ON CONFLICT (user_id, tenant_id) DO UPDATE SET is_active = true;

        INSERT INTO public.nutritionist_patients (nutritionist_id, patient_id, tenant_id, status)
        VALUES (v_nutri_id, NEW.id, v_tenant_id, 'active')
        ON CONFLICT (nutritionist_id, patient_id) DO UPDATE SET status = 'active', tenant_id = v_tenant_id;

        IF v_invitation_id IS NOT NULL THEN
          UPDATE public.invitations SET status = 'completed', used_at = now() WHERE id = v_invitation_id;
        END IF;
        v_success := TRUE;
      END IF;
    END IF;
  END IF;

  -- Log linkage status
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_linkage_log') THEN
    INSERT INTO public.user_linkage_log (user_id, email, status, user_role, metadata)
    VALUES (NEW.id, NEW.email, CASE WHEN v_success THEN 'success' ELSE 'failure' END, v_role::TEXT, v_meta);
  END IF;

  RETURN NEW;
END;
$function$;

-- 2. Trigger to automatically clear is_orphan when tenant is assigned
CREATE OR REPLACE FUNCTION public.fn_auto_clear_orphan_on_tenant()
RETURNS trigger AS $$
BEGIN
    IF NEW.tenant_id IS NOT NULL THEN
        NEW.is_orphan := false;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_auto_clear_orphan_on_tenant ON public.profiles;
CREATE TRIGGER tr_auto_clear_orphan_on_tenant
BEFORE INSERT OR UPDATE OF tenant_id ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.fn_auto_clear_orphan_on_tenant();

-- 3. Final polish on anamnesis reconciliation
CREATE OR REPLACE FUNCTION public.fn_reconcile_journey_on_anamnesis()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    -- Se a anamnese foi concluída
    IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status <> 'completed') THEN
        -- Atualiza o perfil (Usa ambos os campos de compatibilidade)
        UPDATE public.profiles 
           SET onboarding_completed = true,
               clinical_assessment_completed = true,
               is_orphan = false -- Garantia extra
         WHERE user_id = NEW.user_id;

        -- Atualiza o vínculo do nutricionista
        UPDATE public.nutritionist_patients 
           SET journey_status = 'onboarding_completed'
         WHERE patient_id = NEW.user_id 
           AND status = 'active'
           AND journey_status IN ('lead_created', 'awaiting_consent', 'onboarding_active');
    END IF;
    RETURN NEW;
END;
$function$;
