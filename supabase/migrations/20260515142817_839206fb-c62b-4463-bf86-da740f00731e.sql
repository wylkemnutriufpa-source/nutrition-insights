-- Clear existing mock-like templates if needed (optional, but let's just add the new ones)
-- We will use UPSERT logic if possible, but since we are in a migration, we just insert.

INSERT INTO public.v3_diet_templates (slug, title, description, template_type, objective, meal_distribution, cluster_map, kcal_profiles, visual_style, substitutions_enabled, editable, active)
VALUES 
('hipertrofia_premium', 'Hipertrofia Premium', 'Foco em ganho de massa muscular com alta densidade nutricional.', 'visual_v3', 'hipertrofia', 
'[{"slot": "breakfast", "time": "08:00"}, {"slot": "lunch", "time": "12:30"}, {"slot": "snack", "time": "16:00"}, {"slot": "dinner", "time": "19:30"}, {"slot": "supper", "time": "22:00"}]',
'{"breakfast": "cafe_proteico", "lunch": "almoco_tradicional", "snack": "lanche_proteico", "dinner": "almoco_tradicional", "supper": "lanche_leve"}',
'[1200, 1400, 1600, 1800, 2200]', 'premium', true, true, true),

('emagrecimento_acelerado', 'Emagrecimento Acelerado', 'Estratégia para perda de peso com foco em saciedade.', 'visual_v3', 'emagrecimento', 
'[{"slot": "breakfast", "time": "08:00"}, {"slot": "lunch", "time": "12:30"}, {"slot": "snack", "time": "16:30"}, {"slot": "dinner", "time": "20:00"}]',
'{"breakfast": "cafe_tradicional", "lunch": "almoco_tradicional", "snack": "lanche_leve", "dinner": "jantar_leve"}',
'[1200, 1400, 1600, 1800, 2200]', 'premium', true, true, true),

('low_carb_elite', 'Low Carb Elite', 'Redução estratégica de carboidratos para flexibilidade metabólica.', 'visual_v3', 'emagrecimento', 
'[{"slot": "breakfast", "time": "08:30"}, {"slot": "lunch", "time": "13:00"}, {"slot": "snack", "time": "17:00"}, {"slot": "dinner", "time": "20:30"}]',
'{"breakfast": "cafe_proteico", "lunch": "almoco_tradicional", "snack": "lanche_proteico", "dinner": "jantar_lowcarb"}',
'[1200, 1400, 1600, 1800, 2200]', 'premium', true, true, true),

('cetogenica_pro', 'Cetogênica Pro', 'Indução de cetose com alto teor de gorduras saudáveis.', 'visual_v3', 'emagrecimento', 
'[{"slot": "breakfast", "time": "09:00"}, {"slot": "lunch", "time": "13:00"}, {"slot": "snack", "time": "17:00"}, {"slot": "dinner", "time": "21:00"}]',
'{"breakfast": "cafe_proteico", "lunch": "almoco_tradicional", "snack": "lanche_proteico", "dinner": "jantar_lowcarb"}',
'[1200, 1400, 1600, 1800, 2200]', 'premium', true, true, true),

('mediterranea_v3', 'Mediterrânea V3', 'O padrão ouro da saúde cardiovascular e longevidade.', 'visual_v3', 'saude', 
'[{"slot": "breakfast", "time": "08:00"}, {"slot": "lunch", "time": "12:30"}, {"slot": "snack", "time": "16:00"}, {"slot": "dinner", "time": "19:30"}]',
'{"breakfast": "cafe_tradicional", "lunch": "almoco_tradicional", "snack": "lanche_leve", "dinner": "jantar_leve"}',
'[1200, 1400, 1600, 1800, 2200]', 'premium', true, true, true),

('anti_inflamatoria', 'Anti-inflamatória', 'Foco em fitoquímicos e redução de processos inflamatórios.', 'visual_v3', 'saude', 
'[{"slot": "breakfast", "time": "08:00"}, {"slot": "lunch", "time": "12:30"}, {"slot": "snack", "time": "16:00"}, {"slot": "dinner", "time": "19:30"}]',
'{"breakfast": "cafe_tradicional", "lunch": "almoco_tradicional", "snack": "lanche_leve", "dinner": "jantar_leve"}',
'[1200, 1400, 1600, 1800, 2200]', 'premium', true, true, true),

('reeducacao_alimentar', 'Reeducação Alimentar', 'Equilíbrio e sustentabilidade para novos hábitos.', 'visual_v3', 'saude', 
'[{"slot": "breakfast", "time": "08:00"}, {"slot": "lunch", "time": "12:30"}, {"slot": "snack", "time": "16:00"}, {"slot": "dinner", "time": "19:30"}]',
'{"breakfast": "cafe_tradicional", "lunch": "almoco_tradicional", "snack": "lanche_leve", "dinner": "jantar_leve"}',
'[1200, 1400, 1600, 1800, 2200]', 'premium', true, true, true),

('diabetes_control', 'Diabetes Control', 'Controle glicêmico rigoroso com baixo índice glicêmico.', 'visual_v3', 'saude', 
'[{"slot": "breakfast", "time": "08:00"}, {"slot": "lunch", "time": "12:30"}, {"slot": "snack", "time": "16:00"}, {"slot": "dinner", "time": "19:30"}]',
'{"breakfast": "cafe_tradicional", "lunch": "almoco_tradicional", "snack": "lanche_leve", "dinner": "jantar_leve"}',
'[1200, 1400, 1600, 1800, 2200]', 'premium', true, true, true),

('hipertensao_care', 'Hipertensão Care', 'Baixo sódio e rico em potássio para controle pressórico.', 'visual_v3', 'saude', 
'[{"slot": "breakfast", "time": "08:00"}, {"slot": "lunch", "time": "12:30"}, {"slot": "snack", "time": "16:00"}, {"slot": "dinner", "time": "19:30"}]',
'{"breakfast": "cafe_tradicional", "lunch": "almoco_tradicional", "snack": "lanche_leve", "dinner": "jantar_leve"}',
'[1200, 1400, 1600, 1800, 2200]', 'premium', true, true, true),

('massa_magra_feminina', 'Massa Magra Feminina', 'Ajuste hormonal e ganho de massa para o público feminino.', 'visual_v3', 'hipertrofia', 
'[{"slot": "breakfast", "time": "08:00"}, {"slot": "lunch", "time": "12:30"}, {"slot": "snack", "time": "16:30"}, {"slot": "dinner", "time": "20:00"}]',
'{"breakfast": "cafe_proteico", "lunch": "almoco_tradicional", "snack": "lanche_proteico", "dinner": "almoco_tradicional"}',
'[1200, 1400, 1600, 1800, 2200]', 'premium', true, true, true),

('performance_esportiva_v3', 'Performance Esportiva V3', 'Nutrição de precisão para atletas e praticantes de crossfit/musculação.', 'visual_v3', 'performance', 
'[{"slot": "breakfast", "time": "07:00"}, {"slot": "lunch", "time": "12:00"}, {"slot": "snack_1", "time": "15:30"}, {"slot": "snack_2", "time": "18:00"}, {"slot": "dinner", "time": "21:00"}]',
'{"breakfast": "cafe_proteico", "lunch": "almoco_tradicional", "snack_1": "lanche_proteico", "snack_2": "lanche_pratico", "dinner": "almoco_tradicional"}',
'[1200, 1400, 1600, 1800, 2200]', 'premium', true, true, true),

('vegetariana_v3', 'Vegetariana V3', 'Equilíbrio de proteínas vegetais e micronutrientes.', 'visual_v3', 'saude', 
'[{"slot": "breakfast", "time": "08:00"}, {"slot": "lunch", "time": "12:30"}, {"slot": "snack", "time": "16:00"}, {"slot": "dinner", "time": "19:30"}]',
'{"breakfast": "cafe_tradicional", "lunch": "almoco_tradicional", "snack": "lanche_leve", "dinner": "jantar_leve"}',
'[1200, 1400, 1600, 1800, 2200]', 'premium', true, true, true),

('pos_parto_nutri', 'Pós-Parto Nutri', 'Recuperação e suporte nutricional para a amamentação.', 'visual_v3', 'saude', 
'[{"slot": "breakfast", "time": "08:00"}, {"slot": "lunch", "time": "12:30"}, {"slot": "snack", "time": "16:00"}, {"slot": "dinner", "time": "19:30"}]',
'{"breakfast": "cafe_tradicional", "lunch": "almoco_tradicional", "snack": "lanche_leve", "dinner": "jantar_leve"}',
'[1200, 1400, 1600, 1800, 2200]', 'premium', true, true, true),

('menopausa_saude', 'Menopausa & Saúde', 'Suporte ósseo e metabólico para a fase da menopausa.', 'visual_v3', 'saude', 
'[{"slot": "breakfast", "time": "08:00"}, {"slot": "lunch", "time": "12:30"}, {"slot": "snack", "time": "16:00"}, {"slot": "dinner", "time": "19:30"}]',
'{"breakfast": "cafe_tradicional", "lunch": "almoco_tradicional", "snack": "lanche_leve", "dinner": "jantar_leve"}',
'[1200, 1400, 1600, 1800, 2200]', 'premium', true, true, true),

('fit_basico', 'Fit Básico', 'Simplicidade e eficácia para o dia a dia agitado.', 'visual_v3', 'saude', 
'[{"slot": "breakfast", "time": "08:00"}, {"slot": "lunch", "time": "12:30"}, {"slot": "snack", "time": "16:00"}, {"slot": "dinner", "time": "19:30"}]',
'{"breakfast": "cafe_tradicional", "lunch": "almoco_tradicional", "snack": "lanche_leve", "dinner": "jantar_leve"}',
'[1200, 1400, 1600, 1800, 2200]', 'premium', true, true, true),

('lifestyle_saudavel', 'Lifestyle Saudável', 'Foco em longevidade e bem-estar geral.', 'visual_v3', 'saude', 
'[{"slot": "breakfast", "time": "08:00"}, {"slot": "lunch", "time": "12:30"}, {"slot": "snack", "time": "16:00"}, {"slot": "dinner", "time": "19:30"}]',
'{"breakfast": "cafe_tradicional", "lunch": "almoco_tradicional", "snack": "lanche_leve", "dinner": "jantar_leve"}',
'[1200, 1400, 1600, 1800, 2200]', 'premium', true, true, true),

('definicao_muscular', 'Definição Muscular', 'Cutting estratégico para preservar massa e perder gordura.', 'visual_v3', 'emagrecimento', 
'[{"slot": "breakfast", "time": "08:00"}, {"slot": "lunch", "time": "12:30"}, {"slot": "snack", "time": "16:30"}, {"slot": "dinner", "time": "20:00"}]',
'{"breakfast": "cafe_proteico", "lunch": "almoco_tradicional", "snack": "lanche_proteico", "dinner": "almoco_tradicional"}',
'[1200, 1400, 1600, 1800, 2200]', 'premium', true, true, true),

('alta_proteina', 'Alta Proteína', 'Foco em saciedade e síntese proteica elevada.', 'visual_v3', 'hipertrofia', 
'[{"slot": "breakfast", "time": "08:00"}, {"slot": "lunch", "time": "12:30"}, {"slot": "snack", "time": "16:00"}, {"slot": "dinner", "time": "19:30"}]',
'{"breakfast": "cafe_proteico", "lunch": "almoco_tradicional", "snack": "lanche_proteico", "dinner": "almoco_tradicional"}',
'[1200, 1400, 1600, 1800, 2200]', 'premium', true, true, true),

('nutricao_clinica_leve', 'Nutrição Clínica Leve', 'Protocolo suave para recuperações e sensibilidades.', 'visual_v3', 'saude', 
'[{"slot": "breakfast", "time": "08:00"}, {"slot": "lunch", "time": "12:30"}, {"slot": "snack", "time": "16:00"}, {"slot": "dinner", "time": "19:30"}]',
'{"breakfast": "cafe_tradicional", "lunch": "almoco_tradicional", "snack": "lanche_leve", "dinner": "jantar_leve"}',
'[1200, 1400, 1600, 1800, 2200]', 'premium', true, true, true),

('plano_equilibrado', 'Plano Equilibrado Tradicional', 'O clássico brasileiro com todos os grupos alimentares.', 'visual_v3', 'saude', 
'[{"slot": "breakfast", "time": "08:00"}, {"slot": "lunch", "time": "12:30"}, {"slot": "snack", "time": "16:00"}, {"slot": "dinner", "time": "19:30"}]',
'{"breakfast": "cafe_tradicional", "lunch": "almoco_tradicional", "snack": "lanche_leve", "dinner": "jantar_leve"}',
'[1200, 1400, 1600, 1800, 2200]', 'premium', true, true, true)
ON CONFLICT (slug) DO UPDATE SET 
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  meal_distribution = EXCLUDED.meal_distribution,
  cluster_map = EXCLUDED.cluster_map,
  kcal_profiles = EXCLUDED.kcal_profiles,
  visual_style = EXCLUDED.visual_style;
