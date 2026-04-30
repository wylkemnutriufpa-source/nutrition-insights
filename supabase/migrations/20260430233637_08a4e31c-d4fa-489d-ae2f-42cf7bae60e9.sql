-- 1. Atualizar a função handle_new_user para criar tenant para profissionais
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_role app_role := 'patient'; 
  v_nutri_id UUID;
  v_tenant_id UUID;
  v_invitation_id UUID;
  v_invite_code TEXT;
  v_error_msg TEXT;
  v_success BOOLEAN := FALSE;
  v_full_name TEXT;
  v_slug TEXT;
BEGIN
  -- 1. Capturar dados básicos
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', '');
  
  -- 2. Criar Perfil (Garantir existência)
  INSERT INTO public.profiles (user_id, full_name, is_orphan)
  VALUES (NEW.id, v_full_name, TRUE)
  ON CONFLICT (user_id) DO UPDATE SET
    full_name = CASE WHEN v_full_name <> '' THEN v_full_name ELSE profiles.full_name END;

  -- 3. Determinar Papel (Role)
  IF (NEW.raw_user_meta_data->>'role') = 'nutritionist' THEN
    v_role := 'nutritionist';
  ELSIF (NEW.raw_user_meta_data->>'role') = 'personal' THEN
    v_role := 'personal';
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, v_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  -- 4. Lógica para PROFISSIONAIS (Criação de Tenant)
  IF v_role IN ('nutritionist', 'personal') THEN
    -- Gerar slug único
    v_slug := lower(regexp_replace(v_full_name, '[^a-zA-Z0-9]', '-', 'g'));
    IF v_slug = '' OR v_slug IS NULL THEN v_slug := 'workspace'; END IF;
    v_slug := v_slug || '-' || substr(gen_random_uuid()::text, 1, 8);

    -- Criar Tenant
    INSERT INTO public.tenants (name, slug, owner_user_id)
    VALUES (COALESCE(v_full_name, 'Meu Workspace'), v_slug, NEW.id)
    RETURNING id INTO v_tenant_id;

    -- Membership
    INSERT INTO public.user_tenants (user_id, tenant_id, role, is_active)
    VALUES (NEW.id, v_tenant_id, 'owner', true);

    -- Atualizar Perfil
    UPDATE public.profiles 
    SET tenant_id = v_tenant_id, 
        is_orphan = false 
    WHERE user_id = NEW.id;
    
    v_success := TRUE;
  
  -- 5. Lógica para PACIENTES (Vínculo)
  ELSIF v_role = 'patient' THEN
    v_nutri_id := (NEW.raw_user_meta_data->>'nutritionist_id')::UUID;
    v_invite_code := NEW.raw_user_meta_data->>'invitation_code';

    IF v_nutri_id IS NULL AND v_invite_code IS NOT NULL THEN
       SELECT professional_id, tenant_id, id
       INTO v_nutri_id, v_tenant_id, v_invitation_id
       FROM public.invitations
       WHERE code = v_invite_code AND status IN ('pending', 'sent') LIMIT 1;
    END IF;

    IF v_nutri_id IS NULL THEN
      SELECT professional_id, tenant_id, id
      INTO v_nutri_id, v_tenant_id, v_invitation_id
      FROM public.invitations
      WHERE LOWER(patient_email) = LOWER(NEW.email) AND status IN ('pending', 'sent')
      ORDER BY created_at DESC LIMIT 1;
    END IF;

    IF v_nutri_id IS NOT NULL THEN
      IF v_tenant_id IS NULL THEN
        SELECT id INTO v_tenant_id FROM public.tenants WHERE owner_user_id = v_nutri_id LIMIT 1;
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

  -- Log
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_linkage_log') THEN
    INSERT INTO public.user_linkage_log (user_id, email, status, user_role)
    VALUES (NEW.id, NEW.email, CASE WHEN v_success THEN 'success' ELSE 'failure' END, v_role::TEXT);
  END IF;

  RETURN NEW;
END;
$function$;

-- 2. Corrigir profissionais existentes sem tenant
DO $$
DECLARE
  r RECORD;
  v_tenant_id UUID;
  v_slug TEXT;
BEGIN
  FOR r IN 
    SELECT p.user_id, p.full_name 
    FROM public.profiles p
    JOIN public.user_roles ur ON p.user_id = ur.user_id
    LEFT JOIN public.user_tenants ut ON p.user_id = ut.user_id
    WHERE ur.role IN ('nutritionist', 'personal')
    AND ut.id IS NULL
  LOOP
    -- Gerar slug
    v_slug := lower(regexp_replace(r.full_name, '[^a-zA-Z0-9]', '-', 'g')) || '-' || substr(gen_random_uuid()::text, 1, 8);
    
    -- Criar Tenant
    INSERT INTO public.tenants (name, slug, owner_user_id)
    VALUES (COALESCE(r.full_name, 'Meu Workspace'), v_slug, r.user_id)
    RETURNING id INTO v_tenant_id;

    -- Membership
    INSERT INTO public.user_tenants (user_id, tenant_id, role, is_active)
    VALUES (r.user_id, v_tenant_id, 'owner', true);

    -- Atualizar Profile
    UPDATE public.profiles SET tenant_id = v_tenant_id, is_orphan = false WHERE user_id = r.user_id;
  END LOOP;
END $$;
