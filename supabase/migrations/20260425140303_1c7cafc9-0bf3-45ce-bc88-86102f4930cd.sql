-- 1. Remover aliases genéricos de "lanche" que apontam para sanduíche natural
DELETE FROM public.meal_visual_aliases
WHERE normalized_alias IN (
  'lanche da manha',
  'lanche da tarde',
  'lanche manha',
  'lanche tarde',
  'lanche natural'
);

-- 2. Limpar vínculos visuais incorretos em meal_plan_items que estão apontando para sanduiche-natural
-- mas cujo título é genérico (Lanche da Manhã, Lanche da Tarde, Fruta, etc.)
UPDATE public.meal_plan_items
SET visual_library_item_id = NULL
WHERE visual_library_item_id IN (
  SELECT id FROM public.meal_visual_library WHERE name = 'sanduiche-natural'
)
AND (
  LOWER(title) LIKE '%lanche%'
  OR LOWER(title) LIKE '%fruta%'
  OR LOWER(title) = 'lanche da manhã'
  OR LOWER(title) = 'lanche da tarde'
)
AND LOWER(title) NOT LIKE '%sanduíche%'
AND LOWER(title) NOT LIKE '%sanduiche%';

-- 3. Mesma limpeza em saved_meals
UPDATE public.saved_meals
SET visual_library_item_id = NULL
WHERE visual_library_item_id IN (
  SELECT id FROM public.meal_visual_library WHERE name = 'sanduiche-natural'
)
AND (
  LOWER(title) LIKE '%lanche%'
  OR LOWER(title) LIKE '%fruta%'
)
AND LOWER(title) NOT LIKE '%sanduíche%'
AND LOWER(title) NOT LIKE '%sanduiche%';