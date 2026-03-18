-- Canonical patient plan status + onboarding supersede + shopping list sync on publish

CREATE OR REPLACE FUNCTION public.resolve_patient_plan_status(_patient_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _plan record;
  _onboarding record;
BEGIN
  -- 1) Sovereign delivered plan
  SELECT id, title, plan_status, generation_source, updated_at
  INTO _plan
  FROM public.meal_plans
  WHERE patient_id = _patient_id
    AND is_active = true
    AND plan_status = 'published_to_patient'
  ORDER BY updated_at DESC
  LIMIT 1;

  IF _plan IS NOT NULL THEN
    RETURN jsonb_build_object(
      'status', 'plan_delivered',
      'plan_id', _plan.id,
      'plan_title', _plan.title,
      'delivery_source', _plan.generation_source,
      'last_updated', _plan.updated_at,
      'show_onboarding', false,
      'show_no_plan', false,
      'show_waiting_approval', false
    );
  END IF;

  -- 2) Approved and waiting publish
  SELECT id, title, plan_status, generation_source, updated_at
  INTO _plan
  FROM public.meal_plans
  WHERE patient_id = _patient_id
    AND is_active = true
    AND plan_status = 'approved'
  ORDER BY updated_at DESC
  LIMIT 1;

  IF _plan IS NOT NULL THEN
    RETURN jsonb_build_object(
      'status', 'plan_approved_pending_publish',
      'plan_id', _plan.id,
      'plan_title', _plan.title,
      'delivery_source', _plan.generation_source,
      'last_updated', _plan.updated_at,
      'show_onboarding', false,
      'show_no_plan', false,
      'show_waiting_approval', true
    );
  END IF;

  -- 3) Draft / pre-plan exists
  SELECT id, title, plan_status, generation_source, updated_at
  INTO _plan
  FROM public.meal_plans
  WHERE patient_id = _patient_id
    AND is_active = true
    AND plan_status IN ('draft', 'draft_auto_generated', 'under_professional_review', 'revision_requested')
  ORDER BY updated_at DESC
  LIMIT 1;

  IF _plan IS NOT NULL THEN
    RETURN jsonb_build_object(
      'status', 'plan_draft',
      'plan_id', _plan.id,
      'plan_title', _plan.title,
      'delivery_source', _plan.generation_source,
      'last_updated', _plan.updated_at,
      'show_onboarding', false,
      'show_no_plan', false,
      'show_waiting_approval', true
    );
  END IF;

  -- 4) Onboarding / production pending
  SELECT id, status, updated_at
  INTO _onboarding
  FROM public.onboarding_pipelines
  WHERE patient_id = _patient_id
    AND status NOT IN ('completed', 'superseded_by_published_plan', 'superseded_by_active_plan')
  ORDER BY created_at DESC
  LIMIT 1;

  IF _onboarding IS NOT NULL THEN
    RETURN jsonb_build_object(
      'status', 'plan_pending_production',
      'onboarding_id', _onboarding.id,
      'onboarding_status', _onboarding.status,
      'last_updated', _onboarding.updated_at,
      'show_onboarding', true,
      'show_no_plan', false,
      'show_waiting_approval', false
    );
  END IF;

  -- 5) No plan at all
  RETURN jsonb_build_object(
    'status', 'no_plan',
    'show_onboarding', false,
    'show_no_plan', true,
    'show_waiting_approval', false
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.auto_resolve_onboarding_on_plan_publish()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _updated_count integer := 0;
BEGIN
  IF NOT (NEW.is_active = true AND NEW.plan_status IN ('approved', 'published_to_patient')) THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.is_active = true AND OLD.plan_status IN ('approved', 'published_to_patient') THEN
    RETURN NEW;
  END IF;

  UPDATE public.onboarding_pipelines
  SET status = 'superseded_by_active_plan',
      updated_at = now()
  WHERE patient_id = NEW.patient_id
    AND status NOT IN ('completed', 'superseded_by_published_plan', 'superseded_by_active_plan');

  GET DIAGNOSTICS _updated_count = ROW_COUNT;

  INSERT INTO public.patient_timeline (patient_id, event_type, title, description, metadata, created_by)
  VALUES (
    NEW.patient_id,
    'plan_delivered',
    'Plano alimentar entregue',
    'Seu plano alimentar está pronto e disponível no seu painel.',
    jsonb_build_object(
      'plan_id', NEW.id,
      'plan_title', NEW.title,
      'plan_status', NEW.plan_status,
      'delivery_source', COALESCE(NEW.generation_source, 'manual_editor'),
      'superseded_pending_count', _updated_count
    ),
    COALESCE(auth.uid(), NEW.nutritionist_id)
  );

  INSERT INTO public.notifications (user_id, title, message, type, priority)
  VALUES (
    NEW.patient_id,
    '🎉 Plano alimentar pronto!',
    'Seu plano alimentar personalizado já está disponível no seu painel. Acesse agora!',
    'PLAN_DELIVERED',
    'high'
  );

  IF _updated_count > 0 THEN
    INSERT INTO public.audit_logs (user_id, action, resource_type, resource_id, metadata)
    VALUES (
      COALESCE(auth.uid(), NEW.nutritionist_id),
      'superseded_by_active_plan',
      'onboarding_pipelines',
      NEW.patient_id::text,
      jsonb_build_object(
        'patient_id', NEW.patient_id,
        'plan_id', NEW.id,
        'plan_status', NEW.plan_status,
        'delivery_source', COALESCE(NEW.generation_source, 'manual_editor'),
        'updated_pipelines', _updated_count,
        'occurred_at', now()
      )
    );
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.guard_onboarding_reopen()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _has_valid_plan boolean;
BEGIN
  IF NEW.status IN ('pending_anamnesis', 'pending_body_data', 'pending_preferences', 'pending_plan_generation', 'pending_approval', 'in_progress') THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.meal_plans
      WHERE patient_id = NEW.patient_id
        AND is_active = true
        AND plan_status IN ('approved', 'published_to_patient')
    ) INTO _has_valid_plan;

    IF _has_valid_plan THEN
      NEW.status := 'superseded_by_active_plan';
      NEW.updated_at := now();
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_guard_onboarding_reopen ON public.onboarding_pipelines;
CREATE TRIGGER trg_guard_onboarding_reopen
  BEFORE UPDATE ON public.onboarding_pipelines
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_onboarding_reopen();

