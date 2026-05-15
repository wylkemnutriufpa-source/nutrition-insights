DO $$
BEGIN
    -- Planos Esportivos
    INSERT INTO public.diet_templates (name, slug, description, icon, category, goal_category, diet_style, base_calories, macro_ratio, template_generation, is_active, tags, meals)
    VALUES 
    ('Crossfit - Alta Intensidade', 'crossfit-performance', 'Energia rápida e recuperação muscular.', '🏋️‍♂️', 'performance', 'performance', 'esportivo', 2800, '{"protein": 30, "carbs": 50, "fat": 20}', 'official_v2', true, '{"crossfit"}', '[]'),
    ('Corrida e Endurance', 'corrida-endurance', 'Foco em glicogênio e resistência.', '🏃', 'performance', 'performance', 'esportivo', 2500, '{"protein": 20, "carbs": 60, "fat": 20}', 'official_v2', true, '{"corrida"}', '[]'),
    ('Performance Esportiva', 'performance-esportiva', 'Otimização máxima de rendimento.', '🏅', 'performance', 'performance', 'esportivo', 3000, '{"protein": 25, "carbs": 55, "fat": 20}', 'official_v2', true, '{"performance"}', '[]');

    -- Ciclos de Vida
    INSERT INTO public.diet_templates (name, slug, description, icon, category, goal_category, diet_style, base_calories, macro_ratio, template_generation, is_active, tags, meals)
    VALUES 
    ('Gestante Saudável', 'gestante-saude', 'Nutrientes críticos para o desenvolvimento fetal.', '🤰', 'clinical', 'clinical', 'saude', 2200, '{"protein": 25, "carbs": 45, "fat": 30}', 'official_v2', true, '{"gestante"}', '[]'),
    ('Pós-Parto e Amamentação', 'pos-parto', 'Suporte à lactação e recuperação materna.', '🍼', 'clinical', 'clinical', 'saude', 2400, '{"protein": 25, "carbs": 45, "fat": 30}', 'official_v2', true, '{"pos-parto"}', '[]'),
    ('Idoso Ativo', 'idoso-ativo', 'Prevenção de sarcopenia e saúde óssea.', '👵', 'clinical', 'clinical', 'saude', 1800, '{"protein": 30, "carbs": 40, "fat": 30}', 'official_v2', true, '{"idoso"}', '[]'),
    ('Adolescente em Crescimento', 'adolescente', 'Energia para desenvolvimento e estudos.', '🎒', 'lifestyle', 'lifestyle', 'saude', 2500, '{"protein": 20, "carbs": 55, "fat": 25}', 'official_v2', true, '{"adolescente"}', '[]');

    -- Praticidade e Economia
    INSERT INTO public.diet_templates (name, slug, description, icon, category, goal_category, diet_style, base_calories, macro_ratio, template_generation, is_active, tags, meals)
    VALUES 
    ('Home Office - Baixo Gasto', 'home-office', 'Refeições leves para rotina sedentária.', '💻', 'lifestyle', 'lifestyle', 'manutencao', 1600, '{"protein": 30, "carbs": 35, "fat": 35}', 'official_v2', true, '{"homeoffice"}', '[]'),
    ('Rotina Corrida (Praticidade)', 'rotina-corrida', 'Opções rápidas e snacks inteligentes.', '⏱️', 'lifestyle', 'lifestyle', 'manutencao', 1800, '{"protein": 25, "carbs": 45, "fat": 30}', 'official_v2', true, '{"praticidade"}', '[]'),
    ('Plano Popular Econômico', 'popular-economico', 'Ovos, arroz, feijão e vegetais da estação.', '🍲', 'lifestyle', 'lifestyle', 'manutencao', 1800, '{"protein": 25, "carbs": 50, "fat": 25}', 'official_v2', true, '{"economico"}', '[]');

    -- Planos Brasileiros
    INSERT INTO public.diet_templates (name, slug, description, icon, category, goal_category, diet_style, base_calories, macro_ratio, template_generation, is_active, tags, meals)
    VALUES 
    ('Tradicional Brasileiro', 'tradicional-br', 'O clássico arroz, feijão e bife.', '🇧🇷', 'lifestyle', 'lifestyle', 'manutencao', 2000, '{"protein": 25, "carbs": 50, "fat": 25}', 'official_v2', true, '{"brasileiro"}', '[]'),
    ('Premium Brasileiro', 'premium-br', 'Cortes selecionados e ingredientes gourmet.', '✨', 'lifestyle', 'lifestyle', 'manutencao', 2200, '{"protein": 30, "carbs": 40, "fat": 30}', 'official_v2', true, '{"premium"}', '[]');

    -- Outras Categorias
    INSERT INTO public.diet_templates (name, slug, description, icon, category, goal_category, diet_style, base_calories, macro_ratio, template_generation, is_active, tags, meals)
    VALUES 
    ('Intestinal Leve (FODMAPs)', 'intestinal-leve', 'Protocolo para conforto digestivo.', '🧻', 'clinical', 'clinical', 'saude', 1700, '{"protein": 30, "carbs": 40, "fat": 30}', 'official_v2', true, '{"digestao"}', '[]'),
    ('Bariátrica (Manutenção)', 'bariatrica-manutencao', 'Alta densidade proteica e baixo volume.', '✂️', 'clinical', 'clinical', 'saude', 1200, '{"protein": 45, "carbs": 25, "fat": 30}', 'official_v2', true, '{"bariatrica"}', '[]'),
    ('Massa Magra Feminina', 'massa-magra-f', 'Hipertrofia com foco em definição.', '💪', 'hipertrofia', 'hipertrofia', 'ganho_massa', 1800, '{"protein": 35, "carbs": 35, "fat": 30}', 'official_v2', true, '{"massa-magra"}', '[]'),
    ('Definição Muscular', 'definicao-muscular', 'Perca gordura sem perder músculo.', '💎', 'emagrecimento', 'emagrecimento', 'definicao', 1800, '{"protein": 40, "carbs": 30, "fat": 30}', 'official_v2', true, '{"definicao"}', '[]');

END $$;
