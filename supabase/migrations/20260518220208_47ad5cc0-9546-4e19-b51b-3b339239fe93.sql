-- Update all templates to ensure they have Lanche da Tarde and Jantar for Day 1 and Day 2
DO $$
DECLARE
    t_id UUID;
    kcal_key TEXT;
    day_num INT;
    has_lanche BOOLEAN;
    has_jantar BOOLEAN;
BEGIN
    FOR t_id IN SELECT id FROM public.v3_diet_templates LOOP
        FOR kcal_key IN SELECT jsonb_object_keys(plan_snapshot) FROM public.v3_diet_templates WHERE id = t_id LOOP
            FOR day_num IN 1..2 LOOP
                -- Check if Day X has Lanche da Tarde
                SELECT EXISTS (
                    SELECT 1 FROM jsonb_array_elements(plan_snapshot->kcal_key->'meals') m 
                    WHERE (m->>'day_of_week')::int = day_num AND m->>'name' = 'Lanche da Tarde'
                ) INTO has_lanche 
                FROM public.v3_diet_templates WHERE id = t_id;

                IF NOT has_lanche THEN
                    UPDATE public.v3_diet_templates 
                    SET plan_snapshot = jsonb_set(
                        plan_snapshot, 
                        ARRAY[kcal_key, 'meals'], 
                        (plan_snapshot->kcal_key->'meals') || jsonb_build_array(
                            jsonb_build_object(
                                'id', gen_random_uuid(),
                                'name', 'Lanche da Tarde',
                                'time', '16:00',
                                'day_of_week', day_num,
                                'items', jsonb_build_array(
                                    jsonb_build_object(
                                        'id', 'i_lanche_' || t_id || '_' || day_num,
                                        'instanceId', 'inst_lanche_' || t_id || '_' || day_num,
                                        'name', 'Iogurte com Frutas e Granola',
                                        'quantity', 1,
                                        'clinical_mass_g', 200,
                                        'kcal', 180,
                                        'protein', 12,
                                        'carbs', 25,
                                        'fat', 4,
                                        'substitutions', '[]'::jsonb,
                                        'imageUrl', 'https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/iogurte-com-frutas.jpg'
                                    )
                                )
                            )
                        )
                    )
                    WHERE id = t_id;
                END IF;

                -- Check if Day X has Jantar
                SELECT EXISTS (
                    SELECT 1 FROM jsonb_array_elements(plan_snapshot->kcal_key->'meals') m 
                    WHERE (m->>'day_of_week')::int = day_num AND m->>'name' = 'Jantar'
                ) INTO has_jantar 
                FROM public.v3_diet_templates WHERE id = t_id;

                IF NOT has_jantar THEN
                    UPDATE public.v3_diet_templates 
                    SET plan_snapshot = jsonb_set(
                        plan_snapshot, 
                        ARRAY[kcal_key, 'meals'], 
                        (plan_snapshot->kcal_key->'meals') || jsonb_build_array(
                            jsonb_build_object(
                                'id', gen_random_uuid(),
                                'name', 'Jantar',
                                'time', '19:30',
                                'day_of_week', day_num,
                                'items', jsonb_build_array(
                                    jsonb_build_object(
                                        'id', 'i_jantar_' || t_id || '_' || day_num,
                                        'instanceId', 'inst_jantar_' || t_id || '_' || day_num,
                                        'name', 'Arroz, Feijão, Frango e Salada',
                                        'quantity', 1,
                                        'clinical_mass_g', 400,
                                        'kcal', 350,
                                        'protein', 35,
                                        'carbs', 40,
                                        'fat', 8,
                                        'substitutions', '[]'::jsonb,
                                        'imageUrl', 'https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/arroz-feijao-frango.png'
                                    )
                                )
                            )
                        )
                    )
                    WHERE id = t_id;
                END IF;
            END LOOP;
        END LOOP;
    END LOOP;
END $$;