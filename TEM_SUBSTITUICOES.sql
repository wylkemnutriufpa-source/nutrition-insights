-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- ⚡ QUERY ÚNICA: Tem substituições no banco?
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Cole no SQL Editor do Supabase e rode. Resposta numérica direta.

WITH templates_subs AS (
  SELECT 
    COUNT(*) AS total_alimentos,
    COUNT(*) FILTER (
      WHERE jsonb_array_length(COALESCE(food->'substitutions', '[]'::jsonb)) > 0
    ) AS com_subs
  FROM v3_diet_templates t,
    LATERAL jsonb_each(t.plan_snapshot) AS profile,
    LATERAL jsonb_array_elements(profile.value->'days') AS day,
    LATERAL jsonb_array_elements(day->'meals') AS meal,
    LATERAL jsonb_array_elements(
      COALESCE(meal->'foods', meal->'items', '[]'::jsonb)
    ) AS food
  WHERE t.active = true
),
planos_subs AS (
  SELECT 
    COUNT(*) AS total_planos_v3,
    COALESCE(SUM(
      (
        SELECT COUNT(*)
        FROM jsonb_array_elements(mp.snapshot->'days') AS d,
             jsonb_array_elements(d->'meals') AS m,
             jsonb_array_elements(
               COALESCE(m->'items', m->'foods', '[]'::jsonb)
             ) AS i,
             jsonb_array_elements(
               COALESCE(i->'substitutions', '[]'::jsonb)
             ) AS s
      )
    ), 0) AS total_subs_em_planos
  FROM meal_plans mp
  WHERE mp.snapshot IS NOT NULL
)
SELECT 
  '== TEMPLATES V3 ==' AS titulo,
  t.total_alimentos AS total_alimentos_template,
  t.com_subs AS alimentos_com_subs,
  ROUND(100.0 * t.com_subs / NULLIF(t.total_alimentos, 0), 1) AS pct_com_subs,
  '|' AS sep,
  '== PLANOS PUBLICADOS ==' AS titulo2,
  p.total_planos_v3,
  p.total_subs_em_planos,
  CASE
    WHEN t.com_subs = 0 AND p.total_subs_em_planos = 0 
      THEN 'TEMPLATES NASCEM SEM SUBS - precisa popular'
    WHEN t.com_subs > 0 AND p.total_subs_em_planos = 0 
      THEN 'TEMPLATES TEM SUBS MAS PLANOS DOS PACIENTES NAO - RPC perdeu'
    WHEN t.com_subs > 0 AND p.total_subs_em_planos > 0 
      THEN 'BANCO TEM SUBS - problema no frontend'
    ELSE 'INVESTIGAR'
  END AS diagnostico
FROM templates_subs t, planos_subs p;
