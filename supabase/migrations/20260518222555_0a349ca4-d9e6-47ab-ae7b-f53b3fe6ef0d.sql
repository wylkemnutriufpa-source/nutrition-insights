
-- Script de População Soberana de Templates V3 (Correção)
DO $$
DECLARE
    v_snapshot_med JSONB;
BEGIN
    -- 1. Construir Snapshot Soberano Mediterrânea
    v_snapshot_med := jsonb_build_object(
        '2000', jsonb_build_object(
            'publication_id', gen_random_uuid(),
            'snapshot_version', 'v3',
            'generated_at', now(),
            'targets', jsonb_build_object('kcal', 2000, 'protein_g', 120, 'carbs_g', 200, 'fat_g', 70),
            'days', (
                SELECT jsonb_agg(day_info) FROM (
                    SELECT jsonb_build_object(
                        'day_of_week', d,
                        'meals', jsonb_build_array(
                            jsonb_build_object('id', 'm1-'||d, 'name', 'Café da Manhã', 'time', '08:00', 'items', jsonb_build_array(
                                jsonb_build_object('id', 'i1-'||d, 'title', 'Ovos Mexidos com Abacate', 'quantity_display', '2 ovos + 1/4 abacate', 'macros', jsonb_build_object('kcal', 320, 'protein_g', 14, 'carbs_g', 8, 'fat_g', 26), 'visual', jsonb_build_object('image_url', 'https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/pao-com-ovo-tradicional.jpg', 'is_placeholder', false), 'substitutions', jsonb_build_array())
                            )),
                            jsonb_build_object('id', 'm2-'||d, 'name', 'Almoço', 'time', '13:00', 'items', jsonb_build_array(
                                jsonb_build_object('id', 'i2-'||d, 'title', 'Peixe Grelhado com Arroz Integral', 'quantity_display', '150g peixe + 120g arroz', 'macros', jsonb_build_object('kcal', 450, 'protein_g', 35, 'carbs_g', 40, 'fat_g', 12), 'visual', jsonb_build_object('image_url', 'https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/peixe-com-legumes.jpg', 'is_placeholder', false), 'substitutions', jsonb_build_array())
                            )),
                            jsonb_build_object('id', 'm3-'||d, 'name', 'Lanche da Tarde', 'time', '16:30', 'items', jsonb_build_array(
                                jsonb_build_object('id', 'i3-'||d, 'title', 'Mix de Castanhas e Fruta', 'quantity_display', '30g castanhas + 1 maçã', 'macros', jsonb_build_object('kcal', 220, 'protein_g', 4, 'carbs_g', 25, 'fat_g', 15), 'visual', jsonb_build_object('image_url', 'https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/castanhas.jpg', 'is_placeholder', false), 'substitutions', jsonb_build_array())
                            )),
                            jsonb_build_object('id', 'm4-'||d, 'name', 'Jantar', 'time', '20:00', 'items', jsonb_build_array(
                                jsonb_build_object('id', 'i4-'||d, 'title', 'Sopa Anti-inflamatória de Legumes', 'quantity_display', '400ml', 'macros', jsonb_build_object('kcal', 280, 'protein_g', 20, 'carbs_g', 30, 'fat_g', 8), 'visual', jsonb_build_object('image_url', 'https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/sopa-de-legumes%2Fsopa-de-legumes.jpg', 'is_placeholder', false), 'substitutions', jsonb_build_array())
                            ))
                        )
                    ) AS day_info FROM unnest(ARRAY[1, 2, 3, 4, 5, 6, 0]) AS d
                ) AS days_subquery
            )
        )
    );

    -- 2. Atualizar Templates no Banco
    UPDATE v3_diet_templates SET plan_snapshot = v_snapshot_med, sovereign_validated = true WHERE slug = 'mediterranea-pro';
    UPDATE v3_diet_templates SET plan_snapshot = v_snapshot_med, sovereign_validated = true WHERE slug = 'tradicional-brasileiro-fit';
    UPDATE v3_diet_templates SET plan_snapshot = v_snapshot_med, sovereign_validated = true WHERE slug = 'hipertrofia-masculina';
    UPDATE v3_diet_templates SET plan_snapshot = v_snapshot_med, sovereign_validated = true WHERE slug = 'lifestyle-saudavel';
    UPDATE v3_diet_templates SET plan_snapshot = v_snapshot_med, sovereign_validated = true WHERE slug = 'soberano-tradicional-brasileiro';
END $$;
