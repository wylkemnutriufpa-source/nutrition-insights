-- Tabela para templates customizáveis de WhatsApp
CREATE TABLE public.whatsapp_templates (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    professional_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    template_key TEXT NOT NULL, -- 'patient_invite', 'patient_onboarding', etc.
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(professional_id, template_key)
);

-- Habilitar RLS
ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;

-- Políticas
CREATE POLICY "Users can manage their own templates" 
ON public.whatsapp_templates 
FOR ALL 
USING (auth.uid() = professional_id);

-- Tabela para histórico de convites enviados
CREATE TABLE public.whatsapp_invitation_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    professional_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    patient_name TEXT,
    patient_phone TEXT,
    invitation_type TEXT, -- 'invite', 'onboarding', 'quick_link'
    sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    metadata JSONB DEFAULT '{}'::jsonb
);

ALTER TABLE public.whatsapp_invitation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own invitation logs" 
ON public.whatsapp_invitation_logs 
FOR SELECT 
USING (auth.uid() = professional_id);

CREATE POLICY "Users can insert their own logs" 
ON public.whatsapp_invitation_logs 
FOR INSERT 
WITH CHECK (auth.uid() = professional_id);

-- Trigger para updated_at
CREATE TRIGGER update_whatsapp_templates_updated_at
BEFORE UPDATE ON public.whatsapp_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();