
-- ============================================================
-- CRITICAL EVENT NOTIFICATION TRIGGERS
-- Auto-generate notifications for critical patient lifecycle events
-- ============================================================

-- 1. Trigger: onboarding pipeline status changes
CREATE OR REPLACE FUNCTION public.notify_onboarding_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  _nutri_id uuid;
  _patient_name text;
  _title text;
  _message text;
  _type text := 'info';
BEGIN
  -- Get nutritionist
  _nutri_id := NEW.nutritionist_id;
  IF _nutri_id IS NULL THEN RETURN NEW; END IF;

  SELECT COALESCE(full_name, 'Paciente') INTO _patient_name
  FROM public.profiles WHERE user_id = NEW.patient_id;

  -- Determine event
  IF NEW.status = 'completed' AND (OLD IS NULL OR OLD.status != 'completed') THEN
    _title := 'Onboarding concluído';
    _message := _patient_name || ' completou o onboarding e está pronto para o plano.';
    _type := 'progress';
  ELSIF NEW.status = 'pending_body_data' AND (OLD IS NULL OR OLD.status = 'pending_anamnesis') THEN
    _title := 'Anamnese preenchida';
    _message := _patient_name || ' preencheu a anamnese. Falta dados corporais.';
    _type := 'info';
  ELSIF NEW.status = 'pending_preferences' AND (OLD IS NULL OR OLD.status != 'pending_preferences') THEN
    _title := 'Dados corporais enviados';
    _message := _patient_name || ' enviou dados corporais. Faltam preferências.';
    _type := 'info';
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (user_id, title, message, type, action_url)
  VALUES (_nutri_id, _title, _message, _type, '/patients');

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_onboarding_change ON public.onboarding_pipelines;
CREATE TRIGGER trg_notify_onboarding_change
  AFTER UPDATE ON public.onboarding_pipelines
  FOR EACH ROW EXECUTE FUNCTION public.notify_onboarding_change();

-- 2. Trigger: meal plan status changes (approval, publish)
CREATE OR REPLACE FUNCTION public.notify_meal_plan_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  _target_user uuid;
  _patient_name text;
  _title text;
  _message text;
  _type text := 'info';
BEGIN
  IF OLD IS NULL THEN RETURN NEW; END IF;

  SELECT COALESCE(full_name, 'Paciente') INTO _patient_name
  FROM public.profiles WHERE user_id = NEW.patient_id;

  -- Plan sent for approval (draft -> pending_approval)
  IF NEW.plan_status = 'pending_approval' AND OLD.plan_status != 'pending_approval' THEN
    _target_user := NEW.nutritionist_id;
    _title := 'Plano aguardando aprovação';
    _message := 'Plano de ' || _patient_name || ' está pronto para revisão.';
    _type := 'appointment';
  -- Plan approved
  ELSIF NEW.plan_status = 'approved' AND OLD.plan_status != 'approved' THEN
    _target_user := NEW.nutritionist_id;
    _title := 'Plano aprovado';
    _message := 'Plano de ' || _patient_name || ' foi aprovado. Pronto para publicar.';
    _type := 'progress';
  -- Plan published to patient
  ELSIF NEW.plan_status = 'published_to_patient' AND OLD.plan_status != 'published_to_patient' THEN
    -- Notify patient
    INSERT INTO public.notifications (user_id, title, message, type, action_url)
    VALUES (NEW.patient_id, 'Novo plano alimentar!', 'Seu nutricionista publicou seu plano personalizado. Confira agora!', 'progress', '/meal-plan');
    -- Notify nutritionist
    _target_user := NEW.nutritionist_id;
    _title := 'Plano entregue';
    _message := 'Plano de ' || _patient_name || ' foi publicado com sucesso.';
    _type := 'progress';
  ELSE
    RETURN NEW;
  END IF;

  IF _target_user IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, type, action_url)
    VALUES (_target_user, _title, _message, _type, '/patients');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_meal_plan_change ON public.meal_plans;
CREATE TRIGGER trg_notify_meal_plan_change
  AFTER UPDATE ON public.meal_plans
  FOR EACH ROW EXECUTE FUNCTION public.notify_meal_plan_change();

-- 3. Trigger: check-in submitted
CREATE OR REPLACE FUNCTION public.notify_checkin_submitted()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  _patient_name text;
BEGIN
  IF NEW.nutritionist_id IS NULL THEN RETURN NEW; END IF;

  SELECT COALESCE(full_name, 'Paciente') INTO _patient_name
  FROM public.profiles WHERE user_id = NEW.patient_id;

  INSERT INTO public.notifications (user_id, title, message, type, action_url)
  VALUES (NEW.nutritionist_id, 'Novo check-in recebido', _patient_name || ' enviou um check-in. Revise os dados.', 'message', '/patients');

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_checkin_submitted ON public.patient_checkins;
CREATE TRIGGER trg_notify_checkin_submitted
  AFTER INSERT ON public.patient_checkins
  FOR EACH ROW EXECUTE FUNCTION public.notify_checkin_submitted();

