-- 1. Popular Alimentos Reais
DO $$
BEGIN
    -- Proteínas
    IF NOT EXISTS (SELECT 1 FROM public.food_database WHERE name = 'Peito de Frango Grelhado') THEN
        INSERT INTO public.food_database (name, calories, protein, carbs, fat, serving_size, category, is_custom) VALUES ('Peito de Frango Grelhado', 165, 31, 0, 3.6, '100g', 'proteina', false);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.food_database WHERE name = 'Carne Moída (Patinho)') THEN
        INSERT INTO public.food_database (name, calories, protein, carbs, fat, serving_size, category, is_custom) VALUES ('Carne Moída (Patinho)', 215, 26, 0, 12, '100g', 'proteina', false);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.food_database WHERE name = 'Ovo Inteiro Cozido') THEN
        INSERT INTO public.food_database (name, calories, protein, carbs, fat, serving_size, category, is_custom) VALUES ('Ovo Inteiro Cozido', 75, 6, 0.6, 5, '1 unidade (50g)', 'proteina', false);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.food_database WHERE name = 'Tilápia Grelhada') THEN
        INSERT INTO public.food_database (name, calories, protein, carbs, fat, serving_size, category, is_custom) VALUES ('Tilápia Grelhada', 128, 26, 0, 2.7, '100g', 'proteina', false);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.food_database WHERE name = 'Whey Protein Isolado') THEN
        INSERT INTO public.food_database (name, calories, protein, carbs, fat, serving_size, category, is_custom) VALUES ('Whey Protein Isolado', 110, 25, 1, 0.5, '30g (1 scoop)', 'proteina', false);
    END IF;

    -- Carboidratos
    IF NOT EXISTS (SELECT 1 FROM public.food_database WHERE name = 'Arroz Branco Cozido') THEN
        INSERT INTO public.food_database (name, calories, protein, carbs, fat, serving_size, category, is_custom) VALUES ('Arroz Branco Cozido', 130, 2.7, 28, 0.3, '100g', 'carboidrato', false);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.food_database WHERE name = 'Arroz Integral Cozido') THEN
        INSERT INTO public.food_database (name, calories, protein, carbs, fat, serving_size, category, is_custom) VALUES ('Arroz Integral Cozido', 110, 2.6, 23, 0.9, '100g', 'carboidrato', false);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.food_database WHERE name = 'Batata Doce Cozida') THEN
        INSERT INTO public.food_database (name, calories, protein, carbs, fat, serving_size, category, is_custom) VALUES ('Batata Doce Cozida', 86, 1.6, 20, 0.1, '100g', 'carboidrato', false);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.food_database WHERE name = 'Pão de Forma Integral') THEN
        INSERT INTO public.food_database (name, calories, protein, carbs, fat, serving_size, category, is_custom) VALUES ('Pão de Forma Integral', 70, 3, 13, 1, '1 fatia (25g)', 'carboidrato', false);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.food_database WHERE name = 'Aveia em Flocos') THEN
        INSERT INTO public.food_database (name, calories, protein, carbs, fat, serving_size, category, is_custom) VALUES ('Aveia em Flocos', 389, 14, 66, 7, '30g (2 colheres)', 'carboidrato', false);
    END IF;

    -- Frutas
    IF NOT EXISTS (SELECT 1 FROM public.food_database WHERE name = 'Banana Prata') THEN
        INSERT INTO public.food_database (name, calories, protein, carbs, fat, serving_size, category, is_custom) VALUES ('Banana Prata', 98, 1.3, 26, 0.3, '1 unidade (100g)', 'fruta', false);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.food_database WHERE name = 'Maçã Fuji') THEN
        INSERT INTO public.food_database (name, calories, protein, carbs, fat, serving_size, category, is_custom) VALUES ('Maçã Fuji', 52, 0.3, 14, 0.2, '1 unidade (130g)', 'fruta', false);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.food_database WHERE name = 'Mamão Papaia') THEN
        INSERT INTO public.food_database (name, calories, protein, carbs, fat, serving_size, category, is_custom) VALUES ('Mamão Papaia', 43, 0.5, 11, 0.1, '1/2 unidade (150g)', 'fruta', false);
    END IF;
