
-- ===== FIX "carne-grelhada" catch-all =====

-- Picanha → picanha
UPDATE public.meal_plan_items 
SET visual_library_item_id = '553edcfc-3e25-4c5f-975e-17f06cee2a0e'
WHERE visual_library_item_id = 'b555e8c1-5093-4941-b02a-f6d656b5df33'
AND (description ILIKE '%picanha%');

-- Maminha → maminha  
UPDATE public.meal_plan_items 
SET visual_library_item_id = '5097ec93-b046-4c9a-9e1d-791114b3e683'
WHERE visual_library_item_id = 'b555e8c1-5093-4941-b02a-f6d656b5df33'
AND description ILIKE '%maminha%';

-- Acém → acem
UPDATE public.meal_plan_items 
SET visual_library_item_id = '93948937-c4f5-41de-9000-708ad2ced1d2'
WHERE visual_library_item_id = 'b555e8c1-5093-4941-b02a-f6d656b5df33'
AND (description ILIKE '%acém%' OR description ILIKE '%acem%');

-- Carne de panela → carne-assada-de-panela
UPDATE public.meal_plan_items 
SET visual_library_item_id = '2cd6493f-c12a-4425-9359-2b961a7a457c'
WHERE visual_library_item_id = 'b555e8c1-5093-4941-b02a-f6d656b5df33'
AND description ILIKE '%panela%';

-- Costelinha / costela → costela-suina
UPDATE public.meal_plan_items 
SET visual_library_item_id = '4c55b5ed-8059-49b3-92f2-07277f5cfe2d'
WHERE visual_library_item_id = 'b555e8c1-5093-4941-b02a-f6d656b5df33'
AND (description ILIKE '%costelinha%' OR description ILIKE '%costela%');

-- Lombo / porco → lombo-suino
UPDATE public.meal_plan_items 
SET visual_library_item_id = '1c23b6f6-ec96-4e2a-929d-74d5997fabe9'
WHERE visual_library_item_id = 'b555e8c1-5093-4941-b02a-f6d656b5df33'
AND (description ILIKE '%lombo%' OR description ILIKE '%filé de porco%' OR description ILIKE '%file de porco%');

-- Tilápia → file-de-tilapia
UPDATE public.meal_plan_items 
SET visual_library_item_id = 'f86f1426-89f1-4844-99b2-c8b4b634912f'
WHERE visual_library_item_id = 'b555e8c1-5093-4941-b02a-f6d656b5df33'
AND (description ILIKE '%tilápia%' OR description ILIKE '%tilapia%');

-- Sobrecoxa / coxa → coxa-e-sobrecoxa
UPDATE public.meal_plan_items 
SET visual_library_item_id = '21cc09a0-6261-41ea-afbd-69363cfed20e'
WHERE visual_library_item_id = 'b555e8c1-5093-4941-b02a-f6d656b5df33'
AND (description ILIKE '%sobrecoxa%' OR description ILIKE '%coxa de frango%' OR description ILIKE '%coxa assada%');

-- Frango em carne-grelhada → frango-grelhado
UPDATE public.meal_plan_items 
SET visual_library_item_id = '56dcb495-b7bf-4c70-9a8b-825874eaa89a'
WHERE visual_library_item_id = 'b555e8c1-5093-4941-b02a-f6d656b5df33'
AND (description ILIKE '%frango%' OR description ILIKE '%peito de frango%');

-- Peixe em carne-grelhada → peixe-grelhado
UPDATE public.meal_plan_items 
SET visual_library_item_id = '3d8b6965-6d90-4e65-9fea-643e0321129b'
WHERE visual_library_item_id = 'b555e8c1-5093-4941-b02a-f6d656b5df33'
AND (description ILIKE '%peixe%' OR description ILIKE '%salmão%' OR description ILIKE '%salmao%' OR description ILIKE '%pescada%' OR description ILIKE '%merluza%');

