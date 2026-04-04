
-- 1. Trigger: Notificar personal quando novo aluno é vinculado
CREATE OR REPLACE FUNCTION public.notify_personal_new_student()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_name TEXT;
  v_tenant_id UUID;
BEGIN
  IF NEW.professional_role = 'trainer' AND NEW.link_status = 'active' THEN
    SELECT full_name INTO v_student_name FROM public.profiles WHERE user_id = NEW.patient_id;
    SELECT id INTO v_tenant_id FROM public.tenants LIMIT 1;
    
    IF v_tenant_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, tenant_id, title, message, type, entity_type, entity_id, target_route)
      VALUES (
        NEW.professional_id,
        v_tenant_id,
        'Novo aluno vinculado! 🎉',
        COALESCE(v_student_name, 'Novo aluno') || ' foi vinculado como seu aluno.',
        'info',
        'student',
        NEW.patient_id,
        '/personal/students'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_personal_new_student ON public.patient_professional_links;
CREATE TRIGGER trg_notify_personal_new_student
  AFTER INSERT ON public.patient_professional_links
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_personal_new_student();

-- 2. Trigger: Notificar profissional quando anamnese é respondida
CREATE OR REPLACE FUNCTION public.notify_professional_anamnesis_completed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_name TEXT;
  v_professional_id UUID;
  v_tenant_id UUID;
BEGIN
  SELECT full_name INTO v_student_name FROM public.profiles WHERE user_id = NEW.user_id;
  
  -- Find linked professional (trainer or nutritionist)
  SELECT professional_id INTO v_professional_id 
  FROM public.patient_professional_links 
  WHERE patient_id = NEW.user_id AND link_status = 'active'
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF v_professional_id IS NOT NULL THEN
    SELECT id INTO v_tenant_id FROM public.tenants LIMIT 1;
    
    IF v_tenant_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, tenant_id, title, message, type, entity_type, entity_id, target_route)
      VALUES (
        v_professional_id,
        v_tenant_id,
        'Anamnese respondida! 📋',
        COALESCE(v_student_name, 'Paciente') || ' completou a anamnese.',
        'info',
        'anamnesis',
        NEW.id,
        '/personal/dashboard'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_professional_anamnesis ON public.patient_anamnesis;
CREATE TRIGGER trg_notify_professional_anamnesis
  AFTER INSERT ON public.patient_anamnesis
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_professional_anamnesis_completed();

-- 3. Function: Verificar treinos prestes a vencer (5 dias) - chamada via cron/edge function
CREATE OR REPLACE FUNCTION public.check_workout_plan_expiry()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan RECORD;
  v_student_name TEXT;
  v_tenant_id UUID;
  v_count INT := 0;
BEGIN
  SELECT id INTO v_tenant_id FROM public.tenants LIMIT 1;
  
  FOR v_plan IN
    SELECT wp.id, wp.title, wp.student_id, wp.personal_id, wp.end_date
    FROM public.workout_plans wp
    WHERE wp.is_active = true
      AND wp.end_date IS NOT NULL
      AND wp.end_date::date BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '5 days')
      AND NOT EXISTS (
        SELECT 1 FROM public.notifications n
        WHERE n.entity_id = wp.id::text
          AND n.entity_type = 'workout_plan_expiry'
          AND n.created_at > NOW() - INTERVAL '6 days'
      )
  LOOP
    SELECT full_name INTO v_student_name FROM public.profiles WHERE user_id = v_plan.student_id;
    
    IF v_tenant_id IS NOT NULL THEN
      -- Notificar o aluno
      INSERT INTO public.notifications (user_id, tenant_id, title, message, type, entity_type, entity_id, target_route)
      VALUES (
        v_plan.student_id,
        v_tenant_id,
        'Treino prestes a vencer! ⏰',
        'Seu plano "' || v_plan.title || '" vence em ' || (v_plan.end_date::date - CURRENT_DATE) || ' dia(s).',
        'warning',
        'workout_plan_expiry',
        v_plan.id::text,
        '/patient/workouts'
      );
      
      -- Notificar o personal
      INSERT INTO public.notifications (user_id, tenant_id, title, message, type, entity_type, entity_id, target_route)
      VALUES (
        v_plan.personal_id,
        v_tenant_id,
        'Treino de aluno vencendo! ⏰',
        'Plano "' || v_plan.title || '" de ' || COALESCE(v_student_name, 'aluno') || ' vence em ' || (v_plan.end_date::date - CURRENT_DATE) || ' dia(s).',
        'warning',
        'workout_plan_expiry',
        v_plan.id::text,
        '/personal/workouts'
      );
      
      v_count := v_count + 1;
    END IF;
  END LOOP;
  
  RETURN jsonb_build_object('notified_plans', v_count);
END;
$$;

-- 4. Trigger: Notificar personal quando treino é concluído pelo aluno
CREATE OR REPLACE FUNCTION public.notify_personal_workout_completed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_name TEXT;
  v_personal_id UUID;
  v_routine_name TEXT;
  v_tenant_id UUID;
BEGIN
  SELECT full_name INTO v_student_name FROM public.profiles WHERE user_id = NEW.student_id;
  SELECT wr.name INTO v_routine_name FROM public.workout_routines wr WHERE wr.id = NEW.routine_id;
  
  SELECT wp.personal_id INTO v_personal_id 
  FROM public.workout_plans wp 
  WHERE wp.id = NEW.plan_id;
  
  IF v_personal_id IS NOT NULL THEN
    SELECT id INTO v_tenant_id FROM public.tenants LIMIT 1;
    
    IF v_tenant_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, tenant_id, title, message, type, entity_type, entity_id, target_route)
      VALUES (
        v_personal_id,
        v_tenant_id,
        'Treino concluído! 💪',
        COALESCE(v_student_name, 'Aluno') || ' completou "' || COALESCE(v_routine_name, 'treino') || '"' ||
          CASE WHEN NEW.perceived_effort >= 8 THEN ' (esforço alto: ' || NEW.perceived_effort || '/10)' ELSE '' END ||
          CASE WHEN NEW.pain_report IS NOT NULL AND NEW.pain_report != '' THEN ' ⚠️ Reportou dor' ELSE '' END,
        CASE WHEN NEW.pain_report IS NOT NULL AND NEW.pain_report != '' THEN 'warning' ELSE 'info' END,
        'workout_completion',
        NEW.id,
        '/personal/dashboard'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_personal_workout_completed ON public.workout_completions;
CREATE TRIGGER trg_notify_personal_workout_completed
  AFTER INSERT ON public.workout_completions
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_personal_workout_completed();
