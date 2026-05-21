-- Redefine templates_enriched view to use the sovereign table v3_diet_templates
DROP VIEW IF EXISTS public.templates_enriched;

CREATE OR REPLACE VIEW public.templates_enriched AS
WITH exploded_templates AS (
    -- Expand one row per kcal_profile
    SELECT 
        (t.id::text || '-' || profile.value::text) AS id,
        t.id as original_id,
        t.title AS name,
        t.objective AS category,
        t.description,
        t.plan_snapshot -> profile.value::text -> 'days' AS days_snapshot,
        profile.value::text::integer AS kcal_target,
        true as is_premium,
        t.created_at,
        t.template_type = 'marmita' OR t.slug LIKE '%marmita%' AS template_marmita,
        t.family
    FROM v3_diet_templates t,
    LATERAL jsonb_array_elements(t.kcal_profiles) AS profile(value)
    WHERE t.active = true AND t.sovereign_validated = true
),
processed_templates AS (
    SELECT 
        id,
        name,
        category,
        description,
        -- Use Day 1 as the reference for meals list
        (days_snapshot -> 0 -> 'meals') AS meals,
        NULL::jsonb as dietary_restrictions,
        template_marmita,
        is_premium,
        created_at,
        kcal_target,
        jsonb_array_length(days_snapshot) AS total_days,
        (
            SELECT count(*)::integer
            FROM jsonb_array_elements(days_snapshot -> 0 -> 'meals')
        ) AS total_meals,
        (
            SELECT bool_and(
                EXISTS (
                    SELECT 1 
                    FROM jsonb_array_elements(meal.value -> 'items') item
                    WHERE (item ->> 'imageUrl') IS NOT NULL AND (item ->> 'imageUrl') <> ''
                )
            )
            FROM jsonb_array_elements(days_snapshot -> 0 -> 'meals') AS meal(value)
        ) AS all_meals_have_images
    FROM exploded_templates
)
SELECT 
    id,
    name,
    category,
    description,
    meals,
    dietary_restrictions,
    template_marmita,
    is_premium,
    created_at,
    kcal_target,
    total_days,
    total_meals,
    all_meals_have_images,
    CASE category
        WHEN 'saude' THEN 'Saúde'
        WHEN 'emagrecimento' THEN 'Emagrecimento'
        WHEN 'hipertrofia' THEN 'Hipertrofia'
        WHEN 'clinico' THEN 'Clínico'
        WHEN 'low_carb' THEN 'Low Carb'
        ELSE category
    END AS category_label
FROM processed_templates;

GRANT SELECT ON public.templates_enriched TO anon, authenticated;
