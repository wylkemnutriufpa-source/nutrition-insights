-- Hardening the function with an explicit search_path
ALTER FUNCTION public.update_meal_plan_totals() SET search_path = public;
