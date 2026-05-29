-- Verificar a estrutura real da tabela v3_diet_templates
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'v3_diet_templates'
ORDER BY ordinal_position;
