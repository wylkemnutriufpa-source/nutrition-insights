
INSERT INTO public.menu_items (label, label_key, route, icon, category, order_default, role_visibility, premium_only, is_active, icon_color, premium_priority_boost)
VALUES (
  'Templates Nutricionais',
  'menu.diet_templates',
  '/diet-templates',
  'BookOpen',
  'ADMIN',
  15,
  ARRAY['admin'],
  false,
  true,
  null,
  false
)
ON CONFLICT DO NOTHING;
