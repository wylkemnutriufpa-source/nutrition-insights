-- Update Emagrecimento Feminino 1400
UPDATE diet_templates 
SET meals = '[
  {
    "tipo_refeicao": "Café da Manhã",
    "blocks": [{ "label": "Base", "options": [{ "name": "1 Ovo Cozido + 1 Fatia de Pão Integral", "portion": "1 unidade + 1 fatia", "calories": 180, "protein": 12, "carbs": 15, "fat": 8, "visual_library_item_id": "b34159c8-0c20-4cc9-87a0-323f2fd45cdc" }] }]
  },
  {
    "tipo_refeicao": "Lanche da Manhã",
    "blocks": [{ "label": "Base", "options": [{ "name": "1 Maçã ou 1 Pera", "portion": "1 unidade", "calories": 80, "protein": 0, "carbs": 20, "fat": 0, "visual_library_item_id": "b6cc8684-203b-46af-9711-104e0ca52a29" }] }]
  },
  {
    "tipo_refeicao": "Almoço",
    "blocks": [{ "label": "Base", "options": [{ "name": "Filé de Frango Grelhado (100g) + Salada à Vontade + 2 col. Arroz", "portion": "Prato Leve", "calories": 350, "protein": 30, "carbs": 30, "fat": 10, "visual_library_item_id": "arroz-com-frango" }] }]
  },
  {
    "tipo_refeicao": "Lanche da Tarde",
    "blocks": [{ "label": "Base", "options": [{ "name": "Iogurte Natural Desnatado", "portion": "1 pote", "calories": 100, "protein": 8, "carbs": 10, "fat": 2, "visual_library_item_id": "9502033c-ff6f-4815-814c-c8e484feae94" }] }]
  },
  {
    "tipo_refeicao": "Jantar",
    "blocks": [{ "label": "Base", "options": [{ "name": "Omelete de 2 Ovos com Espinafre", "portion": "2 ovos", "calories": 300, "protein": 18, "carbs": 5, "fat": 22, "visual_library_item_id": "farofa-de-ovo-com-cafe/farofa-de-ovo-com-cafe.jpg" }] }]
  },
  {
    "tipo_refeicao": "Ceia",
    "blocks": [{ "label": "Base", "options": [{ "name": "Chá de Camomila + 2 Castanhas", "portion": "1 xícara + 2 un", "calories": 90, "protein": 2, "carbs": 2, "fat": 8, "visual_library_item_id": "59623215-5007-45d6-8825-2646fb2c8315" }] }]
  }
]'::jsonb
WHERE name = 'Emagrecimento Feminino - 1400 kcal';

-- Update Emagrecimento Masculino 2000
UPDATE diet_templates 
SET meals = '[
  {
    "tipo_refeicao": "Café da Manhã",
    "blocks": [{ "label": "Base", "options": [{ "name": "3 Ovos Mexidos + 2 fatias Pão Integral", "portion": "3 ovos + 2 pães", "calories": 400, "protein": 28, "carbs": 25, "fat": 18, "visual_library_item_id": "b34159c8-0c20-4cc9-87a0-323f2fd45cdc" }] }]
  },
  {
    "tipo_refeicao": "Lanche da Manhã",
    "blocks": [{ "label": "Base", "options": [{ "name": "1 Banana com Aveia", "portion": "1 un + 1 colher", "calories": 150, "protein": 3, "carbs": 30, "fat": 2, "visual_library_item_id": "fe027a7c-6ecb-4d5f-8477-825b03ae4d38" }] }]
  },
  {
    "tipo_refeicao": "Almoço",
    "blocks": [{ "label": "Base", "options": [{ "name": "Carne Moída (150g) + Arroz (100g) + Feijão (80g) + Salada", "portion": "Prato Completo", "calories": 600, "protein": 40, "carbs": 60, "fat": 15, "visual_library_item_id": "bcc42c93-a952-489c-9ed4-c52d13fc7bca" }] }]
  },
  {
    "tipo_refeicao": "Lanche da Tarde",
    "blocks": [{ "label": "Base", "options": [{ "name": "Sanduíche de Atum ou Frango", "portion": "2 fatias pão + proteína", "calories": 350, "protein": 25, "carbs": 30, "fat": 8, "visual_library_item_id": "pao-com-frango-desfiado" }] }]
  },
  {
    "tipo_refeicao": "Jantar",
    "blocks": [{ "label": "Base", "options": [{ "name": "Frango Grelhado (150g) + Batata Doce (100g) + Brócolis", "portion": "Prato Completo", "calories": 450, "protein": 40, "carbs": 30, "fat": 10, "visual_library_item_id": "arroz-feijao-frango" }] }]
  },
  {
    "tipo_refeicao": "Ceia",
    "blocks": [{ "label": "Base", "options": [{ "name": "Iogurte Natural", "portion": "1 pote", "calories": 100, "protein": 8, "carbs": 10, "fat": 2, "visual_library_item_id": "9502033c-ff6f-4815-814c-c8e484feae94" }] }]
  }
]'::jsonb
WHERE name = 'Emagrecimento Masculino - 2000 kcal';