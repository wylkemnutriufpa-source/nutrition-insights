-- Função para verificar existência de coluna
CREATE OR REPLACE FUNCTION public.get_column_exists(p_table TEXT, p_column TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = p_table 
        AND column_name = p_column
    );
END;
$$;

-- Função para verificar existência de função RPC
CREATE OR REPLACE FUNCTION public.check_function_exists(p_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM pg_proc 
        WHERE proname = p_name
    );
END;
$$;

-- Função para detectar duplicatas de planos ativos
CREATE OR REPLACE FUNCTION public.check_active_plan_duplicates()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN (
        SELECT jsonb_agg(row_to_json(t))
        FROM (
            SELECT patient_id, count(*) as active_count
            FROM public.meal_plans
            WHERE is_active = true
            GROUP BY patient_id
            HAVING count(*) > 1
        ) t
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_column_exists TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.check_function_exists TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.check_active_plan_duplicates TO authenticated, service_role;
