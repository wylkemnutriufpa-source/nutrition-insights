
DO $$
DECLARE
    t_id UUID;
    t_meals JSONB;
    v3_id UUID;
    v3_snapshot JSONB;
    p_id UUID;
    p_snapshot JSONB;
BEGIN
    -- Temporary table for mapping
    CREATE TEMP TABLE IF NOT EXISTS food_image_mapping (
        name_lower TEXT PRIMARY KEY,
        img_url TEXT
    );
    
    -- Insert names
    INSERT INTO food_image_mapping (name_lower, img_url)
    SELECT DISTINCT ON (LOWER(TRIM(name))) LOWER(TRIM(name)), image_url 
    FROM public.meal_visual_library 
    WHERE image_url IS NOT NULL AND name IS NOT NULL
    ON CONFLICT (name_lower) DO UPDATE SET img_url = EXCLUDED.img_url;

    -- Insert display_names (might overwrite names if they share the same normalized key, which is fine)
    INSERT INTO food_image_mapping (name_lower, img_url)
    SELECT DISTINCT ON (LOWER(TRIM(display_name))) LOWER(TRIM(display_name)), image_url 
    FROM public.meal_visual_library 
    WHERE image_url IS NOT NULL AND display_name IS NOT NULL
    ON CONFLICT (name_lower) DO UPDATE SET img_url = EXCLUDED.img_url;

    -- 1. Update meal_plan_templates
    FOR t_id, t_meals IN SELECT id, meals FROM public.meal_plan_templates LOOP
        IF t_meals IS NOT NULL AND jsonb_array_length(t_meals) > 0 THEN
            UPDATE public.meal_plan_templates
            SET meals = (
                SELECT jsonb_agg(
                    meal || jsonb_build_object(
                        'items', (
                            SELECT jsonb_agg(
                                CASE 
                                    WHEN (item->>'image_url' IS NULL OR item->>'image_url' LIKE '%unsplash%' OR item->>'image_url' LIKE '%placeholder%') 
                                    AND (SELECT img_url FROM food_image_mapping WHERE name_lower = LOWER(TRIM(COALESCE(item->>'title', item->>'name', '')))) IS NOT NULL
                                    THEN item || jsonb_build_object(
                                        'image_url', (SELECT img_url FROM food_image_mapping WHERE name_lower = LOWER(TRIM(COALESCE(item->>'title', item->>'name', '')))),
                                        'imageUrl', (SELECT img_url FROM food_image_mapping WHERE name_lower = LOWER(TRIM(COALESCE(item->>'title', item->>'name', ''))))
                                    )
                                    ELSE item
                                END
                            )
                            FROM jsonb_array_elements(meal->'items') AS item
                        )
                    )
                )
                FROM jsonb_array_elements(t_meals) AS meal
            )
            WHERE id = t_id;
        END IF;
    END LOOP;

    -- 2. Update v3_diet_templates
    FOR v3_id, v3_snapshot IN SELECT id, plan_snapshot FROM public.v3_diet_templates LOOP
        IF v3_snapshot IS NOT NULL AND v3_snapshot ? 'meals' AND jsonb_array_length(v3_snapshot->'meals') > 0 THEN
            UPDATE public.v3_diet_templates
            SET plan_snapshot = v3_snapshot || jsonb_build_object(
                'meals', (
                    SELECT jsonb_agg(
                        meal || jsonb_build_object(
                            'items', (
                                SELECT jsonb_agg(
                                    CASE 
                                        WHEN (item->>'image_url' IS NULL OR item->>'image_url' LIKE '%unsplash%' OR item->>'image_url' LIKE '%placeholder%') 
                                        AND (SELECT img_url FROM food_image_mapping WHERE name_lower = LOWER(TRIM(COALESCE(item->>'title', item->>'name', '')))) IS NOT NULL
                                        THEN item || jsonb_build_object(
                                            'image_url', (SELECT img_url FROM food_image_mapping WHERE name_lower = LOWER(TRIM(COALESCE(item->>'title', item->>'name', '')))),
                                            'imageUrl', (SELECT img_url FROM food_image_mapping WHERE name_lower = LOWER(TRIM(COALESCE(item->>'title', item->>'name', ''))))
                                        )
                                        ELSE item
                                    END
                                )
                                FROM jsonb_array_elements(meal->'items') AS item
                            )
                        )
                    )
                    FROM jsonb_array_elements(v3_snapshot->'meals') AS meal
                )
            )
            WHERE id = v3_id;
        END IF;
    END LOOP;

    -- 3. Update active meal_plans snapshots
    FOR p_id, p_snapshot IN SELECT id, snapshot FROM public.meal_plans WHERE is_active = true LOOP
        IF p_snapshot IS NOT NULL AND p_snapshot ? 'meals' AND jsonb_array_length(p_snapshot->'meals') > 0 THEN
            UPDATE public.meal_plans
            SET snapshot = p_snapshot || jsonb_build_object(
                'meals', (
                    SELECT jsonb_agg(
                        meal || jsonb_build_object(
                            'items', (
                                SELECT jsonb_agg(
                                    CASE 
                                        WHEN (item->>'image_url' IS NULL OR item->>'image_url' LIKE '%unsplash%' OR item->>'image_url' LIKE '%placeholder%') 
                                        AND (SELECT img_url FROM food_image_mapping WHERE name_lower = LOWER(TRIM(COALESCE(item->>'title', item->>'name', '')))) IS NOT NULL
                                        THEN item || jsonb_build_object(
                                            'image_url', (SELECT img_url FROM food_image_mapping WHERE name_lower = LOWER(TRIM(COALESCE(item->>'title', item->>'name', '')))),
                                            'imageUrl', (SELECT img_url FROM food_image_mapping WHERE name_lower = LOWER(TRIM(COALESCE(item->>'title', item->>'name', ''))))
                                        )
                                        ELSE item
                                    END
                                )
                                FROM jsonb_array_elements(meal->'items') AS item
                            )
                        )
                    )
                    FROM jsonb_array_elements(p_snapshot->'meals') AS meal
                )
            )
            WHERE id = p_id;
        END IF;
    END LOOP;

    DROP TABLE food_image_mapping;
END $$;
