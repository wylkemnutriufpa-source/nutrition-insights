-- Trigger para manter image_url sincronizado com visual_library_item_id
CREATE OR REPLACE FUNCTION public.sync_meal_item_image()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.visual_library_item_id IS NOT NULL AND (OLD.visual_library_item_id IS NULL OR NEW.visual_library_item_id <> OLD.visual_library_item_id) THEN
    SELECT image_url INTO NEW.image_url 
    FROM public.meal_visual_library 
    WHERE id = NEW.visual_library_item_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_meal_item_visual_update ON public.meal_plan_items;
CREATE TRIGGER on_meal_item_visual_update
BEFORE INSERT OR UPDATE ON public.meal_plan_items
FOR EACH ROW EXECUTE FUNCTION public.sync_meal_item_image();

-- Update Hipertrofia Masculina 2200
UPDATE diet_templates 
SET meals = '[
  {
    "tipo_refeicao": "Café da Manhã",
    "blocks": [{ "label": "Base", "options": [{ "name": "Ovos Mexidos (3 un) + 2 fatias Pão Integral", "portion": "3 ovos + 2 pães", "calories": 400, "protein": 28, "carbs": 25, "fat": 18, "visual_library_item_id": "b34159c8-0c20-4cc9-87a0-323f2fd45cdc" }] }]
  },
  {
    "tipo_refeicao": "Lanche da Manhã",
    "blocks": [{ "label": "Base", "options": [{ "name": "Iogurte Proteico + 1 Banana", "portion": "1 pote + 1 unidade", "calories": 200, "protein": 15, "carbs": 30, "fat": 2, "visual_library_item_id": "1e4eca44-1abf-4042-bceb-654316a3ec02" }] }]
  },
  {
    "tipo_refeicao": "Almoço",
    "blocks": [{ "label": "Base", "options": [{ "name": "Arroz Integral (150g) + Feijão (100g) + Patinho Moído (120g)", "portion": "Prato Completo", "calories": 600, "protein": 45, "carbs": 70, "fat": 12, "visual_library_item_id": "bcc42c93-a952-489c-9ed4-c52d13fc7bca" }] }]
  },
  {
    "tipo_refeicao": "Lanche da Tarde",
    "blocks": [{ "label": "Base", "options": [{ "name": "Sanduíche de Frango Desfiado", "portion": "2 fatias pão + 100g frango", "calories": 350, "protein": 30, "carbs": 30, "fat": 8, "visual_library_item_id": "pao-com-frango-desfiado" }] }]
  },
  {
    "tipo_refeicao": "Jantar",
    "blocks": [{ "label": "Base", "options": [{ "name": "Macarrão Integral (120g) + Filé de Frango (120g)", "portion": "Prato Completo", "calories": 550, "protein": 40, "carbs": 60, "fat": 10, "visual_library_item_id": "arroz-com-frango" }] }]
  },
  {
    "tipo_refeicao": "Ceia",
    "blocks": [{ "label": "Base", "options": [{ "name": "Mingau de Aveia com Whey", "portion": "1 scoop whey + 40g aveia", "calories": 250, "protein": 25, "carbs": 25, "fat": 5, "visual_library_item_id": "06a884bc-6041-4eac-aebd-a9b33a8af5bb" }] }]
  }
]'::jsonb
WHERE name = 'Hipertrofia Masculina - 2200 kcal';

-- Update Hipertrofia Feminina 2000
UPDATE diet_templates 
SET meals = '[
  {
    "tipo_refeicao": "Café da Manhã",
    "blocks": [{ "label": "Base", "options": [{ "name": "Crepioca (2 ovos + 2 col. goma) + Queijo Branco", "portion": "1 unidade", "calories": 350, "protein": 22, "carbs": 25, "fat": 18, "visual_library_item_id": "tapioca-com-queijo" }] }]
  },
  {
    "tipo_refeicao": "Lanche da Manhã",
    "blocks": [{ "label": "Base", "options": [{ "name": "Salada de Frutas com Granola", "portion": "1 xícara + 2 colheres", "calories": 200, "protein": 5, "carbs": 35, "fat": 4, "visual_library_item_id": "804477bb-85f0-46a7-aa65-1d58ea916855" }] }]
  },
  {
    "tipo_refeicao": "Almoço",
    "blocks": [{ "label": "Base", "options": [{ "name": "Filé de Frango (120g) + Batata Doce (150g) + Brócolis", "portion": "Prato Completo", "calories": 500, "protein": 35, "carbs": 45, "fat": 12, "visual_library_item_id": "arroz-feijao-frango" }] }]
  },
  {
    "tipo_refeicao": "Lanche da Tarde",
    "blocks": [{ "label": "Base", "options": [{ "name": "Iogurte Natural com Castanhas", "portion": "1 pote + 4 unidades", "calories": 250, "protein": 12, "carbs": 15, "fat": 15, "visual_library_item_id": "9502033c-ff6f-4815-814c-c8e484feae94" }] }]
  },
  {
    "tipo_refeicao": "Jantar",
    "blocks": [{ "label": "Base", "options": [{ "name": "Filé de Tilápia (120g) + Arroz (80g) + Salada Verde", "portion": "Prato Completo", "calories": 450, "protein": 30, "carbs": 30, "fat": 15, "visual_library_item_id": "71439f50-ef65-49e7-a7b2-a1f63f9a8d74" }] }]
  },
  {
    "tipo_refeicao": "Ceia",
    "blocks": [{ "label": "Base", "options": [{ "name": "Abacate (100g)", "portion": "1/4 unidade", "calories": 200, "protein": 2, "carbs": 8, "fat": 18, "visual_library_item_id": "abacate" }] }]
  }
]'::jsonb
WHERE name = 'Hipertrofia Feminina - 2000 kcal';