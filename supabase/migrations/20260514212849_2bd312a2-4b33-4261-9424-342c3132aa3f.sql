
ALTER TABLE public.meal_plans_backup_20260514 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_plan_items_backup_20260514 ENABLE ROW LEVEL SECURITY;
-- Sem policies = nenhum acesso via PostgREST. Service role bypassa RLS.
