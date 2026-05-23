-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- DIAGNÓSTICO: campos de quantidade no snapshot do paciente
-- Execute no Supabase SQL Editor
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Ver os campos de um item real do plano mais recente
SELECT
  mp.id,
  mp.title,
  mp.plan_status,
  mp.editor_version,
  -- Pegar o primeiro item do primeiro dia do snapshot
  (mp.snapshot->'days'->0->'meals'->0->'items'->0) AS primeiro_item,
  -- Verificar quais campos de quantidade existem
  (mp.snapshot->'days'->0->'meals'->0->'items'->0->>'quantity_display') AS quantity_display,
  (mp.snapshot->'days'->0->'meals'->0->'items'->0->>'qty') AS qty,
  (mp.snapshot->'days'->0->'meals'->0->'items'->0->>'clinical_mass_g') AS clinical_mass_g,
  (mp.snapshot->'days'->0->'meals'->0->'items'->0->>'title') AS item_title,
  -- NOVO: ver se tem campo visual
  (mp.snapshot->'days'->0->'meals'->0->'items'->0->'visual'->>'image_url') AS visual_image_url,
  (mp.snapshot->'days'->0->'meals'->0->'items'->0->>'imageUrl') AS imageUrl
FROM meal_plans mp
WHERE mp.snapshot IS NOT NULL
ORDER BY mp.created_at DESC
LIMIT 5;
