
-- Table: saved_meal_templates (save individual meals for reuse)
CREATE TABLE public.saved_meal_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id TEXT,
  name TEXT NOT NULL,
  meal_type TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.saved_meal_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own meal templates"
  ON public.saved_meal_templates
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Table: saved_manual_plans (save full plan structures for reuse)
CREATE TABLE public.saved_manual_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id TEXT,
  title TEXT NOT NULL,
  days JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.saved_manual_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own plan templates"
  ON public.saved_manual_plans
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
