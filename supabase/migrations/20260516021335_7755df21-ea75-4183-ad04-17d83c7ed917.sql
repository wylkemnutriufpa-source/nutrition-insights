INSERT INTO public.v3_diet_templates (
  slug, title, description, objective, template_type, kcal_profiles, active, plan_snapshot, meal_distribution, cluster_map
) VALUES (
  'soberano-emagrecimento-feminino',
  'Emagrecimento Feminino Soberano',
  'Déficit calórico controlado com alimentos reais e alta densidade nutricional. Sem invenções matemáticas.',
  'emagrecimento',
  'visual_v3',
  '[1200, 1400, 1600]',
  true,
  '{
    "1400": {
      "meals": [
        {
          "id": "m1-ef-seg", "name": "Café da Manhã", "time": "08:00", "day_of_week": 1,
          "items": [
            { "id": "iogurte-desn", "instanceId": "iogurte-1", "name": "Iogurte Natural Desnatado", "quantity": 1, "clinical_mass_g": 170, "kcal": 60, "protein": 6, "carbs": 9, "fat": 0.5, "substitutions": [], "measurementType": "unit" },
            { "id": "morango", "instanceId": "morango-1", "name": "Morango", "quantity": 100, "clinical_mass_g": 100, "kcal": 30, "protein": 0.7, "carbs": 7, "fat": 0.3, "substitutions": [], "measurementType": "gram" },
            { "id": "aveia", "instanceId": "aveia-1", "name": "Aveia em Flocos", "quantity": 15, "clinical_mass_g": 15, "kcal": 55, "protein": 2, "carbs": 9, "fat": 1, "substitutions": [], "measurementType": "gram" }
          ]
        },
        {
          "id": "m2-ef-seg", "name": "Almoço", "time": "12:30", "day_of_week": 1,
          "items": [
            { "id": "arroz-int", "instanceId": "arroz-1", "name": "Arroz Integral", "quantity": 80, "clinical_mass_g": 80, "kcal": 100, "protein": 2, "carbs": 21, "fat": 0.8, "substitutions": [], "measurementType": "gram" },
            { "id": "feijao-ef", "instanceId": "feijao-1", "name": "Feijão Carioca", "quantity": 80, "clinical_mass_g": 80, "kcal": 60, "protein": 4, "carbs": 11, "fat": 0.4, "substitutions": [], "measurementType": "gram" },
            { "id": "peixe-ef", "instanceId": "peixe-1", "name": "Filé de Tilápia Grelhado", "quantity": 120, "clinical_mass_g": 120, "kcal": 150, "protein": 32, "carbs": 0, "fat": 2, "substitutions": [
                { "id": "frango-ef", "name": "Peito de Frango", "quantity": 100, "clinical_mass_g": 100, "kcal": 150, "protein": 30, "carbs": 0, "fat": 3 }
              ], "measurementType": "gram" },
            { "id": "folhas", "instanceId": "folhas-1", "name": "Mix de Folhas Verdes", "quantity": 100, "clinical_mass_g": 100, "kcal": 20, "protein": 1, "carbs": 4, "fat": 0, "substitutions": [], "measurementType": "gram" }
          ]
        },
        {
          "id": "m3-ef-seg", "name": "Lanche", "time": "16:00", "day_of_week": 1,
          "items": [
            { "id": "maca", "instanceId": "maca-1", "name": "Maçã Fuji", "quantity": 1, "clinical_mass_g": 120, "kcal": 60, "protein": 0.3, "carbs": 15, "fat": 0.2, "substitutions": [], "measurementType": "unit" },
            { "id": "castanhas", "instanceId": "castanhas-1", "name": "Castanha do Pará", "quantity": 3, "clinical_mass_g": 12, "kcal": 80, "protein": 2, "carbs": 1, "fat": 8, "substitutions": [], "measurementType": "unit" }
          ]
        },
        {
          "id": "m4-ef-seg", "name": "Jantar", "time": "19:30", "day_of_week": 1,
          "items": [
            { "id": "ovos-j-ef", "instanceId": "ovos-1", "name": "Ovos Cozidos", "quantity": 2, "clinical_mass_g": 100, "kcal": 140, "protein": 12, "carbs": 1, "fat": 10, "substitutions": [], "measurementType": "unit" },
            { "id": "cottage", "instanceId": "cottage-1", "name": "Queijo Cottage", "quantity": 30, "clinical_mass_g": 30, "kcal": 30, "protein": 3, "carbs": 1, "fat": 1, "substitutions": [], "measurementType": "gram" },
            { "id": "legumes-j", "instanceId": "legumes-1", "name": "Abobrinha e Cenoura no Vapor", "quantity": 150, "clinical_mass_g": 150, "kcal": 45, "protein": 2, "carbs": 9, "fat": 0.3, "substitutions": [], "measurementType": "gram" }
          ]
        }
      ]
    }
  }',
  '[{"slot": "cafe_da_manha", "time": "08:00"}, {"slot": "almoco", "time": "12:30"}, {"slot": "lanche", "time": "16:00"}, {"slot": "jantar", "time": "19:30"}]',
  '{"cafe_da_manha": "cafe_saudavel", "almoco": "almoco_fit", "lanche": "lanche_fruta", "jantar": "jantar_leve"}'
) ON CONFLICT (slug) DO UPDATE SET 
  plan_snapshot = EXCLUDED.plan_snapshot,
  active = true;

-- Copy to Day 2 for test consistency
UPDATE public.v3_diet_templates SET 
  plan_snapshot = plan_snapshot || jsonb_build_object(
    '1400', jsonb_build_object(
      'meals', (plan_snapshot->'1400'->'meals') || jsonb_build_array(
        jsonb_build_object('id', 'm1-ef-ter', 'name', 'Café da Manhã', 'time', '08:00', 'day_of_week', 2, 'items', plan_snapshot->'1400'->'meals'->0->'items'),
        jsonb_build_object('id', 'm2-ef-ter', 'name', 'Almoço', 'time', '12:30', 'day_of_week', 2, 'items', plan_snapshot->'1400'->'meals'->1->'items'),
        jsonb_build_object('id', 'm3-ef-ter', 'name', 'Lanche', 'time', '16:00', 'day_of_week', 2, 'items', plan_snapshot->'1400'->'meals'->2->'items'),
        jsonb_build_object('id', 'm4-ef-ter', 'name', 'Jantar', 'time', '19:30', 'day_of_week', 2, 'items', plan_snapshot->'1400'->'meals'->3->'items')
      )
    )
  )
WHERE slug = 'soberano-emagrecimento-feminino';
