
-- Restauração de visibilidade para planos publicados
UPDATE public.meal_plans
SET is_active = true
WHERE plan_status = 'published_to_patient'
AND is_active = false;

-- Normalização de modo para evitar filtros nulos no frontend
UPDATE public.meal_plans
SET plan_mode = 'weekly'
WHERE plan_mode IS NULL;

-- Criar tabela de auditoria para monitorar desaparecimento de planos
CREATE TABLE IF NOT EXISTS public.audit_plan_fetch_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID,
    nutritionist_id UUID,
    plans_found INTEGER,
    status_filter TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS na tabela de auditoria
ALTER TABLE public.audit_plan_fetch_logs ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança
CREATE POLICY "Nutritionists can insert their own audit logs" 
ON public.audit_plan_fetch_logs 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Nutritionists can view their own audit logs" 
ON public.audit_plan_fetch_logs 
FOR SELECT 
USING (auth.uid() = nutritionist_id);

-- Otimização de performance para filtros de visibilidade
CREATE INDEX IF NOT EXISTS idx_meal_plans_visibility 
ON public.meal_plans (patient_id, is_active, plan_status);
