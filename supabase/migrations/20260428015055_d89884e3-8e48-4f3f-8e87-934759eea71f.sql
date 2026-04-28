-- Atualizar a função handle_new_user para ser ultra-resiliente e determinística
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
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
BEGIN
  -- 1. Capturar dados básicos
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', '');
  
  -- 2. Criar Perfil (Garantir existência)
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (NEW.id, v_full_name, NEW.email)
  ON CONFLICT (user_id) DO UPDATE SET
    full_name = CASE WHEN v_full_name <> '' THEN v_full_name ELSE profiles.full_name END,
    email = EXCLUDED.email;

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
        SELECT id INTO v_tenant_id FROM public.tenants WHERE owner_id = v_nutri_id LIMIT 1;
      END IF;

      IF v_tenant_id IS NOT NULL THEN
        -- A. Atualizar Perfil
        UPDATE public.profiles 
        SET tenant_id = v_tenant_id, 
            is_orphan = false,
            onboarding_step = 'welcome'
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
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_linkage_log') THEN
        INSERT INTO public.user_linkage_log (
          user_id, email, invite_code, nutritionist_id_resolved, tenant_id_resolved, 
          status, error_message, metadata
        ) VALUES (
          NEW.id, NEW.email, v_invite_code, v_nutri_id, v_tenant_id,
          CASE WHEN v_success THEN 'success' ELSE 'failure' END,
          v_error_msg,
          jsonb_build_object('raw_meta', NEW.raw_user_meta_data)
        );
    END IF;

    -- Registrar Erro Crítico se Falhar
    IF NOT v_success THEN
      INSERT INTO public.onboarding_runtime_errors (patient_id, context, error_message, error_payload)
      VALUES (
        NEW.id, 
        'trigger_linkage_failure', 
        v_error_msg, 
        jsonb_build_object(
          'email', NEW.email, 
          'invite_code', v_invite_code,
          'metadata', NEW.raw_user_meta_data
        )
      );
      
      UPDATE public.profiles SET is_orphan = true WHERE user_id = NEW.id;
    END IF;
  END IF;

  -- 5. Inicializar Player Stats
  INSERT INTO public.player_stats (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$function$;
