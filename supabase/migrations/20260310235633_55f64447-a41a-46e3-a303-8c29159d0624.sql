UPDATE site_settings 
SET setting_value = replace(setting_value::text, 'NutriFlow', 'FitJourney')::jsonb 
WHERE setting_key IN ('testimonials_landing', 'faqs');

UPDATE site_settings 
SET setting_value = to_jsonb('FitJourney — Plataforma de Nutrição com IA e Gamificação'::text) 
WHERE setting_key = 'meta_title';