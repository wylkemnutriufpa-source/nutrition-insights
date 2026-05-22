-- Ver o conteúdo de dietary_restrictions
SELECT 
  name,
  category,
  dietary_restrictions,
  dietary_restrictions IS NOT NULL as tem_restricoes,
  dietary_restrictions::text as restricoes_texto
FROM meal_plan_templates
WHERE created_at >= '2026-05-21'
ORDER BY name
LIMIT 20;
