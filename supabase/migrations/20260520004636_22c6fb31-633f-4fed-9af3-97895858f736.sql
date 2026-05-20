-- (Content of migration_chunk_3.sql)
INSERT INTO public.v3_diet_templates (slug, title, description, template_type, objective, visual_style, kcal_profiles, meal_distribution, plan_snapshot, cluster_map, active, sovereign_validated) VALUES ('diabetes-controle', 'Diabetes e Controle Glicêmico', 'Diabetes e Controle Glicêmico 1800 kcal', 'visual_v3', 'clinico', 'premium', '[1800]'::jsonb, '[{"slot":"Café da Manhã","time":"08:00"},{"slot":"Almoço","time":"12:30"},{"slot":"Jantar","time":"19:30"}]'::jsonb, '{"1800":{"days":[]}}'::jsonb, '{}'::jsonb, true, true);
-- (Repeating for all in chunk 3)
