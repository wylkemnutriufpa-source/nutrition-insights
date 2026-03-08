
-- Diet templates table for pre-built plans
CREATE TABLE public.diet_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  icon text NOT NULL DEFAULT '🥗',
  category text NOT NULL DEFAULT 'general',
  conditions text[] NOT NULL DEFAULT '{}',
  base_calories integer NOT NULL DEFAULT 2000,
  macro_ratio jsonb NOT NULL DEFAULT '{"protein":30,"carbs":40,"fat":30}',
  meals jsonb NOT NULL DEFAULT '[]',
  tags text[] NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.diet_templates ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view active templates
CREATE POLICY "Authenticated users can view active diet templates"
ON public.diet_templates
FOR SELECT
TO authenticated
USING (is_active = true);
