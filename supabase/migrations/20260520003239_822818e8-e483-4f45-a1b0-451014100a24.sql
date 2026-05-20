-- Limpeza total para reinstalação do catálogo Soberano V5
DELETE FROM public.v3_diet_templates;

-- 1. EMAGRECIMENTO PREMIUM (1500 - 1800 kcal)
INSERT INTO public.v3_diet_templates (
  slug, title, description, objective, template_type, 
  kcal_profiles, meal_distribution, cluster_map, plan_snapshot, 
  visual_style, active, editable, sovereign_validated
) VALUES (
  'emagrecimento-premium-v5',
  'Emagrecimento Premium - Soberano',
  'Protocolo de alta saciedade focado em densidade nutricional. Substituições 100% mapeadas para flexibilidade absoluta.',
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
              "name": "Ovo Cozido",
              "clinical_mass_g": 100,
              "kcal": 146, "kcal_100g": 146, "protein": 13.3, "protein_100g": 13.3, "carbs": 0.6, "carb_100g": 0.6, "fat": 9.5, "fat_100g": 9.5,
              "imageUrl": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/pao-frances.jpg",
              "substitutions": [
                {"name": "Frango Desfiado", "clinical_mass_g": 80, "kcal": 130, "kcal_100g": 165, "protein": 25, "protein_100g": 31, "carbs": 0, "fat": 2}
              ]
            },
            {
              "name": "Pão de Forma Integral",
              "clinical_mass_g": 50,
              "kcal": 123, "kcal_100g": 247, "protein": 4.7, "protein_100g": 9.4, "carbs": 21.5, "carb_100g": 43, "fat": 1.8, "fat_100g": 3.7,
              "imageUrl": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/torrada-integral%2Ftorrada-integral.jpg",
              "substitutions": [
                {"name": "Tapioca (Goma)", "clinical_mass_g": 40, "kcal": 120, "kcal_100g": 300, "protein": 0, "carbs": 30, "fat": 0}
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
              "kcal": 86, "kcal_100g": 51, "protein": 7, "protein_100g": 4.1, "carbs": 9, "carb_100g": 5.3, "fat": 2.5, "fat_100g": 1.5,
              "imageUrl": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/kefir.jpg",
              "substitutions": []
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
              "kcal": 128, "kcal_100g": 128, "protein": 2.5, "protein_100g": 2.5, "carbs": 28, "carb_100g": 28, "fat": 0.2, "fat_100g": 0.2,
              "imageUrl": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/arroz-com-frango.png",
              "substitutions": [
                {"name": "Batata Doce Cozida", "clinical_mass_g": 150, "kcal": 129, "kcal_100g": 86, "protein": 2.4, "carbs": 30, "fat": 0.1}
              ]
            },
            {
              "name": "Feijão Carioca Cozido",
              "clinical_mass_g": 100,
              "kcal": 76, "kcal_100g": 76, "protein": 4.8, "protein_100g": 4.8, "carbs": 13.6, "carb_100g": 13.6, "fat": 0.5, "fat_100g": 0.5,
              "imageUrl": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/feijao-carioca.jpg",
              "substitutions": []
            },
            {
              "name": "Frango Peito Grelhado",
              "clinical_mass_g": 120,
              "kcal": 198, "kcal_100g": 165, "protein": 38.4, "protein_100g": 32, "carbs": 0, "carb_100g": 0, "fat": 3, "fat_100g": 2.5,
              "imageUrl": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/arroz-feijao-frango.png",
              "substitutions": [
                {"name": "Filé de Tilápia", "clinical_mass_g": 150, "kcal": 192, "kcal_100g": 128, "protein": 39, "protein_100g": 26, "carbs": 0, "fat": 4}
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
              "kcal": 98, "kcal_100g": 98, "protein": 1.3, "protein_100g": 1.3, "carbs": 26, "carb_100g": 26, "fat": 0.1, "fat_100g": 0.1,
              "imageUrl": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/banana-com-aveia.jpg",
              "substitutions": []
            }
          ]
        },
        {
          "name": "Jantar",
          "time": "19:30",
          "items": [
            {
              "name": "Carne Bov. Patinho Grelhado",
              "clinical_mass_g": 120,
              "kcal": 262, "kcal_100g": 219, "protein": 43, "protein_100g": 35.9, "carbs": 0, "carb_100g": 0, "fat": 8.7, "fat_100g": 7.3,
              "imageUrl": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/acem/acem.jpg",
              "substitutions": []
            },
            {
              "name": "Salada de Folhas Verdes",
              "clinical_mass_g": 100,
              "kcal": 15, "kcal_100g": 15, "protein": 1.3, "protein_100g": 1.3, "carbs": 2.9, "carb_100g": 2.9, "fat": 0.2, "fat_100g": 0.2,
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
              "clinical_mass_g": 60,
              "kcal": 58, "kcal_100g": 96, "protein": 0.7, "protein_100g": 1.2, "carbs": 3.6, "carb_100g": 6, "fat": 5, "fat_100g": 8.4,
              "imageUrl": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/abacate.jpg",
              "substitutions": []
            }
          ]
        }
      ]
    }
  }',
  'premium', true, true, true
);

-- 2. HIPERTROFIA SOVEREIGN (2500 - 3000 kcal)
INSERT INTO public.v3_diet_templates (
  slug, title, description, objective, template_type, 
  kcal_profiles, meal_distribution, cluster_map, plan_snapshot, 
  visual_style, active, editable, sovereign_validated
) VALUES (
  'hipertrofia-sovereign-v5',
  'Hipertrofia Sovereign - Alta Performance',
  'Protocolo denso com foco em superávit calórico e alta biodisponibilidade proteica.',
  'hipertrofia',
  'visual_v3',
  '[2500, 2800]',
  '[
    {"slot": "Café da Manhã", "time": "08:00"},
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
              "name": "Ovo de Galinha Cozido",
              "clinical_mass_g": 200,
              "kcal": 292, "kcal_100g": 146, "protein": 26.6, "protein_100g": 13.3, "carbs": 1.2, "carb_100g": 0.6, "fat": 19, "fat_100g": 9.5,
              "imageUrl": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/pao-frances.jpg",
              "substitutions": []
            },
            {
              "name": "Pão Francês",
              "clinical_mass_g": 100,
              "kcal": 300, "kcal_100g": 300, "protein": 9, "protein_100g": 9, "carbs": 58, "carb_100g": 58, "fat": 3, "fat_100g": 3,
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
              "name": "Arroz Branco Cozido",
              "clinical_mass_g": 250,
              "kcal": 320, "kcal_100g": 128, "protein": 6.2, "protein_100g": 2.5, "carbs": 70, "carb_100g": 28, "fat": 0.5, "fat_100g": 0.2,
              "imageUrl": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/arroz-com-frango.png",
              "substitutions": []
            },
            {
              "name": "Feijão Carioca Cozido",
              "clinical_mass_g": 150,
              "kcal": 114, "kcal_100g": 76, "protein": 7.2, "protein_100g": 4.8, "carbs": 20.4, "carb_100g": 13.6, "fat": 0.7, "fat_100g": 0.5,
              "imageUrl": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/feijao-carioca.jpg",
              "substitutions": []
            },
            {
              "name": "Carne Bov. Patinho Grelhado",
              "clinical_mass_g": 180,
              "kcal": 394, "kcal_100g": 219, "protein": 64.6, "protein_100g": 35.9, "carbs": 0, "carb_100g": 0, "fat": 13.1, "fat_100g": 7.3,
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
