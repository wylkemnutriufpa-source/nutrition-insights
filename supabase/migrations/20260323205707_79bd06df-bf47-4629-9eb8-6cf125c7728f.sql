
-- =============================================
-- MISSING NOTIFICATION TRIGGERS
-- =============================================

-- 1. Notify nutritionist when patient submits anamnesis
CREATE OR REPLACE FUNCTION public.notify_anamnesis_submitted()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  _nutri_id uuid;
  _patient_name text;
BEGIN
  -- Only trigger when status becomes 'completed'
  IF NEW.status != 'completed' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'completed' THEN
    RETURN NEW;
  END IF;

  SELECT nutritionist_id INTO _nutri_id
  FROM public.nutritionist_patients
  WHERE patient_id = NEW.user_id AND status = 'active'
  LIMIT 1;

  SELECT COALESCE(full_name, 'Paciente') INTO _patient_name
  FROM public.profiles WHERE user_id = NEW.user_id;

  IF _nutri_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, type, entity_type, entity_id, target_route)
    VALUES (
      _nutri_id,
      '📋 Anamnese enviada',
      _patient_name || ' completou a anamnese. Revise os dados clínicos.',
      'info',
      'anamnesis',
      NEW.id::text,
      '/patients'
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_anamnesis_submitted ON public.patient_anamnesis;
CREATE TRIGGER trg_notify_anamnesis_submitted
  AFTER INSERT OR UPDATE ON public.patient_anamnesis
  FOR EACH ROW EXECUTE FUNCTION public.notify_anamnesis_submitted();


-- 2. Notify nutritionist when patient sends feedback
CREATE OR REPLACE FUNCTION public.notify_feedback_submitted()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  _patient_name text;
BEGIN
  SELECT COALESCE(full_name, 'Paciente') INTO _patient_name
  FROM public.profiles WHERE user_id = NEW.patient_id;

  INSERT INTO public.notifications (user_id, title, message, type, entity_type, entity_id, target_route)
  VALUES (
    NEW.nutritionist_id,
    '💬 Novo feedback recebido',
    _patient_name || ' enviou um feedback: "' || LEFT(NEW.message, 60) || CASE WHEN LENGTH(NEW.message) > 60 THEN '...' ELSE '' END || '"',
    'feedback',
    'feedback',
    NEW.id::text,
    '/feedbacks'
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_feedback_submitted ON public.feedbacks;
CREATE TRIGGER trg_notify_feedback_submitted
  AFTER INSERT ON public.feedbacks
  FOR EACH ROW EXECUTE FUNCTION public.notify_feedback_submitted();


-- 3. Notify nutritionist when onboarding is completed
CREATE OR REPLACE FUNCTION public.notify_onboarding_completed()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  _patient_name text;
BEGIN
  IF NEW.status != 'completed' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'completed' THEN RETURN NEW; END IF;

  SELECT COALESCE(full_name, 'Paciente') INTO _patient_name
  FROM public.profiles WHERE user_id = NEW.patient_id;

  INSERT INTO public.notifications (user_id, title, message, type, entity_type, target_route)
  VALUES (
    NEW.nutritionist_id,
    '🎉 Onboarding concluído',
    _patient_name || ' completou todo o processo de onboarding. Está pronto para receber o plano alimentar!',
    'success',
    'onboarding',
    '/patients'
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_onboarding_completed ON public.onboarding_pipelines;
CREATE TRIGGER trg_notify_onboarding_completed
  AFTER UPDATE ON public.onboarding_pipelines
  FOR EACH ROW EXECUTE FUNCTION public.notify_onboarding_completed();


-- 4. Notify nutritionist when patient uploads check-in photos
CREATE OR REPLACE FUNCTION public.notify_checkin_photo_uploaded()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  _nutri_id uuid;
  _patient_name text;
BEGIN
  SELECT nutritionist_id INTO _nutri_id
  FROM public.nutritionist_patients
  WHERE patient_id = NEW.patient_id AND status = 'active'
  LIMIT 1;

  IF _nutri_id IS NULL THEN RETURN NEW; END IF;

  SELECT COALESCE(full_name, 'Paciente') INTO _patient_name
  FROM public.profiles WHERE user_id = NEW.patient_id;

  INSERT INTO public.notifications (user_id, title, message, type, entity_type, target_route)
  VALUES (
    _nutri_id,
    '📸 Nova foto de avaliação',
    _patient_name || ' enviou fotos de avaliação corporal.',
    'progress',
    'body_assessment',
    '/patients'
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_checkin_photo ON public.body_assessment_photos;
CREATE TRIGGER trg_notify_checkin_photo
  AFTER INSERT ON public.body_assessment_photos
  FOR EACH ROW EXECUTE FUNCTION public.notify_checkin_photo_uploaded();
