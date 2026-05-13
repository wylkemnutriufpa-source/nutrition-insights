
DO $$
DECLARE
    r RECORD;
    v_snapshot JSONB;
BEGIN
    FOR r IN SELECT id FROM meal_plans WHERE editor_version = 'v3' AND (snapshot IS NULL OR snapshot = 'null'::jsonb) LOOP
        RAISE NOTICE 'Reparando plano %', r.id;
        
        -- Construir um snapshot básico a partir dos items
        SELECT jsonb_build_object(
            'schema_version', '1.0.0',
            'generated_at', now(),
            'plan', jsonb_build_object(
                'plan_id', p.id,
                'title', p.title,
                'editor_version', 'v3'
            ),
            'days', (
                SELECT jsonb_agg(d.day_data)
                FROM (
                    SELECT jsonb_build_object(
                        'day_of_week', sub.day_val,
                        'meals', (
                            SELECT jsonb_agg(m.meal_data)
                            FROM (
                                SELECT jsonb_build_object(
                                    'meal_type', i2.meal_type,
                                    'items', jsonb_agg(
                                        jsonb_build_object(
                                            'id', i2.id,
                                            'title', i2.title,
                                            'description', i2.description,
                                            'macros', jsonb_build_object(
                                                'kcal', i2.calories_target,
                                                'protein_g', i2.protein_target,
                                                'carbs_g', i2.carbs_target,
                                                'fat_g', i2.fat_target
                                            ),
                                            'display_quantity', (i2.edit_metadata->>'display_quantity')::numeric,
                                            'display_unit', i2.edit_metadata->>'display_unit'
                                        )
                                    )
                                )
                                FROM meal_plan_items i2
                                WHERE i2.meal_plan_id = p.id AND COALESCE(i2.day_of_week, 0) = sub.day_val
                                GROUP BY i2.meal_type
                            ) m
                        )
                    ) as day_data
                    FROM (SELECT DISTINCT COALESCE(day_of_week, 0) as day_val FROM meal_plan_items WHERE meal_plan_id = p.id) sub
                ) d
            ),
            'targets', jsonb_build_object(
                'kcal', p.total_target_calories,
                'protein_g', p.total_target_protein,
                'carbs_g', p.total_target_carbs,
                'fat_g', p.total_target_fat
            )
        ) INTO v_snapshot
        FROM meal_plans p
        WHERE p.id = r.id;

        IF v_snapshot IS NOT NULL THEN
            UPDATE meal_plans 
            SET 
                snapshot = v_snapshot,
                snapshot_schema_version = '1.0.0',
                snapshot_generated_at = now()
            WHERE id = r.id;
        END IF;
    END LOOP;
END $$;
