-- Atualização do Template Tradicional Brasileiro Soberano
UPDATE v3_diet_templates 
SET plan_snapshot = '{
  "1800": {
    "meals": [
      {
        "name": "Café da Manhã",
        "time": "08:00",
        "day_of_week": 1,
        "items": [
          {
            "name": "Pão Francês",
            "quantity": 1,
            "clinical_mass_g": 50,
            "kcal": 150,
            "protein": 4.5,
            "carbs": 28,
            "fat": 1.5,
            "measurementType": "unit",
            "substitutions": [
              {"name": "Cuscuz Nordestino", "kcal": 150, "protein": 3.5, "carbs": 32, "fat": 1, "clinical_mass_g": 100},
              {"name": "Tapioca com Queijo", "kcal": 150, "protein": 6, "carbs": 22, "fat": 4, "clinical_mass_g": 60},
              {"name": "Pão de Queijo (3 unid)", "kcal": 150, "protein": 4, "carbs": 18, "fat": 7, "clinical_mass_g": 45}
            ]
          },
          {
            "name": "Ovo Mexido",
            "quantity": 2,
            "clinical_mass_g": 100,
            "kcal": 140,
            "protein": 12,
            "carbs": 1,
            "fat": 10,
            "measurementType": "unit",
            "substitutions": [
              {"name": "Frango Desfiado", "kcal": 140, "protein": 28, "carbs": 0, "fat": 3, "clinical_mass_g": 80},
              {"name": "Queijo Branco", "kcal": 140, "protein": 10, "carbs": 2, "fat": 10, "clinical_mass_g": 50}
            ]
          }
        ]
      },
      {
        "name": "Almoço",
        "time": "13:00",
        "day_of_week": 1,
        "items": [
          {
            "name": "Arroz Branco",
            "quantity": 120,
            "clinical_mass_g": 120,
            "kcal": 156,
            "protein": 3,
            "carbs": 34,
            "fat": 0.3,
            "measurementType": "gram",
            "substitutions": [
              {"name": "Macarrão", "kcal": 156, "protein": 5, "carbs": 32, "fat": 1, "clinical_mass_g": 100},
              {"name": "Batata Doce", "kcal": 156, "protein": 2, "carbs": 36, "fat": 0.2, "clinical_mass_g": 180},
              {"name": "Mandioca Cozida", "kcal": 156, "protein": 1, "carbs": 38, "fat": 0.3, "clinical_mass_g": 120}
            ]
          },
          {
            "name": "Feijão Carioca",
            "quantity": 100,
            "clinical_mass_g": 100,
            "kcal": 76,
            "protein": 5,
            "carbs": 14,
            "fat": 0.5,
            "measurementType": "gram",
            "substitutions": [
              {"name": "Lentilha", "kcal": 76, "protein": 6, "carbs": 13, "fat": 0.4, "clinical_mass_g": 80},
              {"name": "Grão de Bico", "kcal": 76, "protein": 4, "carbs": 15, "fat": 1.5, "clinical_mass_g": 50}
            ]
          },
          {
            "name": "Peito de Frango Grelhado",
            "quantity": 120,
            "clinical_mass_g": 120,
            "kcal": 192,
            "protein": 36,
            "carbs": 0,
            "fat": 4,
            "measurementType": "gram",
            "substitutions": [
              {"name": "Tilápia Grelhada", "kcal": 192, "protein": 38, "carbs": 0, "fat": 3, "clinical_mass_g": 150},
              {"name": "Patinho Grelhado", "kcal": 192, "protein": 30, "carbs": 0, "fat": 7, "clinical_mass_g": 100},
              {"name": "Omelete (3 ovos)", "kcal": 210, "protein": 18, "carbs": 2, "fat": 15, "clinical_mass_g": 150}
            ]
          }
        ]
      },
      {
        "name": "Lanche da Tarde",
        "time": "16:30",
        "day_of_week": 1,
        "items": [
          {
            "name": "Banana Prata",
            "quantity": 1,
            "clinical_mass_g": 80,
            "kcal": 70,
            "protein": 1,
            "carbs": 18,
            "fat": 0.3,
            "measurementType": "unit",
            "substitutions": [
              {"name": "Maçã", "kcal": 70, "protein": 0.5, "carbs": 18, "fat": 0.2, "clinical_mass_g": 130},
              {"name": "Mamão Papaia", "kcal": 70, "protein": 1, "carbs": 17, "fat": 0.1, "clinical_mass_g": 180}
            ]
          }
        ]
      },
      {
        "name": "Jantar",
        "time": "20:00",
        "day_of_week": 1,
        "items": [
          {
            "name": "Sopa de Legumes com Frango",
            "quantity": 300,
            "clinical_mass_g": 300,
            "kcal": 250,
            "protein": 25,
            "carbs": 20,
            "fat": 8,
            "measurementType": "gram",
            "substitutions": [
              {"name": "Omelete Completa", "kcal": 250, "protein": 20, "carbs": 5, "fat": 18, "clinical_mass_g": 180},
              {"name": "Sanduíche Natural", "kcal": 250, "protein": 18, "carbs": 28, "fat": 6, "clinical_mass_g": 150}
            ]
          }
        ]
      }
    ]
  }
}'
WHERE title = 'Tradicional Brasileiro Fit' OR title = 'Tradicional Brasileiro Soberano';

