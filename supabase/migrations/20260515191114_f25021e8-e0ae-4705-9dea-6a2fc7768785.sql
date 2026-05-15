-- Limpeza de dados legados para garantir integridade V3
DELETE FROM public.v3_library_images;
DELETE FROM public.v3_library_items;
DELETE FROM public.v3_diet_templates;

-- 1. Inserir Itens na Biblioteca V3 (v3_library_items)
-- Café da Manhã
INSERT INTO public.v3_library_items (id, slug, title, tipo_refeicao, category, objective_tags, kcal_base, protein_base, carbs_base, fats_base, cluster_slug, composition) VALUES
(gen_random_uuid(), 'pao-com-ovo-tradicional', 'Pão Francês com Ovo e Café', '{"cafe_da_manha"}', 'Café da Manhã', '{"tradicional", "pratico"}', 320, 14, 35, 12, 'cafe_tradicional', '{"items": [{"name": "Pão Francês", "amount": "50g"}, {"name": "Ovo Mexido", "amount": "2 unid"}, {"name": "Café", "amount": "200ml"}]}'),
(gen_random_uuid(), 'omelete-proteico', 'Omelete Proteico com Queijo e Espinafre', '{"cafe_da_manha"}', 'Café da Manhã', '{"proteico", "hipertrofia"}', 280, 24, 5, 18, 'cafe_proteico', '{"items": [{"name": "Ovos", "amount": "3 unid"}, {"name": "Queijo Branco", "amount": "30g"}, {"name": "Espinafre", "amount": "a gosto"}]}'),
(gen_random_uuid(), 'iogurte-bowl-frutas', 'Bowl de Iogurte, Frutas e Granola', '{"cafe_da_manha", "lanche_da_tarde"}', 'Café da Manhã', '{"saudavel", "fibras"}', 250, 12, 38, 6, 'cafe_saudavel', '{"items": [{"name": "Iogurte Natural", "amount": "170g"}, {"name": "Morango/Banana", "amount": "100g"}, {"name": "Granola", "amount": "20g"}]}'),
(gen_random_uuid(), 'avocado-toast-poche', 'Avocado Toast com Ovo Pochê', '{"cafe_da_manha"}', 'Café da Manhã', '{"premium", "gorduras_boas"}', 380, 16, 25, 24, 'cafe_premium', '{"items": [{"name": "Pão Integral", "amount": "1 fatia"}, {"name": "Abacate", "amount": "60g"}, {"name": "Ovo Pochê", "amount": "1 unid"}]}'),
(gen_random_uuid(), 'cuscuz-com-ovo', 'Cuscuz Nordestino com Ovo', '{"cafe_da_manha"}', 'Café da Manhã', '{"brasileiro", "energia"}', 350, 14, 45, 10, 'cafe_regional', '{"items": [{"name": "Cuscuz", "amount": "100g"}, {"name": "Ovo", "amount": "2 unid"}]}'),
(gen_random_uuid(), 'crepioca-frango', 'Crepioca de Frango Desfiado', '{"cafe_da_manha", "jantar"}', 'Café da Manhã', '{"proteico", "pratico"}', 400, 32, 22, 12, 'cafe_proteico', '{"items": [{"name": "Ovo", "amount": "2 unid"}, {"name": "Goma de Tapioca", "amount": "20g"}, {"name": "Frango Desfiado", "amount": "100g"}]}');

