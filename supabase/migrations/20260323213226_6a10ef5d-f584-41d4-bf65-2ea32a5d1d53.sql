-- Add Control Tower menu item for professionals (premium feature)
INSERT INTO public.menu_items (label, label_key, route, icon, icon_color, category, is_active, premium_only, premium_priority_boost, role_visibility, order_default)
VALUES 
  ('Control Tower', 'control_tower', '/control-tower', 'Brain', '#10b981', 'CLÍNICO', true, true, true, ARRAY['admin', 'nutritionist', 'personal'], 0)
ON CONFLICT DO NOTHING;