-- ===== FIX "frango-grelhado" catch-all =====

-- Peixe em frango-grelhado → peixe-grelhado
UPDATE public.meal_plan_items 
SET visual_library_item_id = '3d8b6965-6d90-4e65-9fea-643e0321129b'
WHERE visual_library_item_id = '56dcb495-b7bf-4c70-9a8b-825874eaa89a'
AND (description ILIKE '%peixe%' OR description ILIKE '%salmão%' OR description ILIKE '%salmao%' OR description ILIKE '%pescada%' OR description ILIKE '%merluza%')
AND description NOT ILIKE '%frango%';

-- Tilápia em frango-grelhado → file-de-tilapia
UPDATE public.meal_plan_items 
SET visual_library_item_id = 'f86f1426-89f1-4844-99b2-c8b4b634912f'
WHERE visual_library_item_id = '56dcb495-b7bf-4c70-9a8b-825874eaa89a'
AND (description ILIKE '%tilápia%' OR description ILIKE '%tilapia%')
AND description NOT ILIKE '%frango%';

-- Bife / carne em frango-grelhado → carne-grelhada
UPDATE public.meal_plan_items 
SET visual_library_item_id = 'b555e8c1-5093-4941-b02a-f6d656b5df33'
WHERE visual_library_item_id = '56dcb495-b7bf-4c70-9a8b-825874eaa89a'
AND (description ILIKE '%bife%' OR description ILIKE '%carne vermelha%' OR description ILIKE '%carne magra%' OR description ILIKE '%alcatra%' OR description ILIKE '%patinho%')
AND description NOT ILIKE '%frango%';

-- Picanha em frango-grelhado → picanha
UPDATE public.meal_plan_items 
SET visual_library_item_id = '553edcfc-3e25-4c5f-975e-17f06cee2a0e'
WHERE visual_library_item_id = '56dcb495-b7bf-4c70-9a8b-825874eaa89a'
AND description ILIKE '%picanha%'
AND description NOT ILIKE '%frango%';

-- Coxa/sobrecoxa em frango-grelhado → coxa-e-sobrecoxa
UPDATE public.meal_plan_items 
SET visual_library_item_id = '21cc09a0-6261-41ea-afbd-69363cfed20e'
WHERE visual_library_item_id = '56dcb495-b7bf-4c70-9a8b-825874eaa89a'
AND (description ILIKE '%coxa de frango%' OR description ILIKE '%sobrecoxa%' OR description ILIKE '%coxa assada%');

-- Costelinha em frango-grelhado → costela-suina
UPDATE public.meal_plan_items 
SET visual_library_item_id = '4c55b5ed-8059-49b3-92f2-07277f5cfe2d'
WHERE visual_library_item_id = '56dcb495-b7bf-4c70-9a8b-825874eaa89a'
AND (description ILIKE '%costelinha%' OR description ILIKE '%costela%')
AND description NOT ILIKE '%frango%';

-- Lombo/porco em frango-grelhado → lombo-suino
UPDATE public.meal_plan_items 
SET visual_library_item_id = '1c23b6f6-ec96-4e2a-929d-74d5997fabe9'
WHERE visual_library_item_id = '56dcb495-b7bf-4c70-9a8b-825874eaa89a'
AND (description ILIKE '%lombo%' OR description ILIKE '%filé de porco%' OR description ILIKE '%file de porco%')
AND description NOT ILIKE '%frango%';

-- ===== FIX "peixe-grelhado" catch-all =====

-- Tilápia em peixe-grelhado → file-de-tilapia (specific image)
UPDATE public.meal_plan_items 
SET visual_library_item_id = 'f86f1426-89f1-4844-99b2-c8b4b634912f'
WHERE visual_library_item_id = '3d8b6965-6d90-4e65-9fea-643e0321129b'
AND (description ILIKE '%tilápia%' OR description ILIKE '%tilapia%');