-- Almoço / Jantar
INSERT INTO public.v3_library_items (id, slug, title, tipo_refeicao, category, objective_tags, kcal_base, protein_base, carbs_base, fats_base, cluster_slug, composition) VALUES
(gen_random_uuid(), 'arroz-feijao-frango-tradicional', 'Prato Feito: Arroz, Feijão e Frango Grelhado', '{"almoco", "jantar"}', 'Almoço', '{"tradicional", "equilibrado"}', 550, 38, 55, 12, 'almoco_tradicional', '{"items": [{"name": "Arroz Integral", "amount": "100g"}, {"name": "Feijão", "amount": "80g"}, {"name": "Frango Grelhado", "amount": "120g"}, {"name": "Salada", "amount": "Livre"}]}'),
(gen_random_uuid(), 'carne-panela-legumes', 'Carne de Panela com Batata e Cenoura', '{"almoco", "jantar"}', 'Almoço', '{"brasileiro", "conforto"}', 480, 32, 40, 18, 'almoco_regional', '{"items": [{"name": "Carne (Acém/Músculo)", "amount": "120g"}, {"name": "Batata", "amount": "80g"}, {"name": "Cenoura", "amount": "50g"}]}'),
(gen_random_uuid(), 'file-mignon-quinoa', 'Filé Mignon com Risoto de Quinoa e Aspargos', '{"almoco", "jantar"}', 'Almoço', '{"premium", "hipertrofia"}', 580, 42, 35, 22, 'almoco_premium', '{"items": [{"name": "Filé Mignon", "amount": "150g"}, {"name": "Quinoa cozida", "amount": "100g"}, {"name": "Aspargos/Legumes", "amount": "100g"}]}'),
(gen_random_uuid(), 'peixe-limone-vegetais', 'Peixe ao Limone com Mix de Vegetais', '{"almoco", "jantar"}', 'Almoço', '{"leve", "emagrecimento"}', 320, 35, 12, 10, 'almoco_saudavel', '{"items": [{"name": "Saint Peter / Tilápia", "amount": "150g"}, {"name": "Brócolis e Cenoura", "amount": "150g"}]}'),
(gen_random_uuid(), 'strogonoff-frango-fit', 'Strogonoff de Frango Fit (Creme de Ricota)', '{"almoco", "jantar"}', 'Almoço', '{"tradicional", "proteico"}', 450, 35, 30, 15, 'almoco_tradicional', '{"items": [{"name": "Frango em Cubos", "amount": "120g"}, {"name": "Arroz Branco", "amount": "80g"}, {"name": "Creme de Ricota", "amount": "30g"}]}'),
(gen_random_uuid(), 'macarronada-camarao', 'Macarronada de Camarão ao Azeite de Ervas', '{"almoco", "jantar"}', 'Almoço', '{"premium", "mediterranea"}', 520, 32, 50, 16, 'almoco_mediterraneo', '{"items": [{"name": "Macarrão Integral", "amount": "80g"}, {"name": "Camarão Grelhado", "amount": "120g"}, {"name": "Azeite e Ervas", "amount": "10ml"}]}');

-- Lanches e Ceia
INSERT INTO public.v3_library_items (id, slug, title, tipo_refeicao, category, objective_tags, kcal_base, protein_base, carbs_base, fats_base, cluster_slug, composition) VALUES
(gen_random_uuid(), 'shake-whey-frutas', 'Smoothie de Whey Protein com Frutas', '{"lanche_da_tarde", "pos_treino"}', 'Lanche', '{"proteico", "pos_treino"}', 220, 25, 22, 4, 'lanche_proteico', '{"items": [{"name": "Whey Protein", "amount": "30g"}, {"name": "Frutas Vermelhas", "amount": "80g"}]}'),
(gen_random_uuid(), 'fruta-nuts', 'Mix de Fruta com Oleaginosas', '{"lanche_da_manha", "ceia"}', 'Lanche', '{"pratico", "fibras"}', 180, 4, 25, 10, 'lanche_pratico', '{"items": [{"name": "Maçã / Pera", "amount": "1 unid"}, {"name": "Castanhas", "amount": "15g"}]}'),
(gen_random_uuid(), 'wrap-frango-ricota', 'Wrap Integral de Frango com Ricota', '{"lanche_da_tarde", "jantar"}', 'Lanche', '{"saciedade", "pratico"}', 280, 22, 28, 8, 'lanche_proteico', '{"items": [{"name": "Pão Tortilha Integral", "amount": "1 unid"}, {"name": "Frango Desfiado", "amount": "60g"}, {"name": "Ricota", "amount": "30g"}]}'),
(gen_random_uuid(), 'sopa-abobora-frango', 'Sopa de Abóbora com Gengibre e Frango', '{"jantar", "ceia"}', 'Jantar', '{"leve", "anti_inflamatoria"}', 280, 25, 30, 6, 'jantar_leve', '{"items": [{"name": "Abóbora Cabotiá", "amount": "150g"}, {"name": "Frango Desfiado", "amount": "80g"}, {"name": "Gengibre", "amount": "a gosto"}]}'),
(gen_random_uuid(), 'cha-torrada-leve', 'Chá de Ervas com Torrada Integral e Geleia 100% Fruta', '{"ceia"}', 'Ceia', '{"leve", "sono"}', 120, 2, 22, 2, 'lanche_leve', '{"items": [{"name": "Chá (Camomila/Erva Doce)", "amount": "200ml"}, {"name": "Torrada Integral", "amount": "2 fatias"}]}');

