INSERT INTO public.menu_items (id, label, label_key, route, icon, category, order_default, role_visibility, is_active)
VALUES (
  gen_random_uuid(),
  'Editor V3 Elite',
  'Editor V3 Elite',
  '/v3',
  'Zap',
  'NUTRIÇÃO',
  5,
  ARRAY['admin', 'nutritionist'],
  true
);