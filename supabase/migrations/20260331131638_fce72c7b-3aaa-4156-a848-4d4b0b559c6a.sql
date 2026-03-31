-- 1. Fix initialize_default_workspace to respect role_visibility
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
  _user_role TEXT;
BEGIN
  -- Check if already exists
  SELECT id INTO _workspace_id FROM workspace_profiles WHERE user_id = _user_id;
  IF _workspace_id IS NOT NULL THEN
    RETURN _workspace_id;
  END IF;

  -- Determine user's primary role
  SELECT role INTO _user_role FROM user_roles WHERE user_id = _user_id LIMIT 1;
  IF _user_role IS NULL THEN
    _user_role := 'nutritionist'; -- safe default for professionals
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

  -- Map menu_items to sections based on category, FILTERED BY ROLE
  FOR _menu_row IN 
    SELECT id, category, order_default 
    FROM menu_items 
    WHERE is_active = true
      AND role_visibility @> ARRAY[_user_role]::text[]
  LOOP
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

-- 2. Deactivate WhatsApp menu item
UPDATE menu_items SET is_active = false WHERE route = '/settings/whatsapp';

-- 3. Remove WhatsApp workspace items for ALL users (cleanup)
DELETE FROM workspace_items 
WHERE menu_item_id IN (SELECT id FROM menu_items WHERE route = '/settings/whatsapp');

-- 4. Remove admin items from Thaiane's workspace (cleanup existing bad data)
DELETE FROM workspace_items 
WHERE workspace_id IN (
  SELECT wp.id FROM workspace_profiles wp 
  JOIN user_roles ur ON ur.user_id = wp.user_id 
  WHERE ur.role != 'admin'
)
AND menu_item_id IN (
  SELECT id FROM menu_items WHERE role_visibility = ARRAY['admin']::text[]
);