-- 4. Trigger: clinical alert created
CREATE OR REPLACE FUNCTION public.notify_clinical_alert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  _patient_name text;
BEGIN
  SELECT COALESCE(full_name, 'Paciente') INTO _patient_name
  FROM public.profiles WHERE user_id = NEW.patient_id;

  INSERT INTO public.notifications (user_id, title, message, type, action_url)
  VALUES (NEW.nutritionist_id, '⚠️ Alerta clínico: ' || NEW.title, _patient_name || ' — ' || NEW.description, 'alert', '/patients');

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_clinical_alert ON public.clinical_alerts;
CREATE TRIGGER trg_notify_clinical_alert
  AFTER INSERT ON public.clinical_alerts
  FOR EACH ROW EXECUTE FUNCTION public.notify_clinical_alert();

-- 5. Trigger: lifecycle state changed
CREATE OR REPLACE FUNCTION public.notify_lifecycle_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  _nutri_id uuid;
  _patient_name text;
  _label text;
BEGIN
  IF OLD IS NOT NULL AND OLD.current_state = NEW.current_state THEN RETURN NEW; END IF;

  SELECT np.nutritionist_id INTO _nutri_id
  FROM public.nutritionist_patients np
  WHERE np.patient_id = NEW.patient_id AND np.status = 'active' LIMIT 1;

  IF _nutri_id IS NULL THEN RETURN NEW; END IF;

  SELECT COALESCE(full_name, 'Paciente') INTO _patient_name
  FROM public.profiles WHERE user_id = NEW.patient_id;

  _label := CASE NEW.current_state
    WHEN 'active_followup' THEN 'Acompanhamento ativo'
    WHEN 'clinical_attention' THEN 'Atenção clínica necessária'
    WHEN 'retention_risk' THEN 'Risco de abandono'
    WHEN 'maintenance_mode' THEN 'Modo manutenção'
    WHEN 'plan_delivered' THEN 'Plano entregue'
    WHEN 'closed' THEN 'Encerrado'
    ELSE NEW.current_state
  END;

  -- Only notify for important transitions
  IF NEW.current_state IN ('clinical_attention', 'retention_risk', 'active_followup', 'closed') THEN
    INSERT INTO public.notifications (user_id, title, message, type, action_url)
    VALUES (_nutri_id, 'Estado alterado: ' || _label, _patient_name || ' mudou para "' || _label || '".', 
      CASE WHEN NEW.current_state IN ('clinical_attention', 'retention_risk') THEN 'alert' ELSE 'info' END,
      '/patients');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_lifecycle_change ON public.patient_lifecycle_states;
CREATE TRIGGER trg_notify_lifecycle_change
  AFTER INSERT OR UPDATE ON public.patient_lifecycle_states
  FOR EACH ROW EXECUTE FUNCTION public.notify_lifecycle_change();

-- 6. Trigger: protocol paused/resumed
CREATE OR REPLACE FUNCTION public.notify_protocol_status_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  _nutri_id uuid;
  _patient_name text;
BEGIN
  IF OLD IS NULL OR OLD.status = NEW.status THEN RETURN NEW; END IF;
  IF NEW.status NOT IN ('paused', 'active', 'cancelled') THEN RETURN NEW; END IF;

  SELECT np.nutritionist_id INTO _nutri_id
  FROM public.nutritionist_patients np
  WHERE np.patient_id = NEW.patient_id AND np.status = 'active' LIMIT 1;

  IF _nutri_id IS NULL THEN RETURN NEW; END IF;

  SELECT COALESCE(full_name, 'Paciente') INTO _patient_name
  FROM public.profiles WHERE user_id = NEW.patient_id;

  INSERT INTO public.notifications (user_id, title, message, type, action_url)
  VALUES (_nutri_id, 
    CASE NEW.status WHEN 'paused' THEN 'Protocolo pausado' WHEN 'cancelled' THEN 'Protocolo cancelado' ELSE 'Protocolo retomado' END,
    'Protocolo de ' || _patient_name || ' foi ' || CASE NEW.status WHEN 'paused' THEN 'pausado' WHEN 'cancelled' THEN 'cancelado' ELSE 'retomado' END || '.',
    CASE WHEN NEW.status = 'active' THEN 'progress' ELSE 'alert' END,
    '/protocols');

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_protocol_status ON public.patient_protocols;
CREATE TRIGGER trg_notify_protocol_status
  AFTER UPDATE ON public.patient_protocols
  FOR EACH ROW EXECUTE FUNCTION public.notify_protocol_status_change();

-- Ensure notifications + critical tables are in realtime publication
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.onboarding_pipelines;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.meal_plans;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.clinical_alerts;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.patient_lifecycle_states;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.patient_checkins;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.patient_protocols;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
