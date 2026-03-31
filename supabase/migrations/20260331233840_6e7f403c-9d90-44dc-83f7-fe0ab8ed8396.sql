
-- Re-map meal_plan_items from generic "fruta" (no image) to specific fruit items (with images)
-- based on description content

-- Banana (use banana-com-pasta-de-amendoim as closest visual for now)
UPDATE public.meal_plan_items 
SET visual_library_item_id = (SELECT id FROM public.meal_visual_library WHERE slug = 'banana-com-pasta-amendoim' LIMIT 1)
WHERE visual_library_item_id = 'b6cc8684-203b-46af-9711-104e0ca52a29'
AND (description ILIKE '%banana%')
AND description NOT ILIKE '%pasta de amendoim%';

-- Laranja
UPDATE public.meal_plan_items 
SET visual_library_item_id = (SELECT id FROM public.meal_visual_library WHERE slug = 'laranja' LIMIT 1)
WHERE visual_library_item_id = 'b6cc8684-203b-46af-9711-104e0ca52a29'
AND description ILIKE '%laranja%';

-- Goiaba
UPDATE public.meal_plan_items 
SET visual_library_item_id = (SELECT id FROM public.meal_visual_library WHERE slug = 'goiaba' LIMIT 1)
WHERE visual_library_item_id = 'b6cc8684-203b-46af-9711-104e0ca52a29'
AND description ILIKE '%goiaba%';

-- Maçã
UPDATE public.meal_plan_items 
SET visual_library_item_id = (SELECT id FROM public.meal_visual_library WHERE slug = 'maca' LIMIT 1)
WHERE visual_library_item_id = 'b6cc8684-203b-46af-9711-104e0ca52a29'
AND (description ILIKE '%maçã%' OR description ILIKE '%maca %' OR description ILIKE '%1 maca%');

-- Mamão
UPDATE public.meal_plan_items 
SET visual_library_item_id = (SELECT id FROM public.meal_visual_library WHERE slug = 'mamao' LIMIT 1)
WHERE visual_library_item_id = 'b6cc8684-203b-46af-9711-104e0ca52a29'
AND (description ILIKE '%mamão%' OR description ILIKE '%mamao%');

-- Manga
UPDATE public.meal_plan_items 
SET visual_library_item_id = (SELECT id FROM public.meal_visual_library WHERE slug = 'manga' LIMIT 1)
WHERE visual_library_item_id = 'b6cc8684-203b-46af-9711-104e0ca52a29'
AND description ILIKE '%manga%';

-- Morango
UPDATE public.meal_plan_items 
SET visual_library_item_id = (SELECT id FROM public.meal_visual_library WHERE slug = 'morango' LIMIT 1)
WHERE visual_library_item_id = 'b6cc8684-203b-46af-9711-104e0ca52a29'
AND description ILIKE '%morango%';

-- Melancia
UPDATE public.meal_plan_items 
SET visual_library_item_id = (SELECT id FROM public.meal_visual_library WHERE slug = 'melancia' LIMIT 1)
WHERE visual_library_item_id = 'b6cc8684-203b-46af-9711-104e0ca52a29'
AND description ILIKE '%melancia%';

-- Melão
UPDATE public.meal_plan_items 
SET visual_library_item_id = (SELECT id FROM public.meal_visual_library WHERE slug = 'melao' LIMIT 1)
WHERE visual_library_item_id = 'b6cc8684-203b-46af-9711-104e0ca52a29'
AND (description ILIKE '%melão%' OR description ILIKE '%melao%');

-- Abacaxi
UPDATE public.meal_plan_items 
SET visual_library_item_id = (SELECT id FROM public.meal_visual_library WHERE slug = 'abacaxi' LIMIT 1)
WHERE visual_library_item_id = 'b6cc8684-203b-46af-9711-104e0ca52a29'
AND description ILIKE '%abacaxi%';

-- Pêra
UPDATE public.meal_plan_items 
SET visual_library_item_id = (SELECT id FROM public.meal_visual_library WHERE slug = 'pera' LIMIT 1)
WHERE visual_library_item_id = 'b6cc8684-203b-46af-9711-104e0ca52a29'
AND (description ILIKE '%pêra%' OR description ILIKE '%pera%');

-- Uva
UPDATE public.meal_plan_items 
SET visual_library_item_id = (SELECT id FROM public.meal_visual_library WHERE slug = 'uva' LIMIT 1)
WHERE visual_library_item_id = 'b6cc8684-203b-46af-9711-104e0ca52a29'
AND description ILIKE '%uva%';

-- Castanha (item exists but no image - map to castanha anyway for future fix)
UPDATE public.meal_plan_items 
SET visual_library_item_id = (SELECT id FROM public.meal_visual_library WHERE slug = 'castanha' LIMIT 1)
WHERE visual_library_item_id = 'b6cc8684-203b-46af-9711-104e0ca52a29'
AND (description ILIKE '%castanha%' OR description ILIKE '%nozes%' OR description ILIKE '%amendoa%');

-- Abacate
UPDATE public.meal_plan_items 
SET visual_library_item_id = (SELECT id FROM public.meal_visual_library WHERE slug = 'abacate' LIMIT 1)
WHERE visual_library_item_id = 'b6cc8684-203b-46af-9711-104e0ca52a29'
AND description ILIKE '%abacate%';

-- Banana com pasta de amendoim (exact match)
UPDATE public.meal_plan_items 
SET visual_library_item_id = (SELECT id FROM public.meal_visual_library WHERE slug = 'banana-com-pasta-de-amendoim' LIMIT 1)
WHERE visual_library_item_id = 'b6cc8684-203b-46af-9711-104e0ca52a29'
AND description ILIKE '%pasta de amendoim%';

-- For remaining items still on generic "fruta", try title-based fallback for "Frutas" or "Frutas mistas" → salada-de-frutas
UPDATE public.meal_plan_items 
SET visual_library_item_id = (SELECT id FROM public.meal_visual_library WHERE slug = 'salada-de-frutas' LIMIT 1)
WHERE visual_library_item_id = 'b6cc8684-203b-46af-9711-104e0ca52a29'
AND (LOWER(title) = 'frutas' OR LOWER(title) = 'frutas mistas');
