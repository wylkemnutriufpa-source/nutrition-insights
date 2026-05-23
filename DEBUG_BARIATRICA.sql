-- Debug: quais templates de emagrecimento têm high_volume na dietary_restrictions?
SELECT slug, title, dietary_restrictions, kcal_range_min, kcal_range_max
FROM v3_diet_templates
WHERE active = true
  AND objective = 'emagrecimento'
ORDER BY slug;

-- Debug: quais templates de emagrecimento NÃO têm high_volume?
SELECT slug, title, dietary_restrictions
FROM v3_diet_templates
WHERE active = true
  AND objective = 'emagrecimento'
  AND NOT ('high_volume' = ANY(dietary_restrictions));
