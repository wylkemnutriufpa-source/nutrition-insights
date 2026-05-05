UPDATE public.menu_items SET feature = 'reports' WHERE label IN ('Relatórios', 'Relatório Semanal');
UPDATE public.menu_items SET feature = 'analytics' WHERE label IN ('Analytics Clínico', 'Inteligência Clínica', 'Inteligência Terapêutica', 'Analytics');
UPDATE public.menu_items SET feature = 'protocols' WHERE label IN ('Protocolos', 'Templates de Dieta', 'Suplementos');
UPDATE public.menu_items SET feature = 'programs' WHERE label IN ('Programas', 'Jornada');
UPDATE public.menu_items SET feature = 'automation' WHERE label IN ('Automação', 'Automação Clínica');
UPDATE public.menu_items SET feature = 'financial' WHERE label IN ('Financeiro');
UPDATE public.menu_items SET feature = 'branding' WHERE label IN ('Branding', 'Meu Perfil Público');
UPDATE public.menu_items SET feature = 'integrations' WHERE label IN ('Integrações', 'WhatsApp Settings');

UPDATE public.menu_items SET premium_only = true WHERE label IN ('Analytics Clínico', 'Relatórios', 'Automação', 'Inteligência Clínica', 'Control Tower', 'Cockpit Premium');