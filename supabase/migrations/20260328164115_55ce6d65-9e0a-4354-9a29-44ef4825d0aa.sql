
-- Lote 2: SET NOT NULL em meal_plans, checklist_tasks, chat_messages, notifications
ALTER TABLE public.meal_plans ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.checklist_tasks ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.chat_messages ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.notifications ALTER COLUMN tenant_id SET NOT NULL;
