-- Renomear meal_type para tipo_refeicao nas tabelas identificadas
ALTER TABLE public.nutritionist_meal_templates RENAME COLUMN meal_type TO tipo_refeicao;
ALTER TABLE public.quick_meal_templates RENAME COLUMN meal_type TO tipo_refeicao;
ALTER TABLE public.meal_recipes RENAME COLUMN meal_type TO tipo_refeicao;
ALTER TABLE public.meal_feedback RENAME COLUMN meal_type TO tipo_refeicao;
ALTER TABLE public.meal_library RENAME COLUMN meal_type TO tipo_refeicao;
ALTER TABLE public.saved_meal_templates RENAME COLUMN meal_type TO tipo_refeicao;
ALTER TABLE public.meal_plan_meal_targets RENAME COLUMN meal_type TO tipo_refeicao;

-- V3 Specific tables
ALTER TABLE public.v3_library_items RENAME COLUMN meal_type TO tipo_refeicao;
ALTER TABLE public.v3_clusters RENAME COLUMN meal_type TO tipo_refeicao;
ALTER TABLE public.v3_substitutions RENAME COLUMN meal_type TO tipo_refeicao;

-- Histórico/Logs
ALTER TABLE public.clinical_event_log RENAME COLUMN meal_type TO tipo_refeicao;
