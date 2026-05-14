WITH normalized_items AS (
  SELECT 
    mpi.id,
    lower(trim(mpi.title)) AS norm_title
  FROM meal_plan_items mpi
  JOIN meal_plans mp ON mp.id = mpi.meal_plan_id
  WHERE mpi.image_url IS NULL
    AND mpi.visual_library_item_id IS NULL
    AND (
      mp.generation_metadata->>'editor_v3' = 'true'
      OR mp.title ILIKE 'Plano V3%'
    )
),
matches AS (
  SELECT 
    ni.id AS item_id,
    mvl.id AS visual_id,
    mvl.image_url,
    CASE 
      WHEN lower(coalesce(mvl.display_name, mvl.name)) = ni.norm_title THEN 1
      WHEN lower(coalesce(mvl.display_name, mvl.name)) LIKE ni.norm_title || '%' THEN 2
      WHEN lower(coalesce(mvl.display_name, mvl.name)) LIKE '%' || ni.norm_title || '%' THEN 3
      ELSE 4
    END AS rank
  FROM normalized_items ni
  JOIN meal_visual_library mvl 
    ON mvl.is_active = true
    AND mvl.image_url IS NOT NULL
    AND mvl.nutritionist_id IS NULL
    AND (
      lower(coalesce(mvl.display_name, mvl.name)) = ni.norm_title
      OR lower(coalesce(mvl.display_name, mvl.name)) LIKE ni.norm_title || '%'
      OR lower(coalesce(mvl.display_name, mvl.name)) LIKE '%' || ni.norm_title || '%'
    )
),
best_match AS (
  SELECT DISTINCT ON (item_id)
    item_id, visual_id, image_url, rank
  FROM matches
  ORDER BY item_id, rank ASC, visual_id ASC
)
UPDATE meal_plan_items mpi
SET 
  visual_library_item_id = bm.visual_id,
  image_url = bm.image_url
FROM best_match bm
WHERE mpi.id = bm.item_id;