UPDATE public.meal_visual_library
SET category = 
  CASE 
    WHEN category = 'cafe_da_manha' THEN 'Café da Manhã'
    WHEN category = 'lanche_da_manha' THEN 'Lanche da Manhã'
    WHEN category = 'almoco' THEN 'Almoço'
    WHEN category = 'lanche_da_tarde' THEN 'Lanche da Tarde'
    WHEN category = 'jantar' THEN 'Jantar'
    WHEN category = 'ceia' THEN 'Ceia'
    WHEN category = 'pre_treino' THEN 'Pré-Treino'
    WHEN category = 'pos_treino' THEN 'Pós-Treino'
    ELSE category
  END
WHERE is_active = true;