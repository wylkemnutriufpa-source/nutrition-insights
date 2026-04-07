
-- Guard: block UPDATE and DELETE on meal_plan_items when parent plan is published/approved
CREATE OR REPLACE FUNCTION public.fn_guard_published_plan_items_immutable()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  _plan_status text;
BEGIN
  -- For DELETE, use OLD; for UPDATE, use OLD (the row being changed)
  SELECT plan_status INTO _plan_status
    FROM public.meal_plans
   WHERE id = OLD.meal_plan_id;

  IF _plan_status IN ('approved', 'published', 'published_to_patient') THEN
    RAISE EXCEPTION 'Plano imutável (status: %). Não é permitido alterar itens de planos publicados/aprovados. Crie uma nova versão.', _plan_status;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_published_plan_items_immutable ON public.meal_plan_items;

CREATE TRIGGER trg_guard_published_plan_items_immutable
  BEFORE UPDATE OR DELETE ON public.meal_plan_items
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_guard_published_plan_items_immutable();
