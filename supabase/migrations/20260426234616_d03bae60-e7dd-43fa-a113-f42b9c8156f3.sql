-- Adiciona colunas para melhor rastreamento nos logs
ALTER TABLE public.invitation_logs 
ADD COLUMN IF NOT EXISTS professional_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS patient_email TEXT;

-- Índice para busca rápida de logs por profissional/paciente
CREATE INDEX IF NOT EXISTS idx_invitation_logs_pro_email ON public.invitation_logs(professional_id, patient_email);

-- Índice de performance na tabela de convites
CREATE INDEX IF NOT EXISTS idx_invitations_pro_email_status ON public.invitations(professional_id, patient_email, status);
