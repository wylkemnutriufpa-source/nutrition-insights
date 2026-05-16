-- Insert Sovereign Base Items
INSERT INTO public.v3_library_items (
  slug, title, category, kcal_base, protein_base, carbs_base, fats_base, active, tipo_refeicao
) VALUES 
  ('arroz-branco-soberano', 'Arroz Branco Cozido', 'Carboidratos', 130, 2.5, 28, 0.2, true, ARRAY['Almoço', 'Jantar']),
  ('arroz-integral-soberano', 'Arroz Integral Cozido', 'Carboidratos', 110, 2.6, 23, 1, true, ARRAY['Almoço', 'Jantar']),
  ('feijao-carioca-soberano', 'Feijão Carioca Cozido', 'Leguminosas', 76, 5, 14, 0.5, true, ARRAY['Almoço', 'Jantar']),
  ('feijao-preto-soberano', 'Feijão Preto Cozido', 'Leguminosas', 91, 6, 17, 0.5, true, ARRAY['Almoço', 'Jantar']),
  ('peito-frango-soberano', 'Peito de Frango Grelhado', 'Proteínas', 160, 32, 0, 3, true, ARRAY['Almoço', 'Jantar']),
  ('patinho-grelhado-soberano', 'Patinho Grelhado', 'Proteínas', 220, 30, 0, 10, true, ARRAY['Almoço', 'Jantar']),
  ('tilapia-grelhada-soberano', 'Filé de Tilápia Grelhado', 'Proteínas', 130, 26, 0, 2.5, true, ARRAY['Almoço', 'Jantar']),
  ('ovo-cozido-soberano', 'Ovo Cozido', 'Proteínas', 155, 13, 1, 11, true, ARRAY['Café da Manhã', 'Lanche', 'Jantar']),
  ('pao-frances-soberano', 'Pão Francês', 'Carboidratos', 300, 9, 58, 3, true, ARRAY['Café da Manhã', 'Lanche']),
  ('banana-prata-soberano', 'Banana Prata', 'Frutas', 89, 1.1, 23, 0.3, true, ARRAY['Café da Manhã', 'Lanche', 'Sobremesa'])
ON CONFLICT (slug) DO UPDATE SET 
  kcal_base = EXCLUDED.kcal_base,
  protein_base = EXCLUDED.protein_base,
  carbs_base = EXCLUDED.carbs_base,
  fats_base = EXCLUDED.fats_base;
