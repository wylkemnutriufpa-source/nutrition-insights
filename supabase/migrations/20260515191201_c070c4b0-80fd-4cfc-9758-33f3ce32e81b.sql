-- Adicionando mais itens à Biblioteca V3
-- Frutas e Lanches Leves
INSERT INTO public.v3_library_items (id, slug, title, tipo_refeicao, category, objective_tags, kcal_base, protein_base, carbs_base, fats_base, cluster_slug, composition) VALUES
(gen_random_uuid(), 'salada-frutas-especial', 'Salada de Frutas com Chia e Mel', '{"lanche_da_manha", "ceia"}', 'Frutas', '{"saudavel", "fibras"}', 150, 2, 35, 2, 'lanche_fruta', '{"items": [{"name": "Frutas Variadas", "amount": "150g"}, {"name": "Chia", "amount": "10g"}]}'),
(gen_random_uuid(), 'banana-canela-ceia', 'Banana com Canela Aquecida', '{"ceia"}', 'Frutas', '{"leve", "sono"}', 100, 1, 25, 0, 'lanche_leve', '{"items": [{"name": "Banana", "amount": "1 unid"}, {"name": "Canela", "amount": "a gosto"}]}'),
(gen_random_uuid(), 'mix-castanhas-nobres', 'Mix de Castanhas e Nozes', '{"lanche_da_tarde", "ceia"}', 'Lanches', '{"gorduras_boas", "pratico"}', 160, 4, 6, 14, 'lanche_pratico', '{"items": [{"name": "Castanhas", "amount": "20g"}]}');

-- Pratos Principais (Vegetarianos e Regionais)
INSERT INTO public.v3_library_items (id, slug, title, tipo_refeicao, category, objective_tags, kcal_base, protein_base, carbs_base, fats_base, cluster_slug, composition) VALUES
(gen_random_uuid(), 'moqueca-banana-vegetariana', 'Moqueca de Banana da Terra com Arroz de Coco', '{"almoco", "jantar"}', 'Almoço', '{"vegetariano", "regional"}', 450, 10, 60, 22, 'almoco_vegetariano', '{"items": [{"name": "Banana da Terra", "amount": "100g"}, {"name": "Arroz de Coco", "amount": "100g"}, {"name": "Leite de Coco", "amount": "50ml"}]}'),
(gen_random_uuid(), 'risoto-cogumelos-fit', 'Risoto de Shimeji e Paris (Arroz Integral)', '{"almoco", "jantar"}', 'Almoço', '{"vegetariano", "premium"}', 420, 15, 55, 12, 'almoco_vegetariano', '{"items": [{"name": "Arroz Integral", "amount": "100g"}, {"name": "Cogumelos", "amount": "100g"}]}'),
(gen_random_uuid(), 'feijoada-vegetariana-completa', 'Feijoada Vegetariana com Tofu Defumado e Couve', '{"almoco"}', 'Almoço', '{"vegetariano", "brasileiro"}', 520, 25, 65, 18, 'almoco_vegetariano', '{"items": [{"name": "Feijão Preto", "amount": "100g"}, {"name": "Tofu Defumado", "amount": "80g"}, {"name": "Arroz", "amount": "80g"}]}'),
(gen_random_uuid(), 'baiao-de-dois-fit', 'Baião de Dois com Queijo Coalho e Carne de Sol', '{"almoco"}', 'Almoço', '{"regional", "energia"}', 600, 35, 70, 20, 'almoco_regional', '{"items": [{"name": "Arroz e Feijão de Corda", "amount": "150g"}, {"name": "Carne de Sol", "amount": "100g"}, {"name": "Queijo Coalho", "amount": "30g"}]}');

-- Econômicos
INSERT INTO public.v3_library_items (id, slug, title, tipo_refeicao, category, objective_tags, kcal_base, protein_base, carbs_base, fats_base, cluster_slug, composition) VALUES
(gen_random_uuid(), 'arroz-feijao-ovo-frito', 'Ovo Frito com Arroz e Feijão (Clássico Econômico)', '{"almoco", "jantar"}', 'Almoço', '{"economico", "pratico"}', 480, 18, 55, 18, 'almoco_economico', '{"items": [{"name": "Arroz", "amount": "100g"}, {"name": "Feijão", "amount": "80g"}, {"name": "Ovo Frito", "amount": "2 unid"}]}'),
(gen_random_uuid(), 'macarrao-alho-oleo-frango', 'Macarrão Alho e Óleo com Frango Desfiado', '{"almoco", "jantar"}', 'Almoço', '{"economico", "rapido"}', 500, 30, 60, 14, 'almoco_economico', '{"items": [{"name": "Macarrão", "amount": "100g"}, {"name": "Frango Desfiado", "amount": "100g"}]}');

-- Esportivos / Performance
INSERT INTO public.v3_library_items (id, slug, title, tipo_refeicao, category, objective_tags, kcal_base, protein_base, carbs_base, fats_base, cluster_slug, composition) VALUES
(gen_random_uuid(), 'shake-performance-crossfit', 'Shake Performance: Whey, Creatina e Palatinose', '{"pre_treino", "pos_treino"}', 'Lanche', '{"esportivo", "performance"}', 300, 30, 40, 2, 'lanche_performance', '{"items": [{"name": "Whey Protein", "amount": "30g"}, {"name": "Palatinose", "amount": "30g"}]}'),
(gen_random_uuid(), 'bowl-acai-whey-granola', 'Super Bowl: Açaí, Whey e Granola', '{"lanche_da_tarde", "pos_treino"}', 'Frutas', '{"energia", "esportivo"}', 550, 28, 85, 12, 'lanche_performance', '{"items": [{"name": "Açaí puro", "amount": "200g"}, {"name": "Whey", "amount": "30g"}, {"name": "Granola", "amount": "30g"}]}');

