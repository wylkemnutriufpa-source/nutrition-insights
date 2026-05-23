
-- 1) Fix SECURITY DEFINER views by enabling security_invoker
ALTER VIEW public.templates_enriched SET (security_invoker = on);
ALTER VIEW public.v3_templates_by_family SET (security_invoker = on);

-- 2) Drop backup tables with RLS enabled but no policies (dead data)
DROP TABLE IF EXISTS public.meal_plan_items_backup_20260514;
DROP TABLE IF EXISTS public.meal_plans_backup_20260514;

-- 3) Restrict listing on public storage bucket
DROP POLICY IF EXISTS "Public Access to shared-meal-plans" ON storage.objects;

-- 4) Lock down search_path on all public functions flagged by linter
ALTER FUNCTION public.add_food_to_meal(uuid, text, text, text, numeric) SET search_path = public;
ALTER FUNCTION public.calculate_clinical_kcal_target(numeric, numeric, integer, text, text, text) SET search_path = public;
ALTER FUNCTION public.calculate_nutrition_proportional(text, numeric) SET search_path = public;
ALTER FUNCTION public.classify_and_assign_sovereign_template(uuid, uuid) SET search_path = public;
ALTER FUNCTION public.convert_7_days_to_v3(jsonb) SET search_path = public;
ALTER FUNCTION public.convert_foods_to_items(jsonb) SET search_path = public;
ALTER FUNCTION public.convert_meals_to_days(jsonb) SET search_path = public;
ALTER FUNCTION public.convert_to_v3_complete(jsonb) SET search_path = public;
ALTER FUNCTION public.copy_template_to_patient(uuid, uuid, uuid, date) SET search_path = public;
ALTER FUNCTION public.generate_slug(text) SET search_path = public;
ALTER FUNCTION public.get_safe_alternatives(text, boolean, boolean, boolean) SET search_path = public;
ALTER FUNCTION public.get_v3_templates_by_family(text) SET search_path = public;
ALTER FUNCTION public.process_day_meals(jsonb) SET search_path = public;
ALTER FUNCTION public.resolve_patient_meal_plan(uuid, date) SET search_path = public;
ALTER FUNCTION public.search_templates(text, integer, integer, text) SET search_path = public;
ALTER FUNCTION public.select_sovereign_template(text, integer, text, text, text[], text[]) SET search_path = public;
ALTER FUNCTION public.sync_clinical_assessment_on_anamnesis_complete() SET search_path = public;
ALTER FUNCTION public.sync_meal_item_image() SET search_path = public;
ALTER FUNCTION public.update_food_mass(uuid, text, text, integer, numeric) SET search_path = public;
