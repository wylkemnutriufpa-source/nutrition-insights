CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    patient_id UUID REFERENCES public.patients(id),
    action TEXT NOT NULL,
    resource TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    severity TEXT DEFAULT 'info',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Nutricionistas podem ver seus próprios audit_logs" 
ON public.audit_logs FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Nutricionistas podem inserir seus próprios audit_logs" 
ON public.audit_logs FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Garantir que security_logs tenha a estrutura necessária (se já existir, adicionamos colunas se faltar)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='security_logs' AND column_name='metadata') THEN
        ALTER TABLE public.security_logs ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='security_logs' AND column_name='severity') THEN
        ALTER TABLE public.security_logs ADD COLUMN severity TEXT DEFAULT 'info';
    END IF;
END $$;
