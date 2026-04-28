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
  v_full_name TEXT;
BEGIN
  -- 1. Capturar dados básicos
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', '');
  
  -- 2. Criar Perfil (Garantir existência)
  -- Default is_orphan is true via table definition
  -- FIX: Removed non-existent 'email' column
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

  -- 4. Lógica de Vínculo Determinística para Pacientes
  IF v_role = 'patient' THEN
    -- Resolução de IDs (Prioridade 1: Metadados Diretos)
    v_nutri_id := (NEW.raw_user_meta_data->>'nutritionist_id')::UUID;
    v_invite_code := NEW.raw_user_meta_data->>'invitation_code';

    -- Resolução de IDs (Prioridade 2: Código de Convite)
    IF v_nutri_id IS NULL AND v_invite_code IS NOT NULL THEN
       SELECT professional_id, tenant_id, id
       INTO v_nutri_id, v_tenant_id, v_invitation_id
       FROM public.invitations
       WHERE code = v_invite_code
       AND status IN ('pending', 'sent')
       LIMIT 1;
    END IF;

    -- Resolução de IDs (Prioridade 3: Lookup por Email em convites pendentes)
    IF v_nutri_id IS NULL THEN
      SELECT professional_id, tenant_id, id
      INTO v_nutri_id, v_tenant_id, v_invitation_id
      FROM public.invitations
      WHERE LOWER(patient_email) = LOWER(NEW.email)
      AND status IN ('pending', 'sent')
      ORDER BY created_at DESC
      LIMIT 1;
    END IF;

    -- Executar Vínculo se Nutricionista Resolvido
    IF v_nutri_id IS NOT NULL THEN
      -- Garantir Tenant ID
      IF v_tenant_id IS NULL THEN
        SELECT id INTO v_tenant_id FROM public.tenants WHERE owner_user_id = v_nutri_id LIMIT 1;
      END IF;

      IF v_tenant_id IS NOT NULL THEN
        -- A. Atualizar Perfil
        UPDATE public.profiles 
        SET tenant_id = v_tenant_id, 
            is_orphan = false
        WHERE user_id = NEW.id;
        
        -- B. Criar Membership (user_tenants)
        INSERT INTO public.user_tenants (user_id, tenant_id, role, is_active)
        VALUES (NEW.id, v_tenant_id, 'patient'::tenant_role, true)
        ON CONFLICT (user_id, tenant_id) DO UPDATE SET is_active = true;

        -- C. Criar Vínculo Profissional (nutritionist_patients)
        INSERT INTO public.nutritionist_patients (
          nutritionist_id, 
          patient_id, 
          tenant_id, 
          status, 
          journey_status, 
          attendance_mode
        )
        VALUES (
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

        -- D. Marcar convite como usado
        IF v_invitation_id IS NOT NULL THEN
          UPDATE public.invitations 
          SET status = 'completed', 
              used_at = now() 
          WHERE id = v_invitation_id;
        END IF;

        v_success := TRUE;
      ELSE
        v_error_msg := 'Tenant não encontrado para o nutricionista resolvido: ' || v_nutri_id::TEXT;
      END IF;
    ELSE
      v_error_msg := 'Nenhum nutricionista resolvido via metadados, código ou email.';
    END IF;

    -- Log de Resultado do Vínculo
    INSERT INTO public.user_linkage_log (
      user_id, email, invite_code, nutritionist_id_resolved, tenant_id_resolved, 
      status, error_message, user_role, metadata
    ) VALUES (
      NEW.id, NEW.email, v_invite_code, v_nutri_id, v_tenant_id,
      CASE WHEN v_success THEN 'success' ELSE 'failure' END,
      v_error_msg, v_role::TEXT,
      jsonb_build_object(
        'correlation_id', NEW.raw_user_meta_data->>'correlation_id',
        'raw_meta', NEW.raw_user_meta_data
      )
    );
  ELSE
    -- For non-patients (nutritionists/admins), they are not orphans by definition
    UPDATE public.profiles SET is_orphan = false WHERE user_id = NEW.id;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Last resort logging if table exists
  BEGIN
    INSERT INTO public.user_linkage_log (user_id, email, status, error_message)
    VALUES (NEW.id, NEW.email, 'critical_error', SQLERRM);
  EXCEPTION WHEN OTHERS THEN
    NULL; -- Avoid failing auth if logging fails
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;