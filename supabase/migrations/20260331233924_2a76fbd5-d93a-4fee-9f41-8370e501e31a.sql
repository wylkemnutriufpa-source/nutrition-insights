
-- Tangerina → laranja (visually similar)
UPDATE public.meal_plan_items 
SET visual_library_item_id = (SELECT id FROM public.meal_visual_library WHERE slug = 'laranja' LIMIT 1)
WHERE visual_library_item_id = 'b6cc8684-203b-46af-9711-104e0ca52a29'
AND (description ILIKE '%tangerina%' OR description ILIKE '%mexerica%');

-- Kiwi → salada-de-frutas (best available fallback)
UPDATE public.meal_plan_items 
SET visual_library_item_id = (SELECT id FROM public.meal_visual_library WHERE slug = 'salada-de-frutas' LIMIT 1)
WHERE visual_library_item_id = 'b6cc8684-203b-46af-9711-104e0ca52a29'
AND description ILIKE '%kiwi%';

-- Amêndoas/Pistache → castanha
UPDATE public.meal_plan_items 
SET visual_library_item_id = (SELECT id FROM public.meal_visual_library WHERE slug = 'castanha' LIMIT 1)
WHERE visual_library_item_id = 'b6cc8684-203b-46af-9711-104e0ca52a29'
AND (description ILIKE '%amendoa%' OR description ILIKE '%amêndoa%' OR description ILIKE '%pistache%');

-- Add tangerina alias to laranja
INSERT INTO public.meal_visual_aliases (library_item_id, alias, normalized_alias)
SELECT id, unnest, unnest FROM public.meal_visual_library, unnest(ARRAY['tangerina', 'mexerica', 'ponkan']) WHERE slug = 'laranja'
ON CONFLICT DO NOTHING;

-- Add kiwi alias to salada-de-frutas  
INSERT INTO public.meal_visual_aliases (library_item_id, alias, normalized_alias)
SELECT id, unnest, unnest FROM public.meal_visual_library, unnest(ARRAY['kiwi']) WHERE slug = 'salada-de-frutas'
ON CONFLICT DO NOTHING;

-- Add banana-specific aliases pointing to banana-com-pasta-amendoim (standalone banana)
INSERT INTO public.meal_visual_aliases (library_item_id, alias, normalized_alias)
SELECT id, unnest, unnest FROM public.meal_visual_library, unnest(ARRAY['banana', 'banana media', 'banana com canela']) WHERE slug = 'banana-com-pasta-amendoim'
ON CONFLICT DO NOTHING;
