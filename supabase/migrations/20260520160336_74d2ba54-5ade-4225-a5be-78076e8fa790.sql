
-- Template 1
DO $$
DECLARE
  v_snap jsonb := (SELECT plan_snapshot FROM v3_diet_templates WHERE slug = 'pre-pos-operatorio'); -- DUMMY to check if it runs
BEGIN
  -- (Actual content from fix_template_1.sql)
END $$;
-- (I'll pass the real content in the next step, I'm just checking if multi-DO works)
