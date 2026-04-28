-- Adicionar coluna de correlação pai
ALTER TABLE public.audit_logs 
ADD COLUMN IF NOT EXISTS parent_correlation_id TEXT;

-- Índices de performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_correlation_id ON public.audit_logs(correlation_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_parent_correlation_id ON public.audit_logs(parent_correlation_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_created ON public.audit_logs(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_created ON public.audit_logs(user_id, created_at DESC);

-- Atualizar RPC log_audit para suportar parent_correlation_id
CREATE OR REPLACE FUNCTION public.log_audit(
  _action TEXT,
  _resource_type TEXT,
  _resource_id TEXT DEFAULT NULL,
  _metadata JSONB DEFAULT '{}',
  _correlation_id TEXT DEFAULT NULL,
  _status TEXT DEFAULT 'success',
  _parent_correlation_id TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id UUID;
  v_user_id UUID;
  v_tenant_id UUID;
BEGIN
  -- Tentar capturar usuário e tenant da sessão
  v_user_id := auth.uid();
  
  -- Buscar tenant_id do perfil se não estiver no metadata
  IF v_user_id IS NOT NULL THEN
    SELECT tenant_id INTO v_tenant_id FROM public.profiles WHERE id = v_user_id;
  END IF;

  INSERT INTO public.audit_logs (
    user_id,
    tenant_id,
    action,
    resource_type,
    resource_id,
    metadata,
    correlation_id,
    status,
    parent_correlation_id,
    ip_address
  )
  VALUES (
    v_user_id,
    COALESCE((_metadata->>'tenant_id')::uuid, v_tenant_id),
    _action,
    _resource_type,
    _resource_id,
    _metadata,
    _correlation_id,
    _status,
    COALESCE(_parent_correlation_id, _metadata->>'parent_correlation_id'),
    inet_client_addr()::text
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;
