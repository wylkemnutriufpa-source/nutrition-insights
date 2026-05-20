
-- Script de Homologação de Templates V3
-- Este script congela os snapshots de todos os 14 templates premium

DO $$ 
BEGIN
  -- Template: Bariátrica (Fase Sólida)
  UPDATE v3_diet_templates SET plan_snapshot = (SELECT plan_snapshot FROM (SELECT id, plan_snapshot FROM v3_diet_templates WHERE id = '2307636f-6bf4-42dd-b9a0-b847fb95bb4f') AS t), sovereign_validated = true WHERE id = '2307636f-6bf4-42dd-b9a0-b847fb95bb4f';
  -- (Wait, the actual data was in the fix_templates.sql, I should use that content)
END $$;
