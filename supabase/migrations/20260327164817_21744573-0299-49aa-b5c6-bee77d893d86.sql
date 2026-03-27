
CREATE OR REPLACE FUNCTION public.get_backup_tables()
RETURNS TABLE(table_name text, create_statement text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec RECORD;
  col_rec RECORD;
  cols text;
  tname text;
BEGIN
  FOR rec IN
    SELECT t.table_name AS tname
    FROM information_schema.tables t
    WHERE t.table_schema = 'public'
      AND t.table_type = 'BASE TABLE'
    ORDER BY t.table_name
  LOOP
    tname := rec.tname;
    cols := '';
    
    FOR col_rec IN
      SELECT 
        c.column_name,
        c.data_type,
        c.udt_name,
        c.character_maximum_length,
        c.is_nullable,
        c.column_default
      FROM information_schema.columns c
      WHERE c.table_schema = 'public'
        AND c.table_name = tname
      ORDER BY c.ordinal_position
    LOOP
      IF cols != '' THEN
        cols := cols || E',\n';
      END IF;
      
      cols := cols || '  "' || col_rec.column_name || '" ';
      
      -- Map type
      IF col_rec.data_type = 'USER-DEFINED' THEN
        cols := cols || col_rec.udt_name;
      ELSIF col_rec.data_type = 'ARRAY' THEN
        cols := cols || col_rec.udt_name;
      ELSIF col_rec.data_type = 'character varying' AND col_rec.character_maximum_length IS NOT NULL THEN
        cols := cols || 'varchar(' || col_rec.character_maximum_length || ')';
      ELSE
        cols := cols || col_rec.data_type;
      END IF;
      
      IF col_rec.is_nullable = 'NO' THEN
        cols := cols || ' NOT NULL';
      END IF;
      
      IF col_rec.column_default IS NOT NULL THEN
        cols := cols || ' DEFAULT ' || col_rec.column_default;
      END IF;
    END LOOP;
    
    table_name := tname;
    create_statement := E'CREATE TABLE public."' || tname || E'" (\n' || cols || E'\n)';
    RETURN NEXT;
  END LOOP;
END;
$$;