-- 2. Vincular Imagens (v3_library_images)
INSERT INTO public.v3_library_images (id, item_slug, image_asset, variant_index, active) VALUES
(gen_random_uuid(), 'pao-com-ovo-tradicional', 'https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/pao-frances.jpg', 0, true),
(gen_random_uuid(), 'iogurte-bowl-frutas', 'https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/iogurte-natural/iogurte-natural.jpg', 0, true),
(gen_random_uuid(), 'avocado-toast-poche', 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=800&auto=format&fit=crop', 0, true),
(gen_random_uuid(), 'cuscuz-com-ovo', 'https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/cuscuz-com-ovo-2.jpg', 0, true),
(gen_random_uuid(), 'crepioca-frango', 'https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/crepioca%2Fcrepioca.jpg', 0, true),
(gen_random_uuid(), 'arroz-feijao-frango-tradicional', 'https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/arroz-feijao-frango.png', 0, true),
(gen_random_uuid(), 'carne-panela-legumes', 'https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/carne-assada-de-panela/carne-assada-de-panela.jpg', 0, true),
(gen_random_uuid(), 'file-mignon-quinoa', 'https://images.unsplash.com/photo-1558030006-45c27e5c7b3b?w=800&auto=format&fit=crop', 0, true),
(gen_random_uuid(), 'strogonoff-frango-fit', 'https://images.unsplash.com/photo-1541544741938-0af808871cc0?w=800&auto=format&fit=crop', 0, true),
(gen_random_uuid(), 'macarronada-camarao', 'https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/macarronada-de-camarao.jpg', 0, true),
(gen_random_uuid(), 'fruta-nuts', 'https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/fruta.jpg', 0, true),
(gen_random_uuid(), 'wrap-frango-ricota', 'https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/wrap-integral.jpg', 0, true),
(gen_random_uuid(), 'sopa-abobora-frango', 'https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/sopa-de-legumes%2Fsopa-de-legumes.jpg', 0, true),
(gen_random_uuid(), 'cha-torrada-leve', 'https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/cha-com-torrada/cha-com-torrada.jpg', 0, true);

-- 3. Criar Templates V3 (v3_diet_templates)
-- Hipertrofia Masculina
INSERT INTO public.v3_diet_templates (id, slug, title, description, template_type, objective, meal_distribution, cluster_map, kcal_profiles, visual_style, substitutions_enabled, editable, active) VALUES
(gen_random_uuid(), 'hipertrofia-masculina', 'Hipertrofia Masculina Premium', 'Foco em ganho de massa magra com alta densidade calórica e proteína elevada.', 'visual_v3', 'Hipertrofia Masculina', 
'[{"slot": "Café da Manhã", "time": "07:30"}, {"slot": "Lanche da Manhã", "time": "10:30"}, {"slot": "Almoço", "time": "13:00"}, {"slot": "Lanche da Tarde", "time": "16:30"}, {"slot": "Jantar", "time": "20:00"}, {"slot": "Ceia", "time": "22:30"}]',
'{"Café da Manhã": "cafe_proteico", "Lanche da Manhã": "lanche_pratico", "Almoço": "almoco_premium", "Lanche da Tarde": "lanche_proteico", "Jantar": "almoco_tradicional", "Ceia": "lanche_leve"}',
'[1800, 2000, 2500, 3000]', 'modern', true, true, true);

-- Emagrecimento Feminino
INSERT INTO public.v3_diet_templates (id, slug, title, description, template_type, objective, meal_distribution, cluster_map, kcal_profiles, visual_style, substitutions_enabled, editable, active) VALUES
(gen_random_uuid(), 'emagrecimento-feminino', 'Emagrecimento Feminino Acelerado', 'Déficit calórico estratégico com foco em saciedade e controle hormonal.', 'visual_v3', 'Emagrecimento Feminino', 
'[{"slot": "Café da Manhã", "time": "08:00"}, {"slot": "Almoço", "time": "12:30"}, {"slot": "Lanche da Tarde", "time": "16:30"}, {"slot": "Jantar", "time": "19:30"}]',
'{"Café da Manhã": "cafe_saudavel", "Almoço": "almoco_saudavel", "Lanche da Tarde": "lanche_proteico", "Jantar": "jantar_leve"}',
'[1200, 1400, 1600, 1800]', 'clean', true, true, true);

-- Low Carb
INSERT INTO public.v3_diet_templates (id, slug, title, description, template_type, objective, meal_distribution, cluster_map, kcal_profiles, visual_style, substitutions_enabled, editable, active) VALUES
(gen_random_uuid(), 'low-carb-elite', 'Low Carb Elite', 'Redução de carboidratos com foco em gorduras boas e proteínas de alta qualidade.', 'visual_v3', 'Low Carb', 
'[{"slot": "Café da Manhã", "time": "08:30"}, {"slot": "Almoço", "time": "13:00"}, {"slot": "Lanche da Tarde", "time": "17:00"}, {"slot": "Jantar", "time": "20:00"}]',
'{"Café da Manhã": "cafe_proteico", "Almoço": "almoco_saudavel", "Lanche da Tarde": "lanche_pratico", "Jantar": "jantar_leve"}',
'[1400, 1600, 1800, 2000]', 'minimalist', true, true, true);

-- Mediterrânea / Anti-inflamatória
INSERT INTO public.v3_diet_templates (id, slug, title, description, template_type, objective, meal_distribution, cluster_map, kcal_profiles, visual_style, substitutions_enabled, editable, active) VALUES
(gen_random_uuid(), 'mediterranea-pro', 'Mediterrânea Anti-inflamatória', 'Padrão ouro de saúde cardiovascular e controle de inflamação sistêmica.', 'visual_v3', 'Mediterrânea', 
'[{"slot": "Café da Manhã", "time": "08:00"}, {"slot": "Almoço", "time": "12:30"}, {"slot": "Lanche da Tarde", "time": "16:30"}, {"slot": "Jantar", "time": "20:00"}]',
'{"Café da Manhã": "cafe_premium", "Almoço": "almoco_mediterraneo", "Lanche da Tarde": "lanche_fruta", "Jantar": "jantar_leve"}',
'[1600, 1800, 2000, 2200]', 'clean', true, true, true);

-- SOP / Saúde Feminina
INSERT INTO public.v3_diet_templates (id, slug, title, description, template_type, objective, meal_distribution, cluster_map, kcal_profiles, visual_style, substitutions_enabled, editable, active) VALUES
(gen_random_uuid(), 'sop-menopausa', 'Protocolo SOP & Menopausa', 'Controle glicêmico e hormonal com foco em resistência insulínica.', 'visual_v3', 'SOP', 
'[{"slot": "Café da Manhã", "time": "08:30"}, {"slot": "Almoço", "time": "13:00"}, {"slot": "Lanche da Tarde", "time": "17:00"}, {"slot": "Jantar", "time": "20:30"}]',
'{"Café da Manhã": "cafe_saudavel", "Almoço": "almoco_tradicional", "Lanche da Tarde": "lanche_proteico", "Jantar": "jantar_leve"}',
'[1400, 1600, 1800]', 'clean', true, true, true);

-- Tradicional Brasileiro (Fit Econômico)
INSERT INTO public.v3_diet_templates (id, slug, title, description, template_type, objective, meal_distribution, cluster_map, kcal_profiles, visual_style, substitutions_enabled, editable, active) VALUES
(gen_random_uuid(), 'tradicional-brasileiro-fit', 'Tradicional Brasileiro Fit', 'O clássico arroz, feijão e carne adaptado para resultados reais com economia.', 'visual_v3', 'Tradicional Brasileiro', 
'[{"slot": "Café da Manhã", "time": "08:00"}, {"slot": "Almoço", "time": "12:30"}, {"slot": "Lanche da Tarde", "time": "16:00"}, {"slot": "Jantar", "time": "19:30"}]',
'{"Café da Manhã": "cafe_tradicional", "Almoço": "almoco_tradicional", "Lanche da Tarde": "lanche_pratico", "Jantar": "almoco_regional"}',
'[1400, 1600, 1800, 2000, 2500]', 'modern', true, true, true);