-- Atualização do Template Emagrecimento Feminino para ter 7 dias
UPDATE v3_diet_templates 
SET plan_snapshot = '{
  "1600": {
    "meals": [
      {
        "name": "Café da Manhã", "time": "08:00", "day_of_week": 1,
        "items": [
          {"name": "Iogurte Natural", "quantity": 1, "clinical_mass_g": 170, "kcal": 110, "protein": 7, "carbs": 10, "fat": 4, "substitutions": [{"name": "Kefir", "kcal": 110, "clinical_mass_g": 200}]},
          {"name": "Frutas Vermelhas", "quantity": 100, "clinical_mass_g": 100, "kcal": 50, "protein": 1, "carbs": 12, "fat": 0.5, "substitutions": []}
        ]
      },
      {
        "name": "Almoço", "time": "12:30", "day_of_week": 1,
        "items": [
          {"name": "Salada Verde", "quantity": 100, "clinical_mass_g": 100, "kcal": 20, "protein": 1, "carbs": 4, "fat": 0, "substitutions": []},
          {"name": "Frango Grelhado", "quantity": 100, "clinical_mass_g": 100, "kcal": 160, "protein": 30, "carbs": 0, "fat": 4, "substitutions": [{"name": "Peixe Branco", "kcal": 160, "clinical_mass_g": 140}]}
        ]
      },
      {
        "name": "Café da Manhã", "time": "08:00", "day_of_week": 2,
        "items": [
          {"name": "Ovo Cozido", "quantity": 2, "clinical_mass_g": 100, "kcal": 140, "protein": 12, "carbs": 1, "fat": 10, "substitutions": []},
          {"name": "Abacate", "quantity": 50, "clinical_mass_g": 50, "kcal": 80, "protein": 1, "carbs": 4, "fat": 7, "substitutions": []}
        ]
      },
      {
        "name": "Almoço", "time": "12:30", "day_of_week": 2,
        "items": [
          {"name": "Carne Moída", "quantity": 100, "clinical_mass_g": 100, "kcal": 200, "protein": 28, "carbs": 0, "fat": 9, "substitutions": []},
          {"name": "Brócolis", "quantity": 150, "clinical_mass_g": 150, "kcal": 50, "protein": 4, "carbs": 10, "fat": 0.5, "substitutions": []}
        ]
      }
    ]
  }
}'
WHERE title LIKE '%Emagrecimento Feminino%';
