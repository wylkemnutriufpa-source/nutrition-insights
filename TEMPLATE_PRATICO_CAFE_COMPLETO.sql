-- ============================================================================
-- TEMPLATE PRÁTICO CAFÉ DA MANHÃ - COMPLETO COM SUBSTITUIÇÕES
-- ============================================================================
-- Este template implementa a lógica solicitada:
-- - Café: Pão/Tapioca/Cuscuz + Ovo/Queijo (6 opções)
-- - Lanches: Frutas (emagrecimento) ou Vitamina (hipertrofia)
-- - Almoço/Jantar: Proteína + Arroz/Feijão (almoço) ou sem feijão (jantar)
-- - Tudo editável com substituições
-- ============================================================================

-- 1. Inserir o template base
INSERT INTO v3_diet_templates (
  title,
  slug,
  description,
  objective,
  template_type,
  visual_style,
  active,
  sovereign_validated,
  kcal_profiles,
  family,
  nutritionist_id,
  meal_distribution,
  plan_snapshot
) VALUES (
  'Prático Café da Manhã',
  'pratico-cafe-manha',
  'Template prático com café da manhã versátil (pão/tapioca/cuscuz + ovo/queijo), lanches conforme objetivo e almoço/jantar com proteína variada',
  'custom',
  'visual_v3',
  'premium',
  true,
  true,
  ARRAY[1200, 1500, 1800, 2000, 2500],
  'practical',
  NULL,
  '[
    {"slot": "Café da Manhã", "time": "08:00"},
    {"slot": "Lanche da Manhã", "time": "10:30"},
    {"slot": "Almoço", "time": "12:30"},
    {"slot": "Lanche da Tarde", "time": "15:30"},
    {"slot": "Jantar", "time": "19:30"}
  ]'::jsonb,
  jsonb_build_object(
    '1200', jsonb_build_object(
      'days', jsonb_build_array(
        -- Segunda-feira
        jsonb_build_object(
          'day_of_week', 1,
          'meals', jsonb_build_array(
            -- Café da Manhã
            jsonb_build_object(
              'name', 'Café da Manhã',
              'items', jsonb_build_array(
                jsonb_build_object(
                  'id', 'cafe-pao-ovo-1200',
                  'title', 'Pão integral + Ovo',
                  'quantity_display', '2 fatias + 1 ovo',
                  'quantity', 150,
                  'clinical_mass_g', 150,
                  'kcal', 280,
                  'macros', jsonb_build_object('kcal', 280, 'protein_g', 12, 'carbs_g', 28, 'fat_g', 10),
                  'visual', jsonb_build_object('image_url', 'https://images.unsplash.com/photo-1541519227354-08fa5d50c44d?w=400'),
                  'is_primary', true,
                  'blockId', 'cafe-block-1',
                  'substitutions', jsonb_build_array(
                    jsonb_build_object(
                      'id', 'cafe-pao-queijo-1200',
                      'title', 'Pão integral + Queijo',
                      'quantity_display', '2 fatias + 1 fatia',
                      'quantity', 150,
                      'clinical_mass_g', 150,
                      'kcal', 290,
                      'macros', jsonb_build_object('kcal', 290, 'protein_g', 13, 'carbs_g', 28, 'fat_g', 11),
                      'visual', jsonb_build_object('image_url', 'https://images.unsplash.com/photo-1452895917121-33c76319b7fb?w=400'),
                      'is_primary', false
                    ),
                    jsonb_build_object(
                      'id', 'cafe-tapioca-ovo-1200',
                      'title', 'Tapioca + Ovo',
                      'quantity_display', '1 unidade + 1 ovo',
                      'quantity', 140,
                      'clinical_mass_g', 140,
                      'kcal', 275,
                      'macros', jsonb_build_object('kcal', 275, 'protein_g', 11, 'carbs_g', 30, 'fat_g', 9),
                      'visual', jsonb_build_object('image_url', 'https://images.unsplash.com/photo-1585238341710-4b4e6cefc688?w=400'),
                      'is_primary', false
                    ),
                    jsonb_build_object(
                      'id', 'cafe-tapioca-queijo-1200',
                      'title', 'Tapioca + Queijo',
                      'quantity_display', '1 unidade + 1 fatia',
                      'quantity', 140,
                      'clinical_mass_g', 140,
                      'kcal', 285,
                      'macros', jsonb_build_object('kcal', 285, 'protein_g', 12, 'carbs_g', 30, 'fat_g', 10),
                      'visual', jsonb_build_object('image_url', 'https://images.unsplash.com/photo-1585238341710-4b4e6cefc688?w=400'),
                      'is_primary', false
                    ),
                    jsonb_build_object(
                      'id', 'cafe-cuscuz-ovo-1200',
                      'title', 'Cuscuz + Ovo',
                      'quantity_display', '1 porção + 1 ovo',
                      'quantity', 145,
                      'clinical_mass_g', 145,
                      'kcal', 280,
                      'macros', jsonb_build_object('kcal', 280, 'protein_g', 11, 'carbs_g', 32, 'fat_g', 9),
                      'visual', jsonb_build_object('image_url', 'https://images.unsplash.com/photo-1585238341710-4b4e6cefc688?w=400'),
                      'is_primary', false
                    ),
                    jsonb_build_object(
                      'id', 'cafe-cuscuz-queijo-1200',
                      'title', 'Cuscuz + Queijo',
                      'quantity_display', '1 porção + 1 fatia',
                      'quantity', 145,
                      'clinical_mass_g', 145,
                      'kcal', 290,
                      'macros', jsonb_build_object('kcal', 290, 'protein_g', 12, 'carbs_g', 32, 'fat_g', 10),
                      'visual', jsonb_build_object('image_url', 'https://images.unsplash.com/photo-1585238341710-4b4e6cefc688?w=400'),
                      'is_primary', false
                    )
                  )
                )
              )
            ),
            -- Lanche da Manhã (Frutas para emagrecimento)
            jsonb_build_object(
              'name', 'Lanche da Manhã',
              'items', jsonb_build_array(
                jsonb_build_object(
                  'id', 'lanche-manha-frutas-1200',
                  'title', 'Maçã',
                  'quantity_display', '1 unidade',
                  'quantity', 150,
                  'clinical_mass_g', 150,
                  'kcal', 80,
                  'macros', jsonb_build_object('kcal', 80, 'protein_g', 0, 'carbs_g', 21, 'fat_g', 0),
                  'visual', jsonb_build_object('image_url', 'https://images.unsplash.com/photo-1560806674-d257a3f67b51?w=400'),
                  'is_primary', true,
                  'blockId', 'lanche-block-1',
                  'substitutions', jsonb_build_array(
                    jsonb_build_object(
                      'id', 'lanche-banana-1200',
                      'title', 'Banana',
                      'quantity_display', '1 unidade',
                      'quantity', 100,
                      'clinical_mass_g', 100,
                      'kcal', 89,
                      'macros', jsonb_build_object('kcal', 89, 'protein_g', 1, 'carbs_g', 23, 'fat_g', 0),
                      'visual', jsonb_build_object('image_url', 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400'),
                      'is_primary', false
                    ),
                    jsonb_build_object(
                      'id', 'lanche-laranja-1200',
                      'title', 'Laranja',
                      'quantity_display', '1 unidade',
                      'quantity', 150,
                      'clinical_mass_g', 150,
                      'kcal', 85,
                      'macros', jsonb_build_object('kcal', 85, 'protein_g', 1, 'carbs_g', 21, 'fat_g', 0),
                      'visual', jsonb_build_object('image_url', 'https://images.unsplash.com/photo-1599599810694-b5ac4dd64b73?w=400'),
                      'is_primary', false
                    )
                  )
                )
              )
            ),
            -- Almoço
            jsonb_build_object(
              'name', 'Almoço',
              'items', jsonb_build_array(
                jsonb_build_object(
                  'id', 'almoco-frango-arroz-feijao-1200',
                  'title', 'Frango grelhado + Arroz + Feijão',
                  'quantity_display', '120g + 4 col. + 2 col.',
                  'quantity', 300,
                  'clinical_mass_g', 300,
                  'kcal', 450,
                  'macros', jsonb_build_object('kcal', 450, 'protein_g', 35, 'carbs_g', 45, 'fat_g', 8),
                  'visual', jsonb_build_object('image_url', 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=400'),
                  'is_primary', true,
                  'blockId', 'almoco-block-1',
                  'substitutions', jsonb_build_array(
                    jsonb_build_object(
                      'id', 'almoco-peixe-arroz-feijao-1200',
                      'title', 'Peixe + Arroz + Feijão',
                      'quantity_display', '120g + 4 col. + 2 col.',
                      'quantity', 300,
                      'clinical_mass_g', 300,
                      'kcal', 440,
                      'macros', jsonb_build_object('kcal', 440, 'protein_g', 36, 'carbs_g', 45, 'fat_g', 6),
                      'visual', jsonb_build_object('image_url', 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400'),
                      'is_primary', false
                    ),
                    jsonb_build_object(
                      'id', 'almoco-carne-arroz-feijao-1200',
                      'title', 'Carne vermelha + Arroz + Feijão',
                      'quantity_display', '100g + 4 col. + 2 col.',
                      'quantity', 300,
                      'clinical_mass_g', 300,
                      'kcal', 460,
                      'macros', jsonb_build_object('kcal', 460, 'protein_g', 34, 'carbs_g', 45, 'fat_g', 10),
                      'visual', jsonb_build_object('image_url', 'https://images.unsplash.com/photo-1432139555190-58524dae6a55?w=400'),
                      'is_primary', false
                    )
                  )
                )
              )
            ),
            -- Lanche da Tarde
            jsonb_build_object(
              'name', 'Lanche da Tarde',
              'items', jsonb_build_array(
                jsonb_build_object(
                  'id', 'lanche-tarde-iogurte-1200',
                  'title', 'Iogurte natural',
                  'quantity_display', '150g',
                  'quantity', 150,
                  'clinical_mass_g', 150,
                  'kcal', 100,
                  'macros', jsonb_build_object('kcal', 100, 'protein_g', 8, 'carbs_g', 12, 'fat_g', 2),
                  'visual', jsonb_build_object('image_url', 'https://images.unsplash.com/photo-1488477181946-6428a0291840?w=400'),
                  'is_primary', true,
                  'blockId', 'lanche-tarde-block-1',
                  'substitutions', jsonb_build_array(
                    jsonb_build_object(
                      'id', 'lanche-tarde-castanhas-1200',
                      'title', 'Mix de castanhas',
                      'quantity_display', '30g',
                      'quantity', 30,
                      'clinical_mass_g', 30,
                      'kcal', 180,
                      'macros', jsonb_build_object('kcal', 180, 'protein_g', 5, 'carbs_g', 6, 'fat_g', 16),
                      'visual', jsonb_build_object('image_url', 'https://images.unsplash.com/photo-1585518419759-8b0e5c8c8b8c?w=400'),
                      'is_primary', false
                    )
                  )
                )
              )
            ),
            -- Jantar (sem feijão)
            jsonb_build_object(
              'name', 'Jantar',
              'items', jsonb_build_array(
                jsonb_build_object(
                  'id', 'jantar-frango-arroz-1200',
                  'title', 'Frango grelhado + Arroz',
                  'quantity_display', '120g + 4 col.',
                  'quantity', 250,
                  'clinical_mass_g', 250,
                  'kcal', 380,
                  'macros', jsonb_build_object('kcal', 380, 'protein_g', 35, 'carbs_g', 35, 'fat_g', 8),
                  'visual', jsonb_build_object('image_url', 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=400'),
                  'is_primary', true,
                  'blockId', 'jantar-block-1',
                  'substitutions', jsonb_build_array(
                    jsonb_build_object(
                      'id', 'jantar-peixe-arroz-1200',
                      'title', 'Peixe + Arroz',
                      'quantity_display', '120g + 4 col.',
                      'quantity', 250,
                      'clinical_mass_g', 250,
                      'kcal', 370,
                      'macros', jsonb_build_object('kcal', 370, 'protein_g', 36, 'carbs_g', 35, 'fat_g', 6),
                      'visual', jsonb_build_object('image_url', 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400'),
                      'is_primary', false
                    ),
                    jsonb_build_object(
                      'id', 'jantar-carne-arroz-1200',
                      'title', 'Carne vermelha + Arroz',
                      'quantity_display', '100g + 4 col.',
                      'quantity', 250,
                      'clinical_mass_g', 250,
                      'kcal', 390,
                      'macros', jsonb_build_object('kcal', 390, 'protein_g', 34, 'carbs_g', 35, 'fat_g', 10),
                      'visual', jsonb_build_object('image_url', 'https://images.unsplash.com/photo-1432139555190-58524dae6a55?w=400'),
                      'is_primary', false
                    )
                  )
                )
              )
            )
          )
        )
      )
    )
  )
) ON CONFLICT DO NOTHING;

-- Nota: Este é um template base para 1200 kcal
-- Para completar com outros níveis calóricos (1500, 1800, 2000, 2500),
-- execute o script TEMPLATE_PRATICO_CAFE_COMPLETO_TODOS_NIVEIS.sql
