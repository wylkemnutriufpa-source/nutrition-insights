-- Habilitar inserção para usuários autenticados na tabela de auditoria de triggers
-- Isso é necessário porque triggers rodando no contexto do usuário tentam inserir aqui.
CREATE POLICY "Users can insert their own trigger logs"
ON public.trigger_audit_logs
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Garantir que a função resolve_patient_meal_plan tenha acesso total para entrega ao paciente
ALTER FUNCTION public.resolve_patient_meal_plan(uuid, date) SECURITY DEFINER;
