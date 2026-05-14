-- Expansão de Itens Premium e Regionais
INSERT INTO v3_library_items (slug, title, meal_type, category, objective_tags, kcal_base, protein_base, carbs_base, fats_base, portion_mode, cluster_slug, composition) VALUES
('avocado-toast-poche', 'Avocado Toast com Ovo Pochê', ARRAY['breakfast', 'snack'], 'Café da Manhã', ARRAY['saude', 'manutencao'], 380, 16, 30, 22, 'standard', 'cafe_premium', '[{"name": "Pão de Fermentação Natural", "kcal": 150, "protein": 5, "carbs": 28, "fats": 2, "base_grams": 50}, {"name": "Abacate/Avocado", "kcal": 130, "protein": 2, "carbs": 6, "fats": 12, "base_grams": 80}, {"name": "Ovo Pochê", "kcal": 100, "protein": 9, "carbs": 1, "fats": 8, "base_grams": 100}]'),
('tapioca-frango-coalho', 'Tapioca Regional (Frango e Coalho)', ARRAY['breakfast', 'dinner'], 'Regional', ARRAY['manutencao', 'hipertrofia'], 420, 28, 45, 14, 'standard', 'jantar_regional', '[{"name": "Goma de Tapioca", "kcal": 200, "protein": 0, "carbs": 45, "fats": 0, "base_grams": 80}, {"name": "Frango Desfiado", "kcal": 120, "protein": 22, "carbs": 0, "fats": 4, "base_grams": 100}, {"name": "Queijo Coalho", "kcal": 100, "protein": 6, "carbs": 0, "fats": 10, "base_grams": 30}]'),
('file-mignon-quinoa', 'Filé Mignon com Risoto de Quinoa', ARRAY['lunch', 'dinner'], 'Premium', ARRAY['hipertrofia', 'performance'], 580, 45, 35, 28, 'standard', 'almoco_premium', '[{"name": "Filé Mignon Grelhado", "kcal": 300, "protein": 38, "carbs": 0, "fats": 15, "base_grams": 150}, {"name": "Quinoa Cozida", "kcal": 180, "protein": 6, "carbs": 32, "fats": 3, "base_grams": 120}, {"name": "Legumes ao Vapor", "kcal": 100, "protein": 1, "carbs": 3, "fats": 10, "base_grams": 150}]'),
('smoothie-whey-berries', 'Smoothie de Whey com Frutas Vermelhas', ARRAY['snack', 'breakfast'], 'Prático', ARRAY['manutencao', 'performance'], 220, 25, 15, 6, 'standard', 'lanche_pratico', '[{"name": "Whey Protein", "kcal": 120, "protein": 24, "carbs": 2, "fats": 2, "base_grams": 30}, {"name": "Frutas Vermelhas Congeladas", "kcal": 50, "protein": 1, "carbs": 10, "fats": 0, "base_grams": 100}, {"name": "Leite de Amêndoas", "kcal": 50, "protein": 0, "carbs": 3, "fats": 4, "base_grams": 200}]');

-- Adição de Imagens Determinísticas
INSERT INTO v3_library_images (item_slug, image_asset, variant_index) VALUES
('avocado-toast-poche', 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=800&auto=format&fit=crop', 0),
('tapioca-frango-coalho', 'https://images.unsplash.com/photo-1599307734110-94d5dca94656?w=800&auto=format&fit=crop', 0),
('file-mignon-quinoa', 'https://images.unsplash.com/photo-1558030006-45c27e5c7b3b?w=800&auto=format&fit=crop', 0),
('smoothie-whey-berries', 'https://images.unsplash.com/photo-1553530666-bc0c8d240c9d?w=800&auto=format&fit=crop', 0),
('pao-com-ovo', 'https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=800&auto=format&fit=crop', 0),
('frango-com-arroz', 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&auto=format&fit=crop', 0),
('iogurte-com-frutas', 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=800&auto=format&fit=crop', 0),
('omelete-de-queijo', 'https://images.unsplash.com/photo-1510693206972-df098062cb71?w=800&auto=format&fit=crop', 0);

-- Configuração de Substituições Soberanas
INSERT INTO v3_substitutions (source_slug, target_slug, score, active) VALUES
('pao-com-ovo', 'avocado-toast-poche', 0.9, true),
('pao-com-ovo', 'omelete-de-queijo', 0.8, true),
('frango-com-arroz', 'file-mignon-quinoa', 0.85, true),
('frango-com-arroz', 'tapioca-frango-coalho', 0.7, true),
('iogurte-com-frutas', 'smoothie-whey-berries', 0.9, true),
('omelete-de-queijo', 'pao-com-ovo', 0.8, true);
