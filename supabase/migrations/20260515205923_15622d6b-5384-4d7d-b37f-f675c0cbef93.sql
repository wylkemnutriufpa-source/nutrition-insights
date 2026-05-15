-- Update tipo_refeicao array values in v3_library_items
UPDATE public.v3_library_items
SET tipo_refeicao = array(
  SELECT 
    CASE 
      WHEN x = 'cafe_da_manha' THEN 'Café da Manhã'
      WHEN x = 'lanche_da_manha' THEN 'Lanche da Manhã'
      WHEN x = 'almoco' THEN 'Almoço'
      WHEN x = 'lanche_da_tarde' THEN 'Lanche da Tarde'
      WHEN x = 'jantar' THEN 'Jantar'
      WHEN x = 'ceia' THEN 'Ceia'
      WHEN x = 'pre_treino' THEN 'Pré-Treino'
      WHEN x = 'pos_treino' THEN 'Pós-Treino'
      ELSE x
    END
  FROM unnest(tipo_refeicao) AS x
)
WHERE active = true;