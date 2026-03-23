
-- Fix: notify patient when meal plan is published (correct column: plan_status)
CREATE OR REPLACE FUNCTION public.notify_on_plan_publish()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.plan_status = 'published' AND (OLD.plan_status IS DISTINCT FROM 'published') THEN
    INSERT INTO public.notifications (user_id, title, message, type, entity_type, entity_id, target_route)
    VALUES (
      NEW.patient_id,
      'Plano alimentar atualizado! 🥗',
      'Seu profissional publicou um novo plano alimentar para você.',
      'plan_published',
      'meal_plan',
      NEW.id,
      '/my-diet'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_plan_publish ON public.meal_plans;
CREATE TRIGGER trg_notify_plan_publish
  AFTER UPDATE ON public.meal_plans
  FOR EACH ROW
  WHEN (NEW.plan_status IS DISTINCT FROM OLD.plan_status)
  EXECUTE FUNCTION public.notify_on_plan_publish();

-- Generate milestones on plan publish
CREATE OR REPLACE FUNCTION public.generate_plan_milestones()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  plan_start DATE;
BEGIN
  IF NEW.plan_status = 'published' AND (OLD.plan_status IS DISTINCT FROM 'published') THEN
    plan_start := CURRENT_DATE;
    INSERT INTO public.calendar_milestones (patient_id, milestone_type, milestone_label, milestone_date, source, entity_id)
    VALUES
      (NEW.patient_id, 'plan_start', '🚀 Início do Plano', plan_start, 'meal_plan', NEW.id),
      (NEW.patient_id, 'day_7', '📊 Revisão 7 dias', plan_start + 7, 'meal_plan', NEW.id),
      (NEW.patient_id, 'day_15', '📈 Marco 15 dias', plan_start + 15, 'meal_plan', NEW.id),
      (NEW.patient_id, 'day_30', '🎯 Avaliação 30 dias', plan_start + 30, 'meal_plan', NEW.id),
      (NEW.patient_id, 'day_45', '💪 Marco 45 dias', plan_start + 45, 'meal_plan', NEW.id),
      (NEW.patient_id, 'day_60', '🏆 Avaliação 60 dias', plan_start + 60, 'meal_plan', NEW.id)
    ON CONFLICT (patient_id, milestone_type, milestone_date) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_generate_plan_milestones ON public.meal_plans;
CREATE TRIGGER trg_generate_plan_milestones
  AFTER UPDATE ON public.meal_plans
  FOR EACH ROW
  WHEN (NEW.plan_status IS DISTINCT FROM OLD.plan_status)
  EXECUTE FUNCTION public.generate_plan_milestones();