-- Vincular Imagens
INSERT INTO public.v3_library_images (id, item_slug, image_asset, variant_index, active) VALUES
(gen_random_uuid(), 'salada-frutas-especial', 'https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/salada-de-frutas/salada-de-frutas.jpg', 0, true),
(gen_random_uuid(), 'banana-canela-ceia', 'https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/banana-com-canela.jpg', 0, true),
(gen_random_uuid(), 'mix-castanhas-nobres', 'https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/castanhas.jpg', 0, true),
(gen_random_uuid(), 'arroz-feijao-ovo-frito', 'https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/arroz-feijao-carne.png', 0, true),
(gen_random_uuid(), 'bowl-acai-whey-granola', 'https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/acai%2Facai.jpg', 0, true);

-- Inserindo Novos Templates V3 Especializados
-- Diabetes Control
INSERT INTO public.v3_diet_templates (id, slug, title, description, template_type, objective, meal_distribution, cluster_map, kcal_profiles, visual_style, substitutions_enabled, editable, active) VALUES
(gen_random_uuid(), 'diabetes-control', 'Protocolo Diabetes Control', 'Foco total em baixo índice glicêmico e controle da curva de insulina.', 'visual_v3', 'Diabetes', 
'[{"slot": "Café da Manhã", "time": "08:00"}, {"slot": "Almoço", "time": "12:30"}, {"slot": "Lanche da Tarde", "time": "16:30"}, {"slot": "Jantar", "time": "19:30"}]',
'{"Café da Manhã": "cafe_proteico", "Almoço": "almoco_saudavel", "Lanche da Tarde": "lanche_pratico", "Jantar": "jantar_leve"}',
'[1200, 1400, 1600, 1800, 2000]', 'clean', true, true, true);

-- Hipertensão Care
INSERT INTO public.v3_diet_templates (id, slug, title, description, template_type, objective, meal_distribution, cluster_map, kcal_profiles, visual_style, substitutions_enabled, editable, active) VALUES
(gen_random_uuid(), 'hipertensao-care', 'Protocolo DASH / Hipertensão', 'Redução de sódio com foco em potássio, magnésio e fibras.', 'visual_v3', 'Hipertensão', 
'[{"slot": "Café da Manhã", "time": "08:00"}, {"slot": "Almoço", "time": "12:30"}, {"slot": "Lanche da Tarde", "time": "16:00"}, {"slot": "Jantar", "time": "19:30"}]',
'{"Café da Manhã": "cafe_saudavel", "Almoço": "almoco_saudavel", "Lanche da Tarde": "lanche_fruta", "Jantar": "jantar_leve"}',
'[1200, 1400, 1600, 1800, 2000]', 'minimalist', true, true, true);

-- Performance Crossfit
INSERT INTO public.v3_diet_templates (id, slug, title, description, template_type, objective, meal_distribution, cluster_map, kcal_profiles, visual_style, substitutions_enabled, editable, active) VALUES
(gen_random_uuid(), 'performance-crossfit', 'Performance Crossfit & Intensidade', 'Alta disponibilidade de glicogênio e recuperação proteica acelerada.', 'visual_v3', 'Crossfit', 
'[{"slot": "Café da Manhã", "time": "07:00"}, {"slot": "Almoço", "time": "12:30"}, {"slot": "Lanche da Tarde", "time": "16:00"}, {"slot": "Jantar", "time": "20:00"}, {"slot": "Ceia", "time": "22:00"}]',
'{"Café da Manhã": "cafe_proteico", "Almoço": "almoco_premium", "Lanche da Tarde": "lanche_performance", "Jantar": "almoco_tradicional", "Ceia": "lanche_proteico"}',
'[2000, 2500, 3000]', 'modern', true, true, true);

-- Corrida / Endurance
INSERT INTO public.v3_diet_templates (id, slug, title, description, template_type, objective, meal_distribution, cluster_map, kcal_profiles, visual_style, substitutions_enabled, editable, active) VALUES
(gen_random_uuid(), 'corrida-endurance', 'Protocolo Corrida & Endurance', 'Otimização de estoques de glicogênio e eletrólitos para corredores.', 'visual_v3', 'Corrida', 
'[{"slot": "Café da Manhã", "time": "06:30"}, {"slot": "Almoço", "time": "12:30"}, {"slot": "Lanche da Tarde", "time": "16:00"}, {"slot": "Jantar", "time": "19:30"}]',
'{"Café da Manhã": "cafe_regional", "Almoço": "almoco_mediterraneo", "Lanche da Tarde": "lanche_performance", "Jantar": "almoco_tradicional"}',
'[1800, 2000, 2500, 3000]', 'clean', true, true, true);

-- Lifestyle Saudável
INSERT INTO public.v3_diet_templates (id, slug, title, description, template_type, objective, meal_distribution, cluster_map, kcal_profiles, visual_style, substitutions_enabled, editable, active) VALUES
(gen_random_uuid(), 'lifestyle-saudavel', 'Lifestyle Saudável & Longevidade', 'Equilíbrio total para quem busca saúde sem restrições extremas.', 'visual_v3', 'Lifestyle', 
'[{"slot": "Café da Manhã", "time": "08:00"}, {"slot": "Almoço", "time": "12:30"}, {"slot": "Lanche da Tarde", "time": "16:00"}, {"slot": "Jantar", "time": "20:00"}]',
'{"Café da Manhã": "cafe_tradicional", "Almoço": "almoco_tradicional", "Lanche da Tarde": "lanche_fruta", "Jantar": "jantar_leve"}',
'[1400, 1600, 1800, 2000, 2200]', 'modern', true, true, true);
