-- Encontrar os slugs corretos dos templates criados hoje
SELECT 
  slug,
  title,
  family,
  active,
  created_at
FROM v3_diet_templates
WHERE created_at >= '2026-05-21'
ORDER BY family, title
LIMIT 20;

-- Ver TODOS os slugs que contém "emagrecimento"
SELECT 
  slug,
  title,
  family
FROM v3_diet_templates
WHERE slug LIKE '%emagrecimento%'
ORDER BY title;

-- Ver TODOS os slugs que contém "1500"
SELECT 
  slug,
  title,
  family
FROM v3_diet_templates
WHERE slug LIKE '%1500%'
ORDER BY title;
