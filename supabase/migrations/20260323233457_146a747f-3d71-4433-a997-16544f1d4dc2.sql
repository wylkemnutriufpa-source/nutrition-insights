
-- Backfill: create notification for Gleice's existing plan request
INSERT INTO public.notifications (user_id, title, message, type, action_url)
VALUES (
  '67f47696-a778-4ada-9ff9-9615fb7a7c48',
  '📋 Solicitação de plano',
  'Gleice cardoso solicitou ativação ou ajuste de plano alimentar.',
  'message',
  '/patients/64556a38-04ee-4314-a46e-7f2a5d43d81f'
);
