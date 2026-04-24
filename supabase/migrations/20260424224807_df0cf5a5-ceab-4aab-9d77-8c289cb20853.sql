
-- 1) Marca Sopa de Legumes como não-diabetes-friendly (continua ativa para outros)
UPDATE public.meal_visual_library
SET clinical_tags = (
      SELECT array_agg(DISTINCT t)
      FROM unnest(COALESCE(clinical_tags, ARRAY[]::text[]) || ARRAY['not_diabetes_friendly']) t
    ),
    updated_at = now()
WHERE slug = 'sopa-de-legumes'
  AND NOT ('not_diabetes_friendly' = ANY(COALESCE(clinical_tags, ARRAY[]::text[])));

-- 2) Adiciona Legumes Cozidos
INSERT INTO public.meal_visual_library
  (slug, name, display_name, category, subcategory, default_portion,
   default_calories, default_protein, default_carbs, default_fat,
   short_description, base_recipe, tags, search_terms, clinical_tags, is_active, sort_order)
VALUES (
  'legumes-cozidos-jantar',
  'legumes-cozidos',
  'Legumes Cozidos',
  'jantar',
  'acompanhamento',
  '1 porção (200g)',
  90, 4, 12, 1,
  'Mix de legumes cozidos no vapor (abobrinha, cenoura, brócolis, couve-flor)',
  'Cozinhe no vapor até ficarem macios. Tempere com azeite, sal e ervas.',
  ARRAY['leve','jantar','low_carb'],
  ARRAY['legumes','vapor','acompanhamento','baixo carboidrato','diabetes'],
  ARRAY['plant_based','low_carb','diabetes_friendly'],
  true,
  100
)
ON CONFLICT (slug) DO UPDATE
  SET clinical_tags = EXCLUDED.clinical_tags,
      category = EXCLUDED.category,
      updated_at = now();

-- 3) Adiciona Legumes Gratinados
INSERT INTO public.meal_visual_library
  (slug, name, display_name, category, subcategory, default_portion,
   default_calories, default_protein, default_carbs, default_fat,
   short_description, base_recipe, tags, search_terms, clinical_tags, is_active, sort_order)
VALUES (
  'legumes-gratinados-jantar',
  'legumes-gratinados',
  'Legumes Gratinados',
  'jantar',
  'acompanhamento',
  '1 porção (200g)',
  160, 9, 12, 8,
  'Legumes (abobrinha, berinjela, tomate) gratinados com queijo magro',
  'Disponha legumes em camadas em refratário, cubra com queijo magro ralado e leve ao forno até gratinar.',
  ARRAY['jantar','low_carb','quente'],
  ARRAY['legumes','gratinado','forno','diabetes','baixo carboidrato'],
  ARRAY['plant_based','low_carb','diabetes_friendly','contains_lactose'],
  true,
  101
)
ON CONFLICT (slug) DO UPDATE
  SET clinical_tags = EXCLUDED.clinical_tags,
      category = EXCLUDED.category,
      updated_at = now();

-- 4) Adiciona Salada Crua de Folhas
INSERT INTO public.meal_visual_library
  (slug, name, display_name, category, subcategory, default_portion,
   default_calories, default_protein, default_carbs, default_fat,
   short_description, base_recipe, tags, search_terms, clinical_tags, is_active, sort_order)
VALUES (
  'salada-crua-folhas-jantar',
  'salada-crua-folhas',
  'Salada Crua de Folhas',
  'jantar',
  'acompanhamento',
  '1 prato (150g)',
  60, 2, 6, 3,
  'Mix de folhas verdes (alface, rúcula, agrião) com tomate e pepino',
  'Lave bem as folhas, monte com tomate e pepino picados. Tempere com azeite, limão e sal.',
  ARRAY['leve','crua','jantar','low_carb'],
  ARRAY['salada','folhas','crua','diabetes','baixo carboidrato'],
  ARRAY['plant_based','low_carb','diabetes_friendly'],
  true,
  102
)
ON CONFLICT (slug) DO UPDATE
  SET clinical_tags = EXCLUDED.clinical_tags,
      category = EXCLUDED.category,
      updated_at = now();
