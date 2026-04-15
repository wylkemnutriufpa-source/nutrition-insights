-- Temporarily disable immutability guard for backfill
ALTER TABLE public.meal_plan_items DISABLE TRIGGER trg_guard_published_plan_items_immutable;

-- Backfill image_url on existing meal_plan_items from meal_visual_library
UPDATE public.meal_plan_items mpi
SET image_url = mvl.image_url
FROM public.meal_visual_library mvl
WHERE mpi.visual_library_item_id = mvl.id
  AND mpi.image_url IS NULL
  AND mvl.image_url IS NOT NULL;

-- Re-enable immutability guard
ALTER TABLE public.meal_plan_items ENABLE TRIGGER trg_guard_published_plan_items_immutable;