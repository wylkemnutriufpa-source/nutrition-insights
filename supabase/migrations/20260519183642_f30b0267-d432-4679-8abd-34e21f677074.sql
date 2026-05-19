UPDATE diet_templates 
SET meals = '[
  {
    "tipo_refeicao": "Café da Manhã",
    "blocks": [
      {
        "label": "Base",
        "options": [
          {
            "name": "Ovos com Cúrcuma e Pão Integral",
            "portion": "2 ovos + 2 fatias",
            "calories": 350,
            "protein": 22,
            "carbs": 25,
            "fat": 15,
            "visual_library_item_id": "b34159c8-0c20-4cc9-87a0-323f2fd45cdc"
          }
        ]
      }
    ]
  },
  {
    "tipo_refeicao": "Lanche da Manhã",
    "blocks": [
      {
        "label": "Base",
        "options": [
          {
            "name": "Iogurte Natural com Frutas Vermelhas",
            "portion": "1 pote + 1/2 xícara",
            "calories": 180,
            "protein": 12,
            "carbs": 18,
            "fat": 6,
            "visual_library_item_id": "121e4d4d-d71b-490d-96ec-634ec0413c46"
          }
        ]
      }
    ]
  },
  {
    "tipo_refeicao": "Almoço",
    "blocks": [
      {
        "label": "Base",
        "options": [
          {
            "name": "Filé de Tilápia com Batata Doce",
            "portion": "150g peixe + 100g batata",
            "calories": 450,
            "protein": 35,
            "carbs": 35,
            "fat": 12,
            "visual_library_item_id": "71439f50-ef65-49e7-a7b2-a1f63f9a8d74"
          }
        ]
      }
    ]
  },
  {
    "tipo_refeicao": "Lanche da Tarde",
    "blocks": [
      {
        "label": "Base",
        "options": [
          {
            "name": "Mix de Castanhas e Nozes",
            "portion": "30g",
            "calories": 200,
            "protein": 5,
            "carbs": 6,
            "fat": 18,
            "visual_library_item_id": "59623215-5007-45d6-8825-2646fb2c8315"
          }
        ]
      }
    ]
  },
  {
    "tipo_refeicao": "Jantar",
    "blocks": [
      {
        "label": "Base",
        "options": [
          {
            "name": "Frango com Gengibre e Brócolis",
            "portion": "150g frango + vegetais à vontade",
            "calories": 400,
            "protein": 40,
            "carbs": 15,
            "fat": 15,
            "visual_library_item_id": "b2306645-dc89-4c48-82c1-34357c12d8b9"
          }
        ]
      }
    ]
  },
  {
    "tipo_refeicao": "Ceia",
    "blocks": [
      {
        "label": "Base",
        "options": [
          {
            "name": "Abacate com Farelo de Aveia",
            "portion": "100g abacate + 1 colher aveia",
            "calories": 220,
            "protein": 6,
            "carbs": 12,
            "fat": 18,
            "visual_library_item_id": "9502033c-ff6f-4815-814c-c8e484feae94"
          }
        ]
      }
    ]
  }
]'::jsonb,
template_generation = 'official_v2'
WHERE name = 'Anti-inflamatória';