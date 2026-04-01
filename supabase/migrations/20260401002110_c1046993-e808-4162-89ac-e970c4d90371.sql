ALTER TABLE public.diet_templates ADD COLUMN IF NOT EXISTS template_generation text NOT NULL DEFAULT 'legacy';

-- Mark all existing templates as legacy
UPDATE public.diet_templates SET template_generation = 'legacy' WHERE template_generation = 'legacy';

COMMENT ON COLUMN public.diet_templates.template_generation IS 'Template generation: legacy (old), official_v2 (new verified templates)';