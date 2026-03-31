
-- Fix search_path on trigger functions
ALTER FUNCTION validate_meal_plan_status_transition() SET search_path = public;
ALTER FUNCTION fn_guard_plan_status_consistency() SET search_path = public;

-- Fix inconsistent data: approved plan should not be active
-- Temporarily disable the seed milestones trigger that causes cascade errors
ALTER TABLE public.meal_plans DISABLE TRIGGER trg_seed_milestones_on_publish;
ALTER TABLE public.meal_plans DISABLE TRIGGER trg_seed_milestones_on_insert;
ALTER TABLE public.meal_plans DISABLE TRIGGER trg_auto_resolve_onboarding_on_insert_publish;

-- Fix the inconsistent plan
UPDATE public.meal_plans
SET is_active = false
WHERE id = '4776f122-a343-420f-9ba8-5fbde5a97388'
  AND plan_status = 'approved';

-- Migrate 'published' to 'published_to_patient'
UPDATE public.meal_plans
SET plan_status = 'published_to_patient'
WHERE plan_status = 'published';

-- Re-enable triggers
ALTER TABLE public.meal_plans ENABLE TRIGGER trg_seed_milestones_on_publish;
ALTER TABLE public.meal_plans ENABLE TRIGGER trg_seed_milestones_on_insert;
ALTER TABLE public.meal_plans ENABLE TRIGGER trg_auto_resolve_onboarding_on_insert_publish;
