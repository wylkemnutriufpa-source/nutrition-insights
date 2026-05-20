-- Limpar templates antigos e recarregar com a estrutura Soberana V5
DELETE FROM public.v3_diet_templates;

-- 1. Protocolo Emagrecimento Premium (Foco Feminino)
INSERT INTO public.v3_diet_templates (
  slug, title, description, objective, template_type, 
  kcal_profiles, meal_distribution, cluster_map, plan_snapshot, 
  visual_style, active, editable, sovereign_validated
) VALUES (
  'emagrecimento-soberano-v5',
  'Emagrecimento Feminino Premium',
  'Protocolo de alta saciedade com densidade nutricional otimizada para queima de gordura preservando massa magra.',
  'emagrecimento',
  'visual_v3',
  '[1500, 1800]',
  '[
    {"slot": "Café da Manhã", "time": "08:00"},
    {"slot": "Lanche da Manhã", "time": "10:30"},
    {"slot": "Almoço", "time": "12:30"},
    {"slot": "Lanche da Tarde", "time": "16:00"},
    {"slot": "Jantar", "time": "19:30"},
    {"slot": "Ceia", "time": "22:00"}
  ]',
  '{}',
  '{
    "1500": {
      "meals": [
        {
          "name": "Café da Manhã",
          "time": "08:00",
          "items": [
            {
              "name": "Pão de Forma Integral",
              "clinical_mass_g": 50,
              "kcal": 123,
              "protein": 4.7,
              "carbs": 21.5,
              "fat": 1.8,
              "imageUrl": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/torrada-integral/torrada-integral.jpg",
              "substitutions": [
                {"name": "Tapioca", "clinical_mass_g": 40, "kcal": 120, "protein": 0, "carbs": 30, "fat": 0},
                {"name": "Cuscuz Cozido", "clinical_mass_g": 100, "kcal": 112, "protein": 2.2, "carbs": 25, "fat": 0.2}
              ]
            },
            {
              "name": "Ovo de Galinha Cozido",
              "clinical_mass_g": 100,
              "kcal": 146,
              "protein": 13.3,
              "carbs": 0.6,
              "fat": 9.5,
              "imageUrl": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/pao-frances.jpg",
              "substitutions": [
                {"name": "Queijo Minas Frescal", "clinical_mass_g": 50, "kcal": 132, "protein": 8.7, "carbs": 1.6, "fat": 10.1},
                {"name": "Frango Desfiado", "clinical_mass_g": 80, "kcal": 130, "protein": 25, "carbs": 0, "fat": 2}
              ]
            }
          ]
        },
        {
          "name": "Lanche da Manhã",
          "time": "10:30",
          "items": [
            {
              "name": "Iogurte Natural",
              "clinical_mass_g": 170,
              "kcal": 86,
              "protein": 7,
              "carbs": 9,
              "fat": 2.5,
              "imageUrl": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/kefir.jpg",
              "substitutions": [
                {"name": "Kefir", "clinical_mass_g": 200, "kcal": 90, "protein": 6, "carbs": 8, "fat": 3}
              ]
            }
          ]
        },
        {
          "name": "Almoço",
          "time": "12:30",
          "items": [
            {
              "name": "Arroz Branco Cozido",
              "clinical_mass_g": 100,
              "kcal": 128,
              "protein": 2.5,
              "carbs": 28,
              "fat": 0.2,
              "imageUrl": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/feijao-carioca.jpg",
              "substitutions": [
                {"name": "Batata Doce Cozida", "clinical_mass_g": 150, "kcal": 129, "protein": 2.4, "carbs": 30, "fat": 0.1},
                {"name": "Macarrão Integral", "clinical_mass_g": 100, "kcal": 124, "protein": 5.3, "carbs": 26, "fat": 0.5}
              ]
            },
            {
              "name": "Feijão Carioca Cozido",
              "clinical_mass_g": 100,
              "kcal": 76,
              "protein": 4.8,
              "carbs": 13.6,
              "fat": 0.5,
              "imageUrl": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/feijao-carioca.jpg",
              "substitutions": [
                {"name": "Lentilha Cozida", "clinical_mass_g": 100, "kcal": 116, "protein": 9, "carbs": 20, "fat": 0.4},
                {"name": "Grão de Bico", "clinical_mass_g": 80, "kcal": 130, "protein": 7, "carbs": 22, "fat": 2}
              ]
            },
            {
              "name": "Peito de Frango Grelhado",
              "clinical_mass_g": 120,
              "kcal": 198,
              "protein": 38.4,
              "carbs": 0,
              "fat": 3,
              "imageUrl": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/arroz-feijao-frango.png",
              "substitutions": [
                {"name": "Filé de Tilápia", "clinical_mass_g": 150, "kcal": 192, "protein": 39, "carbs": 0, "fat": 4},
                {"name": "Patinho Moído", "clinical_mass_g": 100, "kcal": 219, "protein": 35.9, "carbs": 0, "fat": 7.3}
              ]
            }
          ]
        },
        {
          "name": "Lanche da Tarde",
          "time": "16:00",
          "items": [
            {
              "name": "Banana Prata",
              "clinical_mass_g": 100,
              "kcal": 98,
              "protein": 1.3,
              "carbs": 26,
              "fat": 0.1,
              "imageUrl": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/banana-com-aveia.jpg",
              "substitutions": [
                {"name": "Maçã Fuji", "clinical_mass_g": 150, "kcal": 84, "protein": 0.4, "carbs": 22, "fat": 0.2},
                {"name": "Mamão Papaia", "clinical_mass_g": 200, "kcal": 80, "protein": 1, "carbs": 20, "fat": 0.2}
              ]
            },
            {
              "name": "Whey Protein",
              "clinical_mass_g": 30,
              "kcal": 111,
              "protein": 24,
              "carbs": 1.5,
              "fat": 0.9,
              "imageUrl": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/whey-protein.jpg",
              "substitutions": [
                {"name": "Iogurte Grego", "clinical_mass_g": 150, "kcal": 150, "protein": 10, "carbs": 6, "fat": 9}
              ]
            }
          ]
        },
        {
          "name": "Jantar",
          "time": "19:30",
          "items": [
            {
              "name": "Patinho Moído Grelhado",
              "clinical_mass_g": 120,
              "kcal": 262,
              "protein": 43,
              "carbs": 0,
              "fat": 8.7,
              "imageUrl": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/acem/acem.jpg",
              "substitutions": [
                {"name": "Omelete (3 ovos)", "clinical_mass_g": 150, "kcal": 225, "protein": 19, "carbs": 1.5, "fat": 15}
              ]
            },
            {
              "name": "Salada de Folhas Verdes",
              "clinical_mass_g": 100,
              "kcal": 15,
              "protein": 1.3,
              "carbs": 2.9,
              "fat": 0.2,
              "imageUrl": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/salada-verde.jpg",
              "substitutions": []
            }
          ]
        },
        {
          "name": "Ceia",
          "time": "22:00",
          "items": [
            {
              "name": "Abacate",
              "clinical_mass_g": 50,
              "kcal": 48,
              "protein": 0.6,
              "carbs": 3,
              "fat": 4.2,
              "imageUrl": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/abacate.jpg",
              "substitutions": [
                {"name": "Castanha do Pará", "clinical_mass_g": 10, "kcal": 65, "protein": 1.4, "carbs": 1.2, "fat": 6.6}
              ]
            }
          ]
        }
      ]
    }
  }',
  'premium', true, true, true
);

