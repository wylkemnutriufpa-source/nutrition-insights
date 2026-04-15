
-- Replace the immutability guard to allow plan-owner professionals to modify items
CREATE OR REPLACE FUNCTION public.fn_guard_published_plan_items_immutable()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _plan_status text;
  _nutritionist_id uuid;
  _caller_id uuid;
BEGIN
  SELECT plan_status, nutritionist_id INTO _plan_status, _nutritionist_id
    FROM public.meal_plans
   WHERE id = OLD.meal_plan_id;

  -- Only block if plan is in immutable status AND caller is NOT the owning nutritionist
  _caller_id := auth.uid();
  
  IF _plan_status IN ('approved', 'published', 'published_to_patient') THEN
    -- Allow the owning nutritionist full authority
    IF _caller_id IS NOT NULL AND _caller_id = _nutritionist_id THEN
      IF TG_OP = 'DELETE' THEN
        RETURN OLD;
      END IF;
      RETURN NEW;
    END IF;
    
    -- Also allow admins
    IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _caller_id AND role = 'admin') THEN
      IF TG_OP = 'DELETE' THEN
        RETURN OLD;
      END IF;
      RETURN NEW;
    END IF;
    
    -- Block everyone else
    RAISE EXCEPTION 'Plano imutável (status: %). Apenas o nutricionista responsável pode alterar.', _plan_status;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;
