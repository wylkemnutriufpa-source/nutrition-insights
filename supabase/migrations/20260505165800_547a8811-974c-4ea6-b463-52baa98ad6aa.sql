-- Migration 1: profiles column
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'profiles' AND COLUMN_NAME = 'onboarding_completed') THEN
        ALTER TABLE public.profiles ADD COLUMN onboarding_completed BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Migration 2: onboarding data fix
UPDATE public.profiles
SET onboarding_completed = true,
    patient_state = 'active_plan'
WHERE patient_state IN ('active_plan', 'plan_generated', 'ready_for_plan', 'collecting_profile')
   OR id IN (
     SELECT patient_id FROM public.meal_plans WHERE is_active = true AND plan_status = 'published_to_patient'
   );

UPDATE public.profiles
SET patient_state = 'anamnesis'
WHERE patient_state = 'onboarding_slides'
  AND user_id IN (SELECT user_id FROM public.patient_anamnesis WHERE status = 'completed');

-- Migration 3: menu_items and protocols columns
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'menu_items' AND column_name = 'feature') THEN
        ALTER TABLE public.menu_items ADD COLUMN feature TEXT;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'nutrition_protocols' AND column_name = 'created_by') THEN
        ALTER TABLE public.nutrition_protocols ADD COLUMN created_by UUID REFERENCES auth.users(id);
    END IF;
END $$;

-- Migration 4: menu_items feature mapping
UPDATE public.menu_items SET feature = 'reports' WHERE label IN ('Relatórios', 'Relatório Semanal');
UPDATE public.menu_items SET feature = 'analytics' WHERE label IN ('Analytics Clínico', 'Inteligência Clínica', 'Inteligência Terapêutica', 'Analytics');
UPDATE public.menu_items SET feature = 'protocols' WHERE label IN ('Protocolos', 'Templates de Dieta', 'Suplementos');
UPDATE public.menu_items SET feature = 'programs' WHERE label IN ('Programas', 'Jornada');
UPDATE public.menu_items SET feature = 'automation' WHERE label IN ('Automação', 'Automação Clínica');
UPDATE public.menu_items SET feature = 'financial' WHERE label IN ('Financeiro');
UPDATE public.menu_items SET feature = 'branding' WHERE label IN ('Branding', 'Meu Perfil Público');
UPDATE public.menu_items SET feature = 'integrations' WHERE label IN ('Integrações', 'WhatsApp Settings');

UPDATE public.menu_items SET premium_only = true WHERE label IN ('Analytics Clínico', 'Relatórios', 'Automação', 'Inteligência Clínica', 'Control Tower', 'Cockpit Premium');