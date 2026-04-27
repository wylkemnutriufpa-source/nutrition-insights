-- A lógica de redirecionamento agora é tratada principalmente no frontend para evitar delays de Edge Functions frias,
-- mas garantimos que a estrutura de dados suporte a validação rápida.

-- Log de auditoria para falhas de convite para facilitar diagnóstico
CREATE TABLE IF NOT EXISTS public.invitation_diagnostics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT,
  error_type TEXT, -- 'mismatch', 'expired', 'not_found', 'null_professional'
  user_agent TEXT,
  ip_address TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.invitation_diagnostics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Only admins can view diagnostics" ON public.invitation_diagnostics FOR SELECT USING (auth.jwt()->>'role' = 'admin');
CREATE POLICY "System can insert diagnostics" ON public.invitation_diagnostics FOR INSERT WITH CHECK (true);
