-- Create a function to convert legacy foods to items
CREATE OR REPLACE FUNCTION public.convert_foods_to_items(foods jsonb)
RETURNS jsonb AS $$
DECLARE
    food jsonb;
    item jsonb;
    items jsonb := '[]'::jsonb;
BEGIN
    FOR food IN SELECT * FROM jsonb_array_elements(foods)
    LOOP
        item := jsonb_build_object(
            'id', gen_random_uuid(),
            'instanceId', gen_random_uuid(),
            'name', food->>'name',
            'title', food->>'name',
            'kcal', COALESCE((food->>'kcal')::numeric, 0),
            'quantity', 1,
            'quantity_display', food->>'qty',
            'clinical_mass_g', 0,
            'protein', 0,
            'carbs', 0,
            'fat', 0,
            'macros', jsonb_build_object(
                'kcal', COALESCE((food->>'kcal')::numeric, 0),
                'protein_g', 0,
                'carbs_g', 0,
                'fat_g', 0
            ),
            'is_primary', false,
            'substitutions', '[]'::jsonb
        );
        items := items || item;
    END LOOP;
    RETURN items;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
    r RECORD;
    new_snapshot jsonb;
    kcal_level text;
    kcal_data jsonb;
    day jsonb;
    meal jsonb;
    new_days jsonb;
    new_meals jsonb;
    modified boolean;
BEGIN
    FOR r IN SELECT id, plan_snapshot FROM public.v3_diet_templates WHERE plan_snapshot::text LIKE '%"foods":%'
    LOOP
        modified := false;
        new_snapshot := '{}'::jsonb;
        
        FOR kcal_level, kcal_data IN SELECT * FROM jsonb_each(r.plan_snapshot)
        LOOP
            new_days := '[]'::jsonb;
            IF kcal_data ? 'days' THEN
                FOR day IN SELECT * FROM jsonb_array_elements(kcal_data->'days')
                LOOP
                    new_meals := '[]'::jsonb;
                    IF day ? 'meals' THEN
                        FOR meal IN SELECT * FROM jsonb_array_elements(day->'meals')
                        LOOP
                            IF meal ? 'foods' THEN
                                meal := (meal - 'foods') || jsonb_build_object('items', public.convert_foods_to_items(meal->'foods'));
                                modified := true;
                            END IF;
                            new_meals := new_meals || meal;
                        END LOOP;
                        day := jsonb_set(day, '{meals}', new_meals);
                    END IF;
                    new_days := new_days || day;
                END LOOP;
                kcal_data := jsonb_set(kcal_data, '{days}', new_days);
            END IF;
            new_snapshot := jsonb_set(COALESCE(new_snapshot, '{}'::jsonb), ARRAY[kcal_level], kcal_data);
        END LOOP;
        
        IF modified THEN
            UPDATE public.v3_diet_templates SET plan_snapshot = new_snapshot WHERE id = r.id;
        END IF;
    END LOOP;
END $$;

DROP FUNCTION public.convert_foods_to_items(jsonb);
