-- Atualizar template de Hipertrofia para incluir Ceia e refinamento de itens
UPDATE public.v3_diet_templates
SET plan_snapshot = '{
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
        },
        {
          "name": "Jantar",
          "time": "20:00",
          "items": [
            {
              "name": "Macarrão Integral Cozido",
              "clinical_mass_g": 200,
              "kcal": 248, "kcal_100g": 124, "protein": 10.6, "protein_100g": 5.3, "carbs": 52, "carb_100g": 26, "fat": 1, "fat_100g": 0.5,
              "imageUrl": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/arroz-feijao-frango.png",
              "substitutions": []
            },
            {
              "name": "Peito de Frango Grelhado",
              "clinical_mass_g": 150,
              "kcal": 248, "kcal_100g": 165, "protein": 48, "protein_100g": 32, "carbs": 0, "carb_100g": 0, "fat": 3.8, "fat_100g": 2.5,
              "imageUrl": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/arroz-feijao-frango.png",
              "substitutions": []
            }
          ]
        },
        {
          "name": "Ceia",
          "time": "22:30",
          "items": [
            {
              "name": "Pasta de Amendoim",
              "clinical_mass_g": 30,
              "kcal": 176, "kcal_100g": 588, "protein": 7.5, "protein_100g": 25, "carbs": 6, "carb_100g": 20, "fat": 15, "fat_100g": 50,
              "imageUrl": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/castanhas.jpg",
              "substitutions": []
            }
          ]
        }
      ]
    }
  }'
WHERE slug = 'hipertrofia-sovereign-v5';
