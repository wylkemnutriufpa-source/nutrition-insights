-- Remove a expiração de convites GERAIS (sem paciente específico) que ainda não foram usados.
-- Esses convites devem permanecer válidos até serem efetivamente utilizados (cadastro finalizado).
UPDATE public.invitations
SET expires_at = NULL
WHERE patient_name IS NULL
  AND patient_email IS NULL
  AND used_at IS NULL
  AND status IN ('pending', 'viewed');