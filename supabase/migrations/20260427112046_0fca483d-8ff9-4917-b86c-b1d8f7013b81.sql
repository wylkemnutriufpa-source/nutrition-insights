-- Tabela para auditoria profunda de convites
CREATE TABLE IF NOT EXISTS public.invitation_audits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL,
    professional_id UUID REFERENCES auth.users(id),
    status_code INTEGER,
    error_type TEXT,
    stage TEXT NOT NULL, -- 'validation', 'redirection', 'registration'
    user_agent TEXT,
    ip_address TEXT,
    correlation_id UUID,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.invitation_audits ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso para Admin
CREATE POLICY "Admins can view invitation audits" 
ON public.invitation_audits 
FOR SELECT 
USING (EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
));

-- Trigger para logar erros de convite automaticamente pode ser adicionado via Edge Function, 
-- mas aqui criamos o suporte de dados.

-- Adicionar índices para performance na auditoria
CREATE INDEX IF NOT EXISTS idx_invitation_audits_code ON public.invitation_audits(code);
CREATE INDEX IF NOT EXISTS idx_invitation_audits_created_at ON public.invitation_audits(created_at);
