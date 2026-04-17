-- ============================================
-- UNIFICAÇÃO CANÔNICA DE CRIAÇÃO DE PACIENTE v1.0.0
-- ============================================

-- 1. Tabela de log de origem (rastreabilidade)
CREATE TABLE IF NOT EXISTS public.patient_creation_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  source text NOT NULL CHECK (source IN ('invite','import','register','lead_convert','admin','migration_backfill')),
  nutritionist_id uuid,
  tenant_id uuid,
  created_by uuid,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_patient_creation_log_patient ON public.patient_creation_log(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_creation_log_source ON public.patient_creation_log(source);

ALTER TABLE public.patient_creation_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view all creation logs"
  ON public.patient_creation_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Nutritionist views own patient creation logs"
  ON public.patient_creation_log FOR SELECT TO authenticated
  USING (nutritionist_id = auth.uid());

-- 2. RPC CANÔNICA - única forma autorizada de finalizar criação de paciente
-- Pré-requisito: auth.users já criado via GoTrue. Esta RPC NÃO toca em auth.users.
CREATE OR REPLACE FUNCTION public.create_patient_canonical(
  _patient_id uuid,
  _full_name text,
  _email text,
  _phone text DEFAULT NULL,
  _nutritionist_id uuid DEFAULT NULL,
  _source text DEFAULT 'admin',
  _metadata jsonb DEFAULT '{}'::jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id uuid;
  v_caller uuid := auth.uid();
BEGIN
  IF _patient_id IS NULL THEN
    RAISE EXCEPTION 'patient_id obrigatório (criar auth.users via GoTrue antes)';
  END IF;
  IF _full_name IS NULL OR length(trim(_full_name)) = 0 THEN
    RAISE EXCEPTION 'full_name obrigatório';
  END IF;
  IF _source NOT IN ('invite','import','register','lead_convert','admin','migration_backfill') THEN
    RAISE EXCEPTION 'source inválido: %', _source;
  END IF;

  -- Resolver tenant
  IF _nutritionist_id IS NOT NULL THEN
    SELECT tenant_id INTO v_tenant_id
    FROM public.user_tenants
    WHERE user_id = _nutritionist_id
    ORDER BY joined_at ASC NULLS LAST LIMIT 1;
  END IF;

  -- 1. Profile (upsert)
  INSERT INTO public.profiles (user_id, full_name, phone, tenant_id)
  VALUES (_patient_id, _full_name, _phone, v_tenant_id)
  ON CONFLICT (user_id) DO UPDATE
    SET full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
        phone     = COALESCE(EXCLUDED.phone, public.profiles.phone),
        tenant_id = COALESCE(public.profiles.tenant_id, EXCLUDED.tenant_id);

  -- 2. Role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_patient_id, 'patient')
  ON CONFLICT (user_id, role) DO NOTHING;

  -- 3. Tenant link
  IF v_tenant_id IS NOT NULL THEN
    INSERT INTO public.user_tenants (user_id, tenant_id, role)
    VALUES (_patient_id, v_tenant_id, 'patient')
    ON CONFLICT (user_id, tenant_id) DO NOTHING;
  END IF;

  -- 4. Vínculo nutricionista
  IF _nutritionist_id IS NOT NULL THEN
    INSERT INTO public.nutritionist_patients (nutritionist_id, patient_id, status, journey_status, tenant_id)
    VALUES (_nutritionist_id, _patient_id, 'active', 'awaiting_payment', v_tenant_id)
    ON CONFLICT (nutritionist_id, patient_id) DO UPDATE
      SET status = 'active',
          tenant_id = COALESCE(public.nutritionist_patients.tenant_id, EXCLUDED.tenant_id);

    -- 5. Pipeline de onboarding
    INSERT INTO public.onboarding_pipelines (patient_id, nutritionist_id, status)
    SELECT _patient_id, _nutritionist_id, 'pending_anamnesis'
    WHERE NOT EXISTS (
      SELECT 1 FROM public.onboarding_pipelines
      WHERE patient_id = _patient_id
        AND status NOT IN ('completed','archived','superseded_by_active_plan','superseded_by_published_plan','rejected','superseded_by_reset')
    );
  END IF;

  -- 6. Lifecycle OBRIGATÓRIO
  INSERT INTO public.patient_lifecycle_states (patient_id, lifecycle_state, has_pending_onboarding)
  VALUES (_patient_id, 'onboarding_started'::patient_lifecycle_status, _nutritionist_id IS NOT NULL)
  ON CONFLICT (patient_id) DO NOTHING;

  -- 7. Log de origem
  INSERT INTO public.patient_creation_log (patient_id, source, nutritionist_id, tenant_id, created_by, metadata)
  VALUES (_patient_id, _source, _nutritionist_id, v_tenant_id, v_caller, _metadata);

  RETURN jsonb_build_object(
    'success', true,
    'patient_id', _patient_id,
    'tenant_id', v_tenant_id,
    'nutritionist_linked', _nutritionist_id IS NOT NULL,
    'source', _source
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_patient_canonical(uuid,text,text,text,uuid,text,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_patient_canonical(uuid,text,text,text,uuid,text,jsonb) TO authenticated, service_role;

-- 3. Conversão de lead em paciente (etapa 4 do escopo)
CREATE OR REPLACE FUNCTION public.convert_lead_to_patient(
  _lead_id uuid,
  _patient_id uuid,
  _password_set boolean DEFAULT true
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead RECORD;
  v_result jsonb;
BEGIN
  SELECT * INTO v_lead FROM public.lead_requests WHERE id = _lead_id;
  IF v_lead IS NULL THEN
    RAISE EXCEPTION 'Lead % não encontrado', _lead_id;
  END IF;

  -- Verifica autorização: só o nutricionista dono ou admin
  IF NOT (auth.uid() = v_lead.nutritionist_id OR public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'Sem permissão para converter este lead';
  END IF;

  v_result := public.create_patient_canonical(
    _patient_id => _patient_id,
    _full_name => v_lead.name,
    _email => v_lead.email,
    _phone => v_lead.phone,
    _nutritionist_id => v_lead.nutritionist_id,
    _source => 'lead_convert',
    _metadata => jsonb_build_object('lead_id', _lead_id, 'lead_source', v_lead.source)
  );

  UPDATE public.lead_requests SET status = 'converted' WHERE id = _lead_id;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.convert_lead_to_patient(uuid,uuid,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.convert_lead_to_patient(uuid,uuid,boolean) TO authenticated, service_role;

-- 4. BLOQUEIO de funções legadas - redirecionam com erro claro
CREATE OR REPLACE FUNCTION public.create_patient_account(_email text, _full_name text, _password text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'create_patient_account está descontinuada. Use a edge function "create-patient" (canônica).'
    USING HINT = 'Migrar chamadas para create_patient_canonical via edge function create-patient.';
END;
$$;

CREATE OR REPLACE FUNCTION public.self_register_patient(_user_id uuid, _referral_code text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nutri uuid;
  v_email text;
  v_name text;
BEGIN
  -- Modo legado seguro: roteia para canônica se referral_code mapear a um nutri
  IF _referral_code IS NOT NULL AND _referral_code <> '' THEN
    SELECT nutritionist_id INTO v_nutri
    FROM public.patient_referrals
    WHERE referral_code = _referral_code AND is_active = true
    LIMIT 1;
  END IF;

  SELECT email, COALESCE(raw_user_meta_data->>'full_name', email) INTO v_email, v_name
  FROM auth.users WHERE id = _user_id;

  IF v_email IS NULL THEN
    RAISE EXCEPTION 'Usuário % não existe em auth.users', _user_id;
  END IF;

  RETURN public.create_patient_canonical(
    _patient_id => _user_id,
    _full_name => v_name,
    _email => v_email,
    _nutritionist_id => v_nutri,
    _source => 'register',
    _metadata => jsonb_build_object('referral_code', _referral_code)
  );
END;
$$;

-- 5. Trigger de integridade: lifecycle obrigatório quando role 'patient' é criada
CREATE OR REPLACE FUNCTION public.ensure_patient_lifecycle_on_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role = 'patient' THEN
    INSERT INTO public.patient_lifecycle_states (patient_id, lifecycle_state)
    VALUES (NEW.user_id, 'onboarding_started'::patient_lifecycle_status)
    ON CONFLICT (patient_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ensure_patient_lifecycle ON public.user_roles;
CREATE TRIGGER trg_ensure_patient_lifecycle
  AFTER INSERT ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_patient_lifecycle_on_role();

-- 6. Backfill defensivo: pacientes sem lifecycle
INSERT INTO public.patient_lifecycle_states (patient_id, lifecycle_state)
SELECT ur.user_id, 'onboarding_started'::patient_lifecycle_status
FROM public.user_roles ur
LEFT JOIN public.patient_lifecycle_states pls ON pls.patient_id = ur.user_id
WHERE ur.role = 'patient' AND pls.patient_id IS NULL
ON CONFLICT (patient_id) DO NOTHING;