END $$;

-- 2 & 3. Popular Marmitas e Templates vinculados a um usuário real
DO $$
DECLARE
    v_sys_user UUID;
BEGIN
    SELECT user_id INTO v_sys_user FROM public.user_roles WHERE role = 'nutritionist' LIMIT 1;
    
    IF v_sys_user IS NOT NULL THEN
        -- Marmitas
        INSERT INTO public.meal_recipes (name, fixed_calories, fixed_protein, fixed_carbs, fixed_fat, is_active, nutritionist_id, is_fixed)
        SELECT name, fixed_calories, fixed_protein, fixed_carbs, fixed_fat, is_active, v_sys_user, is_fixed
        FROM (VALUES 
            ('Marmita: Frango com Batata Doce Fit', 420, 35, 45, 10, true, true),
            ('Marmita: Carne com Arroz e Feijão', 480, 32, 55, 12, true, true),
            ('Marmita: Peixe com Purê de Mandioca', 390, 28, 40, 9, true, true),
            ('Marmita: Macarrão Integral com Frango', 450, 30, 50, 10, true, true),
            ('Marmita: Carne Moída com Legumes', 350, 25, 15, 18, true, true),
            ('Marmita: Strogonoff de Frango Fit', 460, 33, 42, 15, true, true),
            ('Marmita: Escondidinho de Patinho', 430, 30, 48, 11, true, true),
            ('Marmita: Salmão com Brócolis e Arroz', 510, 35, 40, 22, true, true),
            ('Marmita: Frango Xadrez com Arroz', 440, 29, 52, 9, true, true),
            ('Marmita: Risoto de Alho Poró com Frango', 470, 31, 55, 13, true, true),
            ('Marmita: Lasanha de Berinjela e Carne', 320, 24, 18, 16, true, true),
            ('Marmita: Yakisoba de Legumes e Tofu', 380, 18, 55, 8, true, true),
            ('Marmita: Hambúrguer Fit com Batatas', 490, 34, 52, 14, true, true),
            ('Marmita: Galinhada Integral', 465, 30, 58, 12, true, true),
            ('Marmita: Almôndegas de Frango com Arroz', 410, 28, 45, 11, true, true)
        ) AS v(name, fixed_calories, fixed_protein, fixed_carbs, fixed_fat, is_active, is_fixed)
        WHERE NOT EXISTS (SELECT 1 FROM public.meal_recipes WHERE name = v.name);

        -- Templates
        INSERT INTO public.nutritionist_meal_templates (name, meal_type, goal_tags, is_global, foods_structure, kcal_base, protein_base, carbs_base, fat_base, nutritionist_id)
        SELECT name, meal_type, goal_tags, is_global, foods_structure, kcal_base, protein_base, carbs_base, fat_base, v_sys_user
        FROM (VALUES 
            ('Café da Manhã: Ovos e Pão Fit', 'cafe', '["Hipertrofia", "Saúde"]'::jsonb, true, '[{"name": "Ovo Inteiro Cozido", "kcal": 75, "protein": 6, "carbs": 0.6, "fat": 5, "portion": "2 unidades"}, {"name": "Pão de Forma Integral", "kcal": 70, "protein": 3, "carbs": 13, "fat": 1, "portion": "2 fatias"}]'::jsonb, 290, 18, 27, 12),
            ('Almoço: Frango e Batata Tradicional', 'almoco', '["Emagrecimento", "Fit"]'::jsonb, true, '[{"name": "Peito de Frango Grelhado", "kcal": 165, "protein": 31, "carbs": 0, "fat": 3.6, "portion": "120g"}, {"name": "Batata Doce Cozida", "kcal": 86, "protein": 1.6, "carbs": 20, "fat": 0.1, "portion": "150g"}]'::jsonb, 327, 40, 30, 4),
            ('Lanche: Iogurte e Fruta', 'lanche', '["Leve", "Prático"]'::jsonb, true, '[{"name": "Banana Prata", "kcal": 98, "protein": 1.3, "carbs": 26, "fat": 0.3, "portion": "1 unidade"}, {"name": "Aveia em Flocos", "kcal": 389, "protein": 14, "carbs": 66, "fat": 7, "portion": "30g"}]'::jsonb, 215, 6, 45, 2),
            ('Jantar: Peixe e Vegetais', 'jantar', '["Low Carb", "Noite"]'::jsonb, true, '[{"name": "Tilápia Grelhada", "kcal": 128, "protein": 26, "carbs": 0, "fat": 2.7, "portion": "150g"}, {"name": "Brócolis Cozido", "kcal": 35, "protein": 2.4, "carbs": 7, "fat": 0.4, "portion": "100g"}]'::jsonb, 227, 42, 7, 4),
            ('Shake Proteico Pré-Treino', 'pre_treino', '["Performance", "Rápido"]'::jsonb, true, '[{"name": "Whey Protein Isolado", "kcal": 110, "protein": 25, "carbs": 1, "fat": 0.5, "portion": "1 scoop"}, {"name": "Aveia em Flocos", "kcal": 389, "protein": 14, "carbs": 66, "fat": 7, "portion": "30g"}]'::jsonb, 226, 30, 20, 3),
            ('Café: Tapioca Proteica', 'cafe', '["Energia", "Sem Glúten"]'::jsonb, true, '[{"name": "Tapioca (Goma)", "kcal": 240, "protein": 0, "carbs": 60, "fat": 0, "portion": "50g"}, {"name": "Ovo Inteiro Cozido", "kcal": 75, "protein": 6, "carbs": 0.6, "fat": 5, "portion": "2 unidades"}]'::jsonb, 390, 12, 60, 10),
            ('Almoço: Carne Moída e Arroz', 'almoco', '["Tradicional", "Nutritivo"]'::jsonb, true, '[{"name": "Carne Moída (Patinho)", "kcal": 215, "protein": 26, "carbs": 0, "fat": 12, "portion": "100g"}, {"name": "Arroz Integral Cozido", "kcal": 110, "protein": 2.6, "carbs": 23, "fat": 0.9, "portion": "100g"}]'::jsonb, 325, 29, 23, 13),
            ('Lanche: Pão com Ovo', 'lanche', '["Simples", "Econômico"]'::jsonb, true, '[{"name": "Pão de Forma Integral", "kcal": 70, "protein": 3, "carbs": 13, "fat": 1, "portion": "2 fatias"}, {"name": "Ovo Mexido (sem óleo)", "kcal": 80, "protein": 6, "carbs": 0.7, "fat": 5.5, "portion": "2 unidades"}]'::jsonb, 300, 18, 27, 12),
            ('Ceia: Frutas e Oleaginosas', 'ceia', '["Sono", "Fome Noturna"]'::jsonb, true, '[{"name": "Mamão Papaia", "kcal": 43, "protein": 0.5, "carbs": 11, "fat": 0.1, "portion": "1/2 unidade"}, {"name": "Banana Prata", "kcal": 98, "protein": 1.3, "carbs": 26, "fat": 0.3, "portion": "1 unidade"}]'::jsonb, 141, 2, 37, 1),
            ('Pós-Treino: Frango e Arroz', 'pos_treino', '["Recuperação", "Anabolismo"]'::jsonb, true, '[{"name": "Peito de Frango Grelhado", "kcal": 165, "protein": 31, "carbs": 0, "fat": 3.6, "portion": "150g"}, {"name": "Arroz Branco Cozido", "kcal": 130, "protein": 2.7, "carbs": 28, "fat": 0.3, "portion": "200g"}]'::jsonb, 507, 52, 56, 6)
        ) AS v(name, meal_type, goal_tags, is_global, foods_structure, kcal_base, protein_base, carbs_base, fat_base)
        WHERE NOT EXISTS (SELECT 1 FROM public.nutritionist_meal_templates WHERE name = v.name);
    END IF;
END $$;
