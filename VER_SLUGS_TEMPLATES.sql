-- Ver slugs e títulos reais para corrigir o tagging
SELECT 
  objective,
  slug,
  title,
  family,
  clinical_tags,
  dietary_restrictions,
  kcal_range_min,
  kcal_range_max
FROM v3_diet_templates
WHERE active = true
ORDER BY objective, slug
LIMIT 70;
