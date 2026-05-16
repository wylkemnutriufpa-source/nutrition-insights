UPDATE v3_diet_templates 
SET sovereign_validated = true,
plan_snapshot = '{
  "1600": {
    "meals": [
      {
        "name": "Café da Manhã", "time": "08:00", "day_of_week": 1,
        "items": [
          {"name": "Iogurte Natural", "kcal": 110, "protein": 7, "carbs": 10, "fat": 4, "clinical_mass_g": 170, "substitutions": [{"name": "Kefir", "kcal": 110, "clinical_mass_g": 200}]},
          {"name": "Morangos", "kcal": 40, "protein": 0.8, "carbs": 9, "fat": 0.3, "clinical_mass_g": 120, "substitutions": []}
        ]
      },
      {
        "name": "Almoço", "time": "12:30", "day_of_week": 1,
        "items": [
          {"name": "Sobrecoxa sem Pele", "kcal": 180, "protein": 28, "carbs": 0, "fat": 8, "clinical_mass_g": 120, "substitutions": [{"name": "Peixe Grelhado", "kcal": 180, "clinical_mass_g": 140}]},
          {"name": "Salada de Folhas", "kcal": 15, "protein": 1, "carbs": 3, "fat": 0, "clinical_mass_g": 100, "substitutions": []}
        ]
      },
      {
        "name": "Café da Manhã", "time": "08:00", "day_of_week": 2,
        "items": [
          {"name": "Ovo Cozido", "kcal": 140, "protein": 12, "carbs": 1, "fat": 10, "clinical_mass_g": 100, "substitutions": []},
          {"name": "Abacate", "kcal": 80, "protein": 1, "carbs": 4, "fat": 7, "clinical_mass_g": 50, "substitutions": []}
        ]
      },
      {
        "name": "Almoço", "time": "12:30", "day_of_week": 2,
        "items": [
          {"name": "Carne Moída", "kcal": 200, "protein": 28, "carbs": 0, "fat": 9, "clinical_mass_g": 100, "substitutions": []},
          {"name": "Brócolis", "kcal": 50, "protein": 4, "carbs": 10, "fat": 0.5, "clinical_mass_g": 150, "substitutions": []}
        ]
      },
      {
        "name": "Café da Manhã", "time": "08:30", "day_of_week": 3,
        "items": [
          {"name": "Omelete de Ervas", "kcal": 150, "protein": 13, "carbs": 2, "fat": 10, "clinical_mass_g": 120, "substitutions": []},
          {"name": "Melão em Cubos", "kcal": 40, "protein": 0.5, "carbs": 10, "fat": 0.2, "clinical_mass_g": 150, "substitutions": []}
        ]
      },
      {
        "name": "Almoço", "time": "13:00", "day_of_week": 3,
        "items": [
          {"name": "Atum Sólido", "kcal": 160, "protein": 34, "carbs": 0, "fat": 2, "clinical_mass_g": 120, "substitutions": []},
          {"name": "Mix de Legumes", "kcal": 60, "protein": 2, "carbs": 12, "fat": 0.4, "clinical_mass_g": 180, "substitutions": []}
        ]
      }
    ]
  }
}'
WHERE title LIKE '%Emagrecimento Feminino%';
