
-- Workspace configuration tables for professional cockpit builder

-- Workspace profiles (one per professional)
CREATE TABLE public.workspace_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  workspace_name TEXT NOT NULL DEFAULT 'Meu Workspace',
  is_default BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.workspace_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own workspace" ON public.workspace_profiles
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Workspace sections (custom groups in sidebar)
CREATE TABLE public.workspace_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspace_profiles(id) ON DELETE CASCADE,
  section_name TEXT NOT NULL,
  section_icon TEXT NOT NULL DEFAULT 'LayoutDashboard',
  section_color TEXT NOT NULL DEFAULT 'text-sky-400',
  sort_order INT NOT NULL DEFAULT 0,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  is_collapsed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.workspace_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own sections" ON public.workspace_sections
  FOR ALL TO authenticated
  USING (workspace_id IN (SELECT id FROM public.workspace_profiles WHERE user_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT id FROM public.workspace_profiles WHERE user_id = auth.uid()));

-- Workspace items (tools placed in sections)
CREATE TABLE public.workspace_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspace_profiles(id) ON DELETE CASCADE,
  section_id UUID NOT NULL REFERENCES public.workspace_sections(id) ON DELETE CASCADE,
  menu_item_id UUID NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  custom_label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.workspace_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own items" ON public.workspace_items
  FOR ALL TO authenticated
  USING (workspace_id IN (SELECT id FROM public.workspace_profiles WHERE user_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT id FROM public.workspace_profiles WHERE user_id = auth.uid()));

-- Function to initialize default workspace for a professional
CREATE OR REPLACE FUNCTION public.initialize_default_workspace(_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _workspace_id UUID;
  _section_ids UUID[];
  _sec_id UUID;
  _menu_row RECORD;
BEGIN
  -- Check if already exists
  SELECT id INTO _workspace_id FROM workspace_profiles WHERE user_id = _user_id;
  IF _workspace_id IS NOT NULL THEN
    RETURN _workspace_id;
  END IF;

  -- Create workspace
  INSERT INTO workspace_profiles (user_id, workspace_name, is_default)
  VALUES (_user_id, 'Meu Workspace', true)
  RETURNING id INTO _workspace_id;

  -- Create default sections
  INSERT INTO workspace_sections (workspace_id, section_name, section_icon, section_color, sort_order)
  VALUES
    (_workspace_id, 'Clínico', 'Heart', 'text-sky-400', 0),
    (_workspace_id, 'Acompanhamento', 'TrendingUp', 'text-emerald-400', 1),
    (_workspace_id, 'Conteúdo', 'BookOpen', 'text-violet-400', 2),
    (_workspace_id, 'Gestão', 'BarChart3', 'text-rose-400', 3),
    (_workspace_id, 'Inteligência', 'Brain', 'text-amber-400', 4);

  -- Map menu_items to sections based on category
  FOR _menu_row IN 
    SELECT id, category, order_default FROM menu_items WHERE is_active = true
  LOOP
    -- Determine section
    SELECT ws.id INTO _sec_id
    FROM workspace_sections ws
    WHERE ws.workspace_id = _workspace_id
      AND ws.section_name = CASE
        WHEN _menu_row.category IN ('PRINCIPAL','CLÍNICO','NUTRIÇÃO','PERSONAL') THEN 'Clínico'
        WHEN _menu_row.category IN ('ANALYTICS','PERFORMANCE') THEN 'Acompanhamento'
        WHEN _menu_row.category IN ('FERRAMENTAS','CONTEÚDO') THEN 'Conteúdo'
        WHEN _menu_row.category IN ('MARKETING','ADMIN') THEN 'Gestão'
        ELSE 'Conteúdo'
      END
    LIMIT 1;

    IF _sec_id IS NOT NULL THEN
      INSERT INTO workspace_items (workspace_id, section_id, menu_item_id, sort_order)
      VALUES (_workspace_id, _sec_id, _menu_row.id, _menu_row.order_default);
    END IF;
  END LOOP;

  RETURN _workspace_id;
END;
$$;

-- Index for fast lookups
CREATE INDEX idx_workspace_sections_workspace ON workspace_sections(workspace_id);
CREATE INDEX idx_workspace_items_section ON workspace_items(section_id);
CREATE INDEX idx_workspace_items_workspace ON workspace_items(workspace_id);
