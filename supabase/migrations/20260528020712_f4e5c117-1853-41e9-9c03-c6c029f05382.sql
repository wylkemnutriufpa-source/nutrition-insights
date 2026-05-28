-- 1. Melhorar a função de trigger para garantir atomicidade e fail-fast
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role app_role := 'patient'; 
  v_nutri_id UUID;
  v_tenant_id UUID;
  v_invitation_id UUID;
  v_invite_code TEXT;
  v_full_name TEXT;
  v_slug TEXT;
  v_meta jsonb;
BEGIN
  v_meta := NEW.raw_user_meta_data;
  
  -- Extração de Nome
  v_full_name := COALESCE(
    v_meta->>'full_name', 
    v_meta->>'name', 
    v_meta->>'display_name',
    split_part(NEW.email, '@', 1)
  );

  -- Determinar Role
  IF (v_meta->>'role') = 'nutritionist' THEN
    v_role := 'nutritionist';
  ELSIF (v_meta->>'role') = 'personal' THEN
    v_role := 'personal';
  END IF;

  -- LÓGICA CRÍTICA DE PACIENTE (Fail-Fast)
  IF v_role = 'patient' THEN
    -- Resolução de Nutricionista via Metadata ou Convite
    BEGIN
      v_nutri_id := (v_meta->>'nutritionist_id')::UUID;
    EXCEPTION WHEN OTHERS THEN
      v_nutri_id := NULL;
    END;

    v_invite_code := v_meta->>'invitation_code';

    -- Se não tem nutri nem código, CANCELA TUDO
    IF v_nutri_id IS NULL AND (v_invite_code IS NULL OR v_invite_code = '') THEN
      RAISE EXCEPTION 'Erro de Integridade: Paciente deve possuir vínculo com nutricionista ou código de convite válido no nascimento.';
    END IF;

    -- Tenta resolver vínculo se necessário
    IF v_nutri_id IS NULL AND v_invite_code IS NOT NULL THEN
       SELECT professional_id, tenant_id, id
       INTO v_nutri_id, v_tenant_id, v_invitation_id
       FROM public.invitations
       WHERE code = v_invite_code AND status IN ('pending', 'sent', 'viewed') LIMIT 1;
       
       IF v_nutri_id IS NULL THEN
         RAISE EXCEPTION 'Erro de Convite: Código de convite % inválido ou já utilizado.', v_invite_code;
       END IF;
    END IF;

    -- Resolver Tenant ID se ainda não resolvido
    IF v_nutri_id IS NOT NULL AND v_tenant_id IS NULL THEN
        SELECT tenant_id INTO v_tenant_id FROM public.user_tenants WHERE user_id = v_nutri_id AND role = 'owner' LIMIT 1;
    END IF;

    IF v_tenant_id IS NULL THEN
       RAISE EXCEPTION 'Erro de Domínio: Não foi possível localizar um tenant válido para o profissional %.', v_nutri_id;
    END IF;

    -- ESCRITAS ATÔMICAS (IDEMPOTENTES)
    
    -- 1. Linkage Profissional
    INSERT INTO public.nutritionist_patients (nutritionist_id, patient_id, tenant_id, status)
    VALUES (v_nutri_id, NEW.id, v_tenant_id, 'active')
    ON CONFLICT (nutritionist_id, patient_id) DO UPDATE SET status = 'active', tenant_id = EXCLUDED.tenant_id;

    -- 2. Tenant Link
    INSERT INTO public.user_tenants (user_id, tenant_id, role, is_active)
    VALUES (NEW.id, v_tenant_id, 'patient', true)
    ON CONFLICT (user_id, tenant_id) DO UPDATE SET is_active = true;

    -- 3. Profile (Agora com Tenant Obrigatório)
    INSERT INTO public.profiles (user_id, full_name, tenant_id, is_orphan)
    VALUES (NEW.id, v_full_name, v_tenant_id, FALSE)
    ON CONFLICT (user_id) DO UPDATE SET
      full_name = EXCLUDED.full_name,
      tenant_id = EXCLUDED.tenant_id,
      is_orphan = FALSE;

    -- 4. Onboarding Pipeline (Ponto de entrada do domínio clínico)
    INSERT INTO public.onboarding_pipelines (patient_id, status, current_step)
    VALUES (NEW.id, 'pending', 'welcome')
    ON CONFLICT (patient_id) DO NOTHING;

    -- 5. Consumo de Convite
    IF v_invitation_id IS NOT NULL THEN
      UPDATE public.invitations SET status = 'completed', used_at = now() WHERE id = v_invitation_id;
    END IF;

  ELSIF v_role IN ('nutritionist', 'personal') THEN
    -- Lógica de Profissional (Simplificada para brevidade, mantendo atomicidade existente)
    v_slug := lower(regexp_replace(v_full_name, '[^a-zA-Z0-9]', '-', 'g')) || '-' || substr(gen_random_uuid()::text, 1, 8);
    
    INSERT INTO public.tenants (name, slug, owner_user_id)
    VALUES (COALESCE(v_full_name, 'Meu Workspace'), v_slug, NEW.id)
    RETURNING id INTO v_tenant_id;

    INSERT INTO public.user_tenants (user_id, tenant_id, role, is_active)
    VALUES (NEW.id, v_tenant_id, 'owner', true);

    INSERT INTO public.profiles (user_id, full_name, tenant_id, is_orphan)
    VALUES (NEW.id, v_full_name, v_tenant_id, FALSE)
    ON CONFLICT (user_id) DO UPDATE SET tenant_id = EXCLUDED.tenant_id, is_orphan = false;
  END IF;

  -- 6. Role (Garantia final)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, v_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
