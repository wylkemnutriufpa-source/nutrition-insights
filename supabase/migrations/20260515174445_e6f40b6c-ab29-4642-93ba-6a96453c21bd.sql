-- meal_plan_items
ALTER TABLE public.meal_plan_items RENAME COLUMN calories_target TO meta_calorias;
ALTER TABLE public.meal_plan_items RENAME COLUMN protein_target TO meta_proteinas;
ALTER TABLE public.meal_plan_items RENAME COLUMN carbs_target TO meta_carboidratos;
ALTER TABLE public.meal_plan_items RENAME COLUMN fat_target TO meta_gorduras;
ALTER TABLE public.meal_plan_items RENAME COLUMN meal_type TO tipo_refeicao;

-- meals (uso o metadata para não confundir colunas consumidas com metas se possível, mas vou seguir o padrão do usuário)
ALTER TABLE public.meals RENAME COLUMN calories TO meta_calorias;
ALTER TABLE public.meals RENAME COLUMN protein TO meta_proteinas;
ALTER TABLE public.meals RENAME COLUMN carbs TO meta_carboidratos;
ALTER TABLE public.meals RENAME COLUMN fat TO meta_gorduras;
ALTER TABLE public.meals RENAME COLUMN meal_type TO tipo_refeicao;

-- nc_meal_plan_items
ALTER TABLE public.nc_meal_plan_items RENAME COLUMN calories TO meta_calorias;
ALTER TABLE public.nc_meal_plan_items RENAME COLUMN protein TO meta_proteinas;
ALTER TABLE public.nc_meal_plan_items RENAME COLUMN carbs TO meta_carboidratos;
ALTER TABLE public.nc_meal_plan_items RENAME COLUMN fat TO meta_gorduras;
ALTER TABLE public.nc_meal_plan_items RENAME COLUMN meal_type TO tipo_refeicao;

-- meal_plans (algumas colunas relacionadas)
ALTER TABLE public.meal_plans RENAME COLUMN global_calories_target TO global_meta_calorias;
ALTER TABLE public.meal_plans RENAME COLUMN global_protein_target TO global_meta_proteinas;
ALTER TABLE public.meal_plans RENAME COLUMN global_carbs_target TO global_meta_carboidratos;
ALTER TABLE public.meal_plans RENAME COLUMN global_fat_target TO global_meta_gorduras;
ALTER TABLE public.meal_plans RENAME COLUMN total_target_calories TO total_meta_calorias;
ALTER TABLE public.meal_plans RENAME COLUMN total_target_protein TO total_meta_proteinas;
ALTER TABLE public.meal_plans RENAME COLUMN total_target_carbs TO total_meta_carboidratos;
ALTER TABLE public.meal_plans RENAME COLUMN total_target_fat TO total_meta_gorduras;

-- recipes
ALTER TABLE public.recipes RENAME COLUMN servings TO porcoes;
ALTER TABLE public.recipes RENAME COLUMN calories_per_serving TO calorias_por_porcao;
ALTER TABLE public.recipes RENAME COLUMN protein_per_serving TO proteinas_por_porcao;
ALTER TABLE public.recipes RENAME COLUMN carbs_per_serving TO carboidratos_por_porcao;
ALTER TABLE public.recipes RENAME COLUMN fat_per_serving TO gorduras_por_porcao;

-- saved_meals
ALTER TABLE public.saved_meals RENAME COLUMN meal_type TO tipo_refeicao;

-- ifj_meal_context_rules
ALTER TABLE public.ifj_meal_context_rules RENAME COLUMN meal_type TO tipo_refeicao;
