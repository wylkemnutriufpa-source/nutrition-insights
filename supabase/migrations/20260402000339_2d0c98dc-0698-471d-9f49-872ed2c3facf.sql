CREATE OR REPLACE FUNCTION public.fn_auto_tenant_meal_plan_items()
RETURNS TRIGGER AS $$
DECLARE
  resolved_tenant UUID;
BEGIN
  IF NEW.tenant_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT tenant_id INTO resolved_tenant
  FROM public.meal_plans
  WHERE id = NEW.meal_plan_id;

  IF resolved_tenant IS NULL THEN
    RAISE EXCEPTION 'TENANT_RESOLUTION_FAILED: Cannot resolve tenant for meal_plan_items via meal_plan_id=%', NEW.meal_plan_id;
  END IF;

  NEW.tenant_id := resolved_tenant;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;