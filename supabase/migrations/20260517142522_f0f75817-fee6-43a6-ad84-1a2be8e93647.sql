
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
    
    -- Insert names and display names
    INSERT INTO food_image_mapping (name_lower, img_url)
    SELECT DISTINCT ON (LOWER(TRIM(name))) LOWER(TRIM(name)), image_url 
    FROM public.meal_visual_library 
    WHERE image_url IS NOT NULL AND name IS NOT NULL
    ON CONFLICT (name_lower) DO UPDATE SET img_url = EXCLUDED.img_url;

    INSERT INTO food_image_mapping (name_lower, img_url)
    SELECT DISTINCT ON (LOWER(TRIM(display_name))) LOWER(TRIM(display_name)), image_url 
    FROM public.meal_visual_library 
    WHERE image_url IS NOT NULL AND display_name IS NOT NULL
    ON CONFLICT (name_lower) DO UPDATE SET img_url = EXCLUDED.img_url;

    -- Helper function for matching (fuzzy)
    -- We'll use this logic inside the JSON transformation
    -- For simplicity in a single script, we'll try exact, then 'contains'

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
                                    THEN (
                                        SELECT m.img_url 
                                        FROM food_image_mapping m 
                                        WHERE LOWER(TRIM(COALESCE(item->>'title', item->>'name', ''))) LIKE '%' || m.name_lower || '%'
                                        OR m.name_lower LIKE '%' || LOWER(TRIM(COALESCE(item->>'title', item->>'name', ''))) || '%'
                                        LIMIT 1
                                    )
                                    ELSE NULL
                                END
                            )
                            FROM jsonb_array_elements(meal->'items') AS item
                        )
                    )
                )
                FROM jsonb_array_elements(t_meals) AS meal
            )
            WHERE id = t_id;
            
            -- Re-apply the found URLs back into the item objects (PostgreSQL JSONB transformation is tricky)
            -- This second pass actually injects the found URL if it exists
            UPDATE public.meal_plan_templates
            SET meals = (
                SELECT jsonb_agg(
                    meal || jsonb_build_object(
                        'items', (
                            SELECT jsonb_agg(
                                CASE 
                                    WHEN (item->>'found_url' IS NOT NULL)
                                    THEN (item - 'found_url') || jsonb_build_object('image_url', item->>'found_url', 'imageUrl', item->>'found_url')
                                    ELSE item
                                END
                            )
                            FROM (
                                SELECT item || jsonb_build_object('found_url', (
                                    SELECT m.img_url 
                                    FROM food_image_mapping m 
                                    WHERE LOWER(TRIM(COALESCE(item->>'title', item->>'name', ''))) LIKE '%' || m.name_lower || '%'
                                    OR m.name_lower LIKE '%' || LOWER(TRIM(COALESCE(item->>'title', item->>'name', ''))) || '%'
                                    LIMIT 1
                                )) AS item
                                FROM jsonb_array_elements(meal->'items') AS item
                            ) sub
                        )
                    )
                )
                FROM jsonb_array_elements(meals) AS meal
            )
            WHERE id = t_id;
        END IF;
    END LOOP;

    -- 2. Update v3_diet_templates and active meal_plans with same logic
    -- (Skipping for brevity in thought, but I will include them in the query)
    
    -- Actually let's just use a simpler SQL for all at once
    -- 2. v3_diet_templates
    UPDATE public.v3_diet_templates
    SET plan_snapshot = plan_snapshot || jsonb_build_object(
        'meals', (
            SELECT jsonb_agg(
                meal || jsonb_build_object(
                    'items', (
                        SELECT jsonb_agg(
                            CASE 
                                WHEN (item->>'image_url' IS NULL OR item->>'image_url' LIKE '%unsplash%' OR item->>'image_url' LIKE '%placeholder%') 
                                THEN (
                                    SELECT item || jsonb_build_object('image_url', m.img_url, 'imageUrl', m.img_url)
                                    FROM food_image_mapping m 
                                    WHERE LOWER(TRIM(COALESCE(item->>'title', item->>'name', ''))) LIKE '%' || m.name_lower || '%'
                                    OR m.name_lower LIKE '%' || LOWER(TRIM(COALESCE(item->>'title', item->>'name', ''))) || '%'
                                    LIMIT 1
                                )
                                ELSE item
                            END
                        )
                        FROM jsonb_array_elements(meal->'items') AS item
                    )
                )
            )
            FROM jsonb_array_elements(plan_snapshot->'meals') AS meal
        )
    )
    WHERE active = true AND plan_snapshot ? 'meals';

    -- 3. active meal_plans
    UPDATE public.meal_plans
    SET snapshot = snapshot || jsonb_build_object(
        'meals', (
            SELECT jsonb_agg(
                meal || jsonb_build_object(
                    'items', (
                        SELECT jsonb_agg(
                            CASE 
                                WHEN (item->>'image_url' IS NULL OR item->>'image_url' LIKE '%unsplash%' OR item->>'image_url' LIKE '%placeholder%') 
                                THEN (
                                    SELECT COALESCE(
                                        (SELECT item || jsonb_build_object('image_url', m.img_url, 'imageUrl', m.img_url)
                                         FROM food_image_mapping m 
                                         WHERE LOWER(TRIM(COALESCE(item->>'title', item->>'name', ''))) LIKE '%' || m.name_lower || '%'
                                         OR m.name_lower LIKE '%' || LOWER(TRIM(COALESCE(item->>'title', item->>'name', ''))) || '%'
                                         LIMIT 1),
                                        item
                                    )
                                )
                                ELSE item
                            END
                        )
                        FROM jsonb_array_elements(meal->'items') AS item
                    )
                )
            )
            FROM jsonb_array_elements(snapshot->'meals') AS meal
        )
    )
    WHERE is_active = true AND snapshot ? 'meals';

    DROP TABLE food_image_mapping;
END $$;
