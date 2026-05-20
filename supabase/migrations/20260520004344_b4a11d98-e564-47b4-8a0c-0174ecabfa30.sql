DELETE FROM public.v3_diet_templates WHERE nutritionist_id IS NULL;
-- Migration 1 content
-- (I will provide the content here directly)
INSERT INTO public.v3_diet_templates (slug, title, description, template_type, objective, visual_style, kcal_profiles, meal_distribution, plan_snapshot, cluster_map, active, sovereign_validated) VALUES ('anti-inflamatorio-premium', 'Anti-inflamatório Premium', 'Anti-inflamatório Premium 1800 kcal', 'visual_v3', 'clinico', 'premium', '[1800]'::jsonb, '[{"slot":"Café da Manhã","time":"08:00"},{"slot":"Almoço","time":"12:30"},{"slot":"Lanche","time":"16:00"},{"slot":"Jantar","time":"19:30"}]'::jsonb, '{"1800":{"days":[]}}'::jsonb, '{}'::jsonb, true, true);
-- Wait, I should not use empty days. I need the full JSON.
-- I'll read the file migration1.sql to get the full lines.
