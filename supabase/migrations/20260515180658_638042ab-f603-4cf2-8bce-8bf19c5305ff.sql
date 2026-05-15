-- Inserindo mais variações e categorias para completar a biblioteca premium
DO $$
BEGIN
    -- Hipertrofia Masculina - 2800 kcal
    INSERT INTO public.diet_templates (name, slug, description, icon, category, goal_category, diet_style, base_calories, macro_ratio, template_generation, is_active, tags, meals)
    VALUES ('Hipertrofia Masculina - 2800 kcal', 'hipertrofia-m-2800', 'Foco em superávit calórico limpo para atletas e praticantes de musculação.', '🥩', 'hipertrofia', 'hipertrofia', 'ganho_massa', 2800, '{"protein": 25, "carbs": 50, "fat": 25}', 'official_v2', true, '{"premium", "hipertrofia"}', 
    '[{"tipo_refeicao": "Café da Manhã", "blocks": [{"label": "Base", "options": [{"name": "4 Ovos + 3 Fatias de Pão + 1 Fruta", "calories": 550, "protein": 35, "carbs": 50, "fat": 25}]}]}, {"tipo_refeicao": "Almoço", "blocks": [{"label": "Base", "options": [{"name": "Arroz (200g) + Feijão (100g) + Carne Vermelha (150g)", "calories": 750, "protein": 45, "carbs": 80, "fat": 20}]}]}, {"tipo_refeicao": "Lanche da Tarde", "blocks": [{"label": "Base", "options": [{"name": "Sanduíche de Frango (150g) + Suco de Uva", "calories": 450, "protein": 35, "carbs": 55, "fat": 8}]}]}, {"tipo_refeicao": "Jantar", "blocks": [{"label": "Base", "options": [{"name": "Macarrão (200g) + Frango (150g) + Molho Tomate", "calories": 700, "protein": 40, "carbs": 90, "fat": 15}]}]}]');

    -- Hipertrofia Feminina - 2000 kcal
    INSERT INTO public.diet_templates (name, slug, description, icon, category, goal_category, diet_style, base_calories, macro_ratio, template_generation, is_active, tags, meals)
    VALUES ('Hipertrofia Feminina - 2000 kcal', 'hipertrofia-f-2000', 'Ganho de massa magra com foco em definição e estética.', '🍑', 'hipertrofia', 'hipertrofia', 'ganho_massa', 2000, '{"protein": 30, "carbs": 40, "fat": 30}', 'official_v2', true, '{"premium", "hipertrofia"}', 
    '[{"tipo_refeicao": "Café da Manhã", "blocks": [{"label": "Base", "options": [{"name": "Crepioca (2 ovos + 2 col. goma) + Queijo", "calories": 350, "protein": 22, "carbs": 25, "fat": 18}]}]}, {"tipo_refeicao": "Almoço", "blocks": [{"label": "Base", "options": [{"name": "Batata Doce (150g) + Filé de Frango (120g) + Brócolis", "calories": 500, "protein": 35, "carbs": 45, "fat": 12}]}]}, {"tipo_refeicao": "Jantar", "blocks": [{"label": "Base", "options": [{"name": "Arroz (100g) + Salmão (120g) + Salada", "calories": 450, "protein": 28, "carbs": 30, "fat": 22}]}]}]');

    -- Emagrecimento Masculino - 2000 kcal
    INSERT INTO public.diet_templates (name, slug, description, icon, category, goal_category, diet_style, base_calories, macro_ratio, template_generation, is_active, tags, meals)
    VALUES ('Emagrecimento Masculino - 2000 kcal', 'emagrecimento-m-2000', 'Déficit calórico para homens com preservação de massa muscular.', '🏃‍♂️', 'emagrecimento', 'emagrecimento', 'emagrecimento', 2000, '{"protein": 35, "carbs": 35, "fat": 30}', 'official_v2', true, '{"premium", "emagrecimento"}', 
    '[{"tipo_refeicao": "Café da Manhã", "blocks": [{"label": "Base", "options": [{"name": "Ovos Cozidos (3) + 1 Fatia de Pão + Café", "calories": 320, "protein": 22, "carbs": 15, "fat": 18}]}]}, {"tipo_refeicao": "Almoço", "blocks": [{"label": "Base", "options": [{"name": "Arroz (150g) + Feijão (80g) + Frango (150g)", "calories": 550, "protein": 42, "carbs": 60, "fat": 10}]}]}, {"tipo_refeicao": "Jantar", "blocks": [{"label": "Base", "options": [{"name": "Carne Moída (150g) + Salada Grande + Azeite", "calories": 480, "protein": 38, "carbs": 10, "fat": 32}]}]}]');

    -- Lifestyle Saudável - 1800 kcal
    INSERT INTO public.diet_templates (name, slug, description, icon, category, goal_category, diet_style, base_calories, macro_ratio, template_generation, is_active, tags, meals)
    VALUES ('Lifestyle Saudável - 1800 kcal', 'lifestyle-1800', 'Manutenção e saúde com alimentos variados e práticos.', '🥗', 'lifestyle', 'lifestyle', 'manutencao', 1800, '{"protein": 25, "carbs": 45, "fat": 30}', 'official_v2', true, '{"premium", "lifestyle"}', 
    '[{"tipo_refeicao": "Café da Manhã", "blocks": [{"label": "Base", "options": [{"name": "Fruta + Iogurte + Aveia", "calories": 280, "protein": 15, "carbs": 35, "fat": 8}]}]}, {"tipo_refeicao": "Almoço", "blocks": [{"label": "Base", "options": [{"name": "Prato Equilibrado (Arroz, Feijão, Proteína, Salada)", "calories": 500, "protein": 35, "carbs": 50, "fat": 15}]}]}, {"tipo_refeicao": "Jantar", "blocks": [{"label": "Base", "options": [{"name": "Sopa ou Sanduíche Natural", "calories": 400, "protein": 25, "carbs": 40, "fat": 12}]}]}]');

    -- Reeducação Alimentar
    INSERT INTO public.diet_templates (name, slug, description, icon, category, goal_category, diet_style, base_calories, macro_ratio, template_generation, is_active, tags, meals)
    VALUES ('Reeducação Alimentar - 1600 kcal', 'reeducacao-1600', 'Foco em aprendizado de porções e qualidade nutricional.', '🍎', 'lifestyle', 'lifestyle', 'manutencao', 1600, '{"protein": 30, "carbs": 40, "fat": 30}', 'official_v2', true, '{"premium", "reeducacao"}', '[]');

    -- Fit Econômico
    INSERT INTO public.diet_templates (name, slug, description, icon, category, goal_category, diet_style, base_calories, macro_ratio, template_generation, is_active, tags, meals)
    VALUES ('Fit Econômico - 1800 kcal', 'fit-economico-1800', 'Alimentos de baixo custo com alta densidade nutricional.', '💰', 'lifestyle', 'lifestyle', 'manutencao', 1800, '{"protein": 25, "carbs": 50, "fat": 25}', 'official_v2', true, '{"premium", "economico"}', '[]');
    
    -- SOP e Menopausa
    INSERT INTO public.diet_templates (name, slug, description, icon, category, goal_category, diet_style, base_calories, macro_ratio, template_generation, is_active, tags, meals)
    VALUES 
    ('Controle de SOP', 'sop-controle', 'Foco em índice glicêmico baixo e controle hormonal.', '🌸', 'clinical', 'clinical', 'saude', 1600, '{"protein": 30, "carbs": 30, "fat": 40}', 'official_v2', true, '{"sop"}', '[]'),
    ('Menopausa Saudável', 'menopausa-saude', 'Suporte ósseo e controle de sintomas.', '🧘‍♀️', 'clinical', 'clinical', 'saude', 1500, '{"protein": 30, "carbs": 35, "fat": 35}', 'official_v2', true, '{"menopausa"}', '[]');

END $$;
