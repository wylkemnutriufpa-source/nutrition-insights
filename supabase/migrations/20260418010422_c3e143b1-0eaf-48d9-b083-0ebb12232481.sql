UPDATE public.diet_templates SET
  meals = jsonb_set(
    meals,
    '{0,blocks}',
    (
      SELECT jsonb_agg(
        CASE
          WHEN block->>'block_type' = 'drink' THEN
            jsonb_build_object(
              'block_type', 'drink',
              'required', false,
              'base_quantity', '1 xícara',
              'options', jsonb_build_array(
                jsonb_build_object('name','Café preto','portion','200ml'),
                jsonb_build_object('name','Chá','portion','200ml'),
                jsonb_build_object('name','Água','portion','200ml')
              )
            )
          ELSE block
        END
      )
      FROM jsonb_array_elements(meals->0->'blocks') block
    )
  ),
  updated_at = now()
WHERE slug = 'pratico-sem-lactose-v1';