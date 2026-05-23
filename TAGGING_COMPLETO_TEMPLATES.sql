-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- TAGGING COMPLETO DOS TEMPLATES — por slug exato
-- Execute no Supabase SQL Editor
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- ════════════ CLÍNICO ════════════

UPDATE v3_diet_templates SET
  clinical_tags = '["clinico","anti_inflamatorio","saude_geral"]',
  kcal_range_min = 1400, kcal_range_max = 2500
WHERE slug = 'anti-inflamatorio-premium';

UPDATE v3_diet_templates SET
  clinical_tags = '["clinico","bariatrica","emagrecimento"]',
  kcal_range_min = 800, kcal_range_max = 1400,
  contraindications = ARRAY['gravidez']
WHERE slug = 'bariatrica-solida';

UPDATE v3_diet_templates SET
  clinical_tags = '["clinico","anemia","saude_geral"]',
  kcal_range_min = 1400, kcal_range_max = 2500
WHERE slug = 'clinico-anemia';

UPDATE v3_diet_templates SET
  clinical_tags = '["clinico","colesterol","anti_inflamatorio","cardiovascular"]',
  kcal_range_min = 1400, kcal_range_max = 2500
WHERE slug = 'clinico-colesterol';

UPDATE v3_diet_templates SET
  clinical_tags = '["clinico","gastrite","saude_intestinal"]',
  kcal_range_min = 1400, kcal_range_max = 2200
WHERE slug = 'clinico-gastrite';

UPDATE v3_diet_templates SET
  clinical_tags = '["clinico","hipertensao","cardiovascular","anti_inflamatorio"]',
  kcal_range_min = 1400, kcal_range_max = 2400,
  contraindications = ARRAY['doenca_renal_grave']
WHERE slug = 'clinico-hipertensao';

UPDATE v3_diet_templates SET
  clinical_tags = '["clinico","oncologico","imunoestimulante"]',
  kcal_range_min = 1600, kcal_range_max = 3000
WHERE slug = 'clinico-oncologico';

UPDATE v3_diet_templates SET
  clinical_tags = '["clinico","pos_cirurgico","recuperacao"]',
  kcal_range_min = 1400, kcal_range_max = 2500
WHERE slug = 'clinico-pos-cirurgico';

UPDATE v3_diet_templates SET
  clinical_tags = '["clinico","renal","baixa_proteina"]',
  kcal_range_min = 1400, kcal_range_max = 2200,
  contraindications = ARRAY['hipertrofia']
WHERE slug = 'clinico-renal';

UPDATE v3_diet_templates SET
  clinical_tags = '["clinico","tireoide","hipotireoidismo","saude_geral"]',
  kcal_range_min = 1400, kcal_range_max = 2400
WHERE slug = 'clinico-tireoide';

UPDATE v3_diet_templates SET
  clinical_tags = '["clinico","colesterol","cardiovascular","anti_inflamatorio"]',
  kcal_range_min = 1400, kcal_range_max = 2400
WHERE slug = 'colesterol-alto';

UPDATE v3_diet_templates SET
  clinical_tags = '["clinico","saude_intestinal","fodmap"]',
  kcal_range_min = 1400, kcal_range_max = 2400
WHERE slug = 'fodmaps-saude-intestinal';

UPDATE v3_diet_templates SET
  clinical_tags = '["clinico","pre_cirurgico","pos_cirurgico","recuperacao"]',
  kcal_range_min = 1400, kcal_range_max = 2500
WHERE slug = 'pre-pos-operatorio';

-- ════════════ LOW CARB ════════════

UPDATE v3_diet_templates SET
  clinical_tags = '["emagrecimento","low_carb","deficit_calorico"]',
  kcal_range_min = 1100, kcal_range_max = 1900
WHERE slug = 'emagrecimento-low-carb';

UPDATE v3_diet_templates SET
  clinical_tags = '["low_carb","emagrecimento","economico"]',
  kcal_range_min = 1200, kcal_range_max = 2200
WHERE slug = 'low-carb-acessivel';

UPDATE v3_diet_templates SET
  clinical_tags = '["low_carb","emagrecimento","alta_proteina"]',
  kcal_range_min = 1200, kcal_range_max = 2400
WHERE slug = 'low-carb-intensivo';

UPDATE v3_diet_templates SET
  clinical_tags = '["low_carb","emagrecimento","moderado"]',
  kcal_range_min = 1300, kcal_range_max = 2300
WHERE slug = 'low-carb-moderado';

UPDATE v3_diet_templates SET
  clinical_tags = '["low_carb","emagrecimento"]',
  kcal_range_min = 1200, kcal_range_max = 2200
WHERE slug = 'low-carb-peixe';

UPDATE v3_diet_templates SET
  clinical_tags = '["low_carb","alta_proteina","emagrecimento"]',
  kcal_range_min = 1200, kcal_range_max = 2400
WHERE slug = 'low-carb-proteina';

-- ════════════ SAÚDE — ainda sem tags ════════════

UPDATE v3_diet_templates SET
  clinical_tags = '["saude_geral","colesterol","cardiovascular"]',
  kcal_range_min = 1400, kcal_range_max = 2400
WHERE slug LIKE '%colesterol%' AND objective = 'saude';

UPDATE v3_diet_templates SET
  clinical_tags = '["saude_geral","detox","anti_inflamatorio"]',
  kcal_range_min = 1400, kcal_range_max = 2400
WHERE slug = 'detox-vitalidade';

UPDATE v3_diet_templates SET
  clinical_tags = '["clinico","gestante","lactante"]',
  kcal_range_min = 1800, kcal_range_max = 2800,
  sex_preference = 'female'
WHERE slug = 'gestantes-saudavel';

UPDATE v3_diet_templates SET
  clinical_tags = '["saude_geral","regional","nordeste"]',
  kcal_range_min = 1300, kcal_range_max = 2500
WHERE slug IN ('nordeste-cuscuz','nordeste-macaxeira','nordeste-tapioca','nordeste-tradicional');

UPDATE v3_diet_templates SET
  clinical_tags = '["saude_geral","regional","sul"]',
  kcal_range_min = 1400, kcal_range_max = 2800
WHERE slug IN ('sul-churrasco','sul-polenta');

UPDATE v3_diet_templates SET
  clinical_tags = '["saude_geral","economico","pratico"]',
  kcal_range_min = 1300, kcal_range_max = 2600
WHERE slug = 'pratico-rapido-barato';

-- ════════════ VERIFICAÇÃO FINAL ════════════
SELECT
  objective,
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE clinical_tags != '[]'::jsonb AND clinical_tags IS NOT NULL) AS com_tags,
  COUNT(*) FILTER (WHERE clinical_tags = '[]'::jsonb OR clinical_tags IS NULL) AS sem_tags
FROM v3_diet_templates
WHERE active = true
GROUP BY objective
ORDER BY objective;
