CREATE OR REPLACE FUNCTION public.create_patient_canonical(
  _patient_id uuid,
  _full_name text,
  _email text,
  _phone text DEFAULT NULL::text,
  _nutritionist_id uuid DEFAULT NULL::uuid,
  _source text DEFAULT 'register'::text,
  _metadata jsonb DEFAULT '{}'::jsonb,
  _whatsapp text DEFAULT NULL::text
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
   INSERT INTO public.profiles (user_id, full_name, phone, whatsapp, tenant_id)
   VALUES (_patient_id, _full_name, _phone, _whatsapp, v_tenant_id)
   ON CONFLICT (user_id) DO UPDATE
     SET full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
         phone     = COALESCE(EXCLUDED.phone, public.profiles.phone),
         whatsapp  = COALESCE(EXCLUDED.whatsapp, public.profiles.whatsapp),
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
     -- Novo status inicial: awaiting_consent (permitindo fluxo imediato)
     INSERT INTO public.nutritionist_patients (nutritionist_id, patient_id, status, journey_status, tenant_id)
     VALUES (_nutritionist_id, _patient_id, 'active', 'awaiting_consent', v_tenant_id)
     ON CONFLICT (nutritionist_id, patient_id) DO UPDATE
       SET status = 'active',
           journey_status = CASE 
             WHEN nutritionist_patients.journey_status IS NULL OR nutritionist_patients.journey_status = 'lead_created' 
             THEN 'awaiting_consent' 
             ELSE nutritionist_patients.journey_status 
           END,
           tenant_id = COALESCE(public.nutritionist_patients.tenant_id, EXCLUDED.tenant_id);

     -- 5. Pipeline de onboarding (Auto-liberado para links)
     INSERT INTO public.onboarding_pipelines (patient_id, nutritionist_id, status, release_status, released_by, released_at)
     SELECT _patient_id, _nutritionist_id, 'pending_anamnesis', 'released', _nutritionist_id, now()
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

   RETURN jsonb_build_object('success', true, 'patient_id', _patient_id);
 END;
 $function$;