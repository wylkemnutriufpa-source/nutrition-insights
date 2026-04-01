
-- Fix Luana Hayne's dinner items: 'Peixe grelhado' items wrongly linked to 'Frango Grelhado'
-- Correct them to 'peixe-grelhado' visual
UPDATE meal_plan_items 
SET visual_library_item_id = '3d8b6965-6d90-4e65-9fea-643e0321129b'
WHERE visual_library_item_id = '56dcb495-b7bf-4c70-9a8b-825874eaa89a'
  AND description ILIKE '%peixe grelhado%'
  AND meal_type = 'dinner';
