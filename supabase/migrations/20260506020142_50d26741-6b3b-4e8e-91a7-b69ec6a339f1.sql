-- Vincula os itens de menu às features definidas no featureMap para garantir visibilidade
UPDATE public.menu_items SET feature = 'diet' WHERE route IN ('/meals', '/shopping-list', '/checkin', '/weekly-goals') AND role_visibility @> '{"patient"}';
UPDATE public.menu_items SET feature = 'recipes' WHERE route = '/recipes' AND role_visibility @> '{"patient"}';
UPDATE public.menu_items SET feature = 'checklist' WHERE route = '/checklist' AND role_visibility @> '{"patient"}';