CREATE OR REPLACE FUNCTION public.sync_shopping_list_from_published_plan()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT (NEW.is_active = true AND NEW.plan_status = 'published_to_patient') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.is_active = true AND OLD.plan_status = 'published_to_patient' THEN
    RETURN NEW;
  END IF;

  DELETE FROM public.shopping_list_items
  WHERE patient_id = NEW.patient_id
    AND meal_plan_id IS NOT NULL;

  INSERT INTO public.shopping_list_items (patient_id, meal_plan_id, item_name, category)
  SELECT DISTINCT
    NEW.patient_id,
    NEW.id,
    cleaned_name,
    CASE
      WHEN lower(cleaned_name) ~ '(frango|carne|peixe|ovo|atum|salm[aã]o|til[aá]pia|peito|patinho|alcatra|sardinha|camar[aã]o|whey|prote[ií]n)' THEN 'protein'
      WHEN lower(cleaned_name) ~ '(arroz|p[aã]o|macarr[aã]o|batata|aveia|tapioca|mandioca|inhame|granola|cereal|torrada|cuscuz)' THEN 'carbs'
      WHEN lower(cleaned_name) ~ '(alface|tomate|br[oó]colis|espinafre|r[uú]cula|cenoura|pepino|abobrinha|couve|chuchu|berinjela|beterraba|vagem)' THEN 'vegetables'
      WHEN lower(cleaned_name) ~ '(banana|ma[cç][aã]|morango|laranja|mel[aã]o|mam[aã]o|abacate|uva|kiwi|manga|melancia|pera|lim[aã]o)' THEN 'fruits'
      WHEN lower(cleaned_name) ~ '(leite|queijo|iogurte|cream cheese|requeij[aã]o|ricota|cottage|manteiga)' THEN 'dairy'
      WHEN lower(cleaned_name) ~ '(azeite|[oó]leo|castanha|nozes|amendoim|am[eê]ndoa|linha[cç]a|chia|coco|pasta de amendoim)' THEN 'oils'
      WHEN lower(cleaned_name) ~ '(sal|pimenta|or[eé]gano|alho|cebola|cheiro-verde|manjeric[aã]o|canela|a[cç][uú]car|ado[cç]ante|vinagre|mostarda|molho)' THEN 'seasoning'
      ELSE 'other'
    END
  FROM (
    SELECT trim(
      regexp_replace(
        regexp_replace(part, '^\d+\s*(g|kg|ml|un|unidade|colher(es)?|x[ií]cara(s)?|fatia(s)?|por[cç][aã]o([eõ]s)?|peda[cç]o(s)?)\s*(de\s+)?', '', 'i'),
        '^\d+\s*[-–]\s*', '', 'i'
      )
    ) AS cleaned_name
    FROM public.meal_plan_items mpi
    CROSS JOIN LATERAL regexp_split_to_table(coalesce(mpi.description, ''), E'[;\\n]+|\\s+-\\s+') AS part
    WHERE mpi.meal_plan_id = NEW.id
      AND coalesce(mpi.description, '') <> ''
  ) extracted
  WHERE cleaned_name <> ''
    AND char_length(cleaned_name) BETWEEN 2 AND 80;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_sync_shopping_list_on_publish ON public.meal_plans;
CREATE TRIGGER trg_sync_shopping_list_on_publish
  AFTER INSERT OR UPDATE ON public.meal_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_shopping_list_from_published_plan();