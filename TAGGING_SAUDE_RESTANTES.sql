-- Ver os 2 templates saude sem tags
SELECT slug, title, clinical_tags
FROM v3_diet_templates
WHERE active = true
  AND objective = 'saude'
  AND (clinical_tags = '[]'::jsonb OR clinical_tags IS NULL);

-- Dar tags genéricas para qualquer template saude ainda sem tag
UPDATE v3_diet_templates SET
  clinical_tags = '["saude_geral","regional","pratico"]',
  kcal_range_min = 1300,
  kcal_range_max = 2800
WHERE active = true
  AND objective = 'saude'
  AND (clinical_tags = '[]'::jsonb OR clinical_tags IS NULL);

-- Verificação final: DEVE retornar 0 sem tags em todos os objetivos
SELECT
  objective,
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE clinical_tags != '[]'::jsonb AND clinical_tags IS NOT NULL) AS com_tags,
  COUNT(*) FILTER (WHERE clinical_tags = '[]'::jsonb OR clinical_tags IS NULL) AS sem_tags
FROM v3_diet_templates
WHERE active = true
GROUP BY objective
ORDER BY objective;