-- 2. Protocolo Hipertrofia Masculina (Sovereign 2800 kcal)
INSERT INTO public.v3_diet_templates (
  slug, title, description, objective, template_type, 
  kcal_profiles, meal_distribution, cluster_map, plan_snapshot, 
  visual_style, active, editable, sovereign_validated
) VALUES (
  'hipertrofia-sovereign-v5',
  'Hipertrofia Masculina Sovereign',
  'Protocolo denso focado em superávit calórico controlado com alta biodisponibilidade proteica.',
  'hipertrofia',
  'visual_v3',
  '[2500, 2800, 3200]',
  '[
    {"slot": "Café da Manhã", "time": "08:00"},
    {"slot": "Lanche da Manhã", "time": "10:30"},
    {"slot": "Almoço", "time": "12:30"},
    {"slot": "Pré-Treino", "time": "15:30"},
    {"slot": "Pós-Treino", "time": "17:30"},
    {"slot": "Jantar", "time": "20:00"}
  ]',
  '{}',
  '{
    "2800": {
      "meals": [
        {
          "name": "Café da Manhã",
          "time": "08:00",
          "items": [
            {
              "name": "Ovos de Galinha (4 unidades)",
              "clinical_mass_g": 200,
              "kcal": 310,
              "protein": 26,
              "carbs": 2.2,
              "fat": 22,
              "imageUrl": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/pao-frances.jpg",
              "substitutions": []
            },
            {
              "name": "Pão Francês (2 unidades)",
              "clinical_mass_g": 100,
              "kcal": 300,
              "protein": 9,
              "carbs": 58,
              "fat": 3,
              "imageUrl": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/pao-frances.jpg",
              "substitutions": []
            }
          ]
        },
        {
          "name": "Almoço",
          "time": "12:30",
          "items": [
            {
              "name": "Arroz Branco",
              "clinical_mass_g": 250,
              "kcal": 320,
              "protein": 6,
              "carbs": 70,
              "fat": 0.5,
              "imageUrl": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/arroz-com-frango.png",
              "substitutions": []
            },
            {
              "name": "Feijão Carioca",
              "clinical_mass_g": 150,
              "kcal": 114,
              "protein": 7.2,
              "carbs": 20,
              "fat": 0.7,
              "imageUrl": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/feijao-carioca.jpg",
              "substitutions": []
            },
            {
              "name": "Carne Bov. Patinho Grelhado",
              "clinical_mass_g": 150,
              "kcal": 328,
              "protein": 54,
              "carbs": 0,
              "fat": 11,
              "imageUrl": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/acem/acem.jpg",
              "substitutions": []
            }
          ]
        }
      ]
    }
  }',
  'premium', true, true, true
);
