UPDATE diet_templates 
SET meals = '[
  {
    "meal_type": "breakfast",
    "title": "Café da Manhã",
    "blocks": [
      {
        "label": "Base",
        "options": [
          {"name": "Tapioca com queijo branco", "portion": "1 unidade média", "calories": 250, "protein": 10, "carbs": 35, "fat": 8},
          {"name": "Pão integral com ovo", "portion": "2 fatias + 1 ovo", "calories": 280, "protein": 14, "carbs": 25, "fat": 12},
          {"name": "Cuscuz com ovo", "portion": "1 xícara + 1 ovo", "calories": 260, "protein": 12, "carbs": 30, "fat": 10}
        ]
      }
    ]
  },
  {
    "meal_type": "morning_snack",
    "title": "Lanche da Manhã",
    "blocks": [
      {
        "label": "Fruta/Iogurte",
        "options": [
          {"name": "Iogurte natural com aveia", "portion": "170g + 1 colher sopa", "calories": 150, "protein": 8, "carbs": 20, "fat": 4},
          {"name": "Fruta da estação", "portion": "1 porção", "calories": 80, "protein": 1, "carbs": 20, "fat": 0},
          {"name": "Mix de castanhas", "portion": "20g", "calories": 120, "protein": 3, "carbs": 4, "fat": 11}
        ]
      }
    ]
  },
  {
    "meal_type": "lunch",
    "title": "Almoço (Marmita Fixa)",
    "blocks": [
      {
        "label": "Marmita",
        "options": [
          {"name": "Marmita do dia", "portion": "1 marmita", "calories": 450, "protein": 35, "carbs": 45, "fat": 12},
          {"name": "Marmita do dia", "portion": "1 marmita", "calories": 450, "protein": 35, "carbs": 45, "fat": 12},
          {"name": "Marmita do dia", "portion": "1 marmita", "calories": 450, "protein": 35, "carbs": 45, "fat": 12},
          {"name": "Marmita do dia", "portion": "1 marmita", "calories": 450, "protein": 35, "carbs": 45, "fat": 12}
        ]
      }
    ]
  },
  {
    "meal_type": "afternoon_snack",
    "title": "Lanche da Tarde",
    "blocks": [
      {
        "label": "Proteico",
        "options": [
          {"name": "Whey protein com fruta", "portion": "1 scoop + 1 fruta", "calories": 200, "protein": 25, "carbs": 22, "fat": 2},
          {"name": "Iogurte natural", "portion": "170g", "calories": 100, "protein": 7, "carbs": 10, "fat": 4},
          {"name": "Sanduíche de frango", "portion": "1 unidade", "calories": 250, "protein": 20, "carbs": 25, "fat": 8}
        ]
      }
    ]
  },
  {
    "meal_type": "dinner",
    "title": "Jantar (Marmita Fixa)",
    "blocks": [
      {
        "label": "Marmita",
        "options": [
          {"name": "Marmita do dia", "portion": "1 marmita", "calories": 400, "protein": 30, "carbs": 40, "fat": 10},
          {"name": "Marmita do dia", "portion": "1 marmita", "calories": 400, "protein": 30, "carbs": 40, "fat": 10},
          {"name": "Marmita do dia", "portion": "1 marmita", "calories": 400, "protein": 30, "carbs": 40, "fat": 10},
          {"name": "Marmita do dia", "portion": "1 marmita", "calories": 400, "protein": 30, "carbs": 40, "fat": 10}
        ]
      }
    ]
  },
  {
    "meal_type": "evening_snack",
    "title": "Ceia",
    "blocks": [
      {
        "label": "Leve",
        "options": [
          {"name": "Chá calmante + 1 fruta leve", "portion": "200ml + 1 unidade", "calories": 60, "protein": 1, "carbs": 15, "fat": 0},
          {"name": "Leite morno", "portion": "200ml", "calories": 120, "protein": 6, "carbs": 10, "fat": 6}
        ]
      }
    ]
  }
]'::jsonb,
template_generation = 'official_v2'
WHERE name = 'Marmitas Fixas Semanais';