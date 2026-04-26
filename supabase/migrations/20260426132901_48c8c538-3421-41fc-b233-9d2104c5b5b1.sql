CREATE OR REPLACE FUNCTION get_schema_info(target_tables TEXT[])
RETURNS TABLE (table_name TEXT, column_name TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT c.table_name::TEXT, c.column_name::TEXT
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
    AND c.table_name = ANY(target_tables);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
