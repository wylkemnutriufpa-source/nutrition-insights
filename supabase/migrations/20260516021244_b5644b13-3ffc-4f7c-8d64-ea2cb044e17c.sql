-- Update or Insert a Sovereign Template
INSERT INTO public.v3_diet_templates (
  slug, title, description, objective, template_type, kcal_profiles, active, plan_snapshot, meal_distribution, cluster_map
) VALUES (
  'soberano-tradicional-brasileiro',
  'Tradicional Brasileiro Soberano',
  'Plano estático validado clinicamente com Arroz, Feijão e alimentos reais. Sem geração automática.',
  'hipertrofia',
  'visual_v3',
  '[1800, 2200, 2500]',
  true,
  '{
    "1800": {
      "meals": [
        {
          "id": "m1-seg", "name": "Café da Manhã", "time": "08:00", "day_of_week": 1,
          "items": [
            { "id": "pao", "instanceId": "pao-1", "name": "Pão Francês", "quantity": 1, "clinical_mass_g": 50, "kcal": 150, "protein": 4.5, "carbs": 28, "fat": 1.5, "substitutions": [], "measurementType": "unit" },
            { "id": "ovo", "instanceId": "ovo-1", "name": "Ovo Mexido", "quantity": 2, "clinical_mass_g": 100, "kcal": 140, "protein": 12, "carbs": 1, "fat": 10, "substitutions": [], "measurementType": "unit" }
          ]
        },
        {
          "id": "m2-seg", "name": "Almoço", "time": "13:00", "day_of_week": 1,
          "items": [
            { "id": "arroz", "instanceId": "arroz-1", "name": "Arroz Branco", "quantity": 120, "clinical_mass_g": 120, "kcal": 156, "protein": 3, "carbs": 34, "fat": 0.3, "substitutions": [], "measurementType": "gram" },
            { "id": "feijao", "instanceId": "feijao-1", "name": "Feijão Carioca", "quantity": 100, "clinical_mass_g": 100, "kcal": 76, "protein": 5, "carbs": 14, "fat": 0.5, "substitutions": [], "measurementType": "gram" },
            { "id": "frango", "instanceId": "frango-1", "name": "Peito de Frango Grelhado", "quantity": 120, "clinical_mass_g": 120, "kcal": 192, "protein": 36, "carbs": 0, "fat": 4, "substitutions": [
                { "id": "tilapia", "name": "Tilápia Grelhada", "quantity": 150, "clinical_mass_g": 150, "kcal": 192, "protein": 38, "carbs": 0, "fat": 3 },
                { "id": "patinho", "name": "Patinho Grelhado", "quantity": 100, "clinical_mass_g": 100, "kcal": 192, "protein": 30, "carbs": 0, "fat": 7 }
              ], "measurementType": "gram" },
            { "id": "salada", "instanceId": "salada-1", "name": "Salada (Alface/Tomate)", "quantity": 80, "clinical_mass_g": 80, "kcal": 15, "protein": 1, "carbs": 3, "fat": 0, "substitutions": [], "measurementType": "gram" }
          ]
        },
        {
          "id": "m3-seg", "name": "Lanche", "time": "16:30", "day_of_week": 1,
          "items": [
            { "id": "fruta", "instanceId": "fruta-1", "name": "Banana Prata", "quantity": 1, "clinical_mass_g": 80, "kcal": 70, "protein": 1, "carbs": 18, "fat": 0.3, "substitutions": [], "measurementType": "unit" },
            { "id": "iogurte", "instanceId": "iogurte-1", "name": "Iogurte Natural", "quantity": 1, "clinical_mass_g": 170, "kcal": 110, "protein": 7, "carbs": 10, "fat": 4, "substitutions": [], "measurementType": "unit" }
          ]
        },
        {
          "id": "m4-seg", "name": "Jantar", "time": "20:00", "day_of_week": 1,
          "items": [
            { "id": "arroz-j", "instanceId": "arroz-j-1", "name": "Arroz Branco", "quantity": 100, "clinical_mass_g": 100, "kcal": 130, "protein": 2.5, "carbs": 28, "fat": 0.2, "substitutions": [], "measurementType": "gram" },
            { "id": "carne-j", "instanceId": "carne-j-1", "name": "Carne Moída (Patinho)", "quantity": 100, "clinical_mass_g": 100, "kcal": 220, "protein": 30, "carbs": 0, "fat": 10, "substitutions": [], "measurementType": "gram" },
            { "id": "legume", "instanceId": "legume-1", "name": "Brócolis Cozido", "quantity": 100, "clinical_mass_g": 100, "kcal": 35, "protein": 3, "carbs": 7, "fat": 0.4, "substitutions": [], "measurementType": "gram" }
          ]
        }
      ]
    }
  }',
  '[{"slot": "cafe_da_manha", "time": "08:00"}, {"slot": "almoco", "time": "13:00"}, {"slot": "lanche", "time": "16:30"}, {"slot": "jantar", "time": "20:00"}]',
  '{"cafe_da_manha": "cafe_completo", "almoco": "tradicional_brasileiro", "lanche": "lanche_fit", "jantar": "jantar_clinico"}'
) ON CONFLICT (slug) DO UPDATE SET 
  plan_snapshot = EXCLUDED.plan_snapshot,
  active = true,
  objective = EXCLUDED.objective,
  kcal_profiles = EXCLUDED.kcal_profiles;

-- Add day 2 (Tuesday) to the same snapshot for completeness
UPDATE public.v3_diet_templates SET 
  plan_snapshot = plan_snapshot || jsonb_build_object(
    '1800', jsonb_build_object(
      'meals', (plan_snapshot->'1800'->'meals') || jsonb_build_array(
        jsonb_build_object('id', 'm1-ter', 'name', 'Café da Manhã', 'time', '08:00', 'day_of_week', 2, 'items', plan_snapshot->'1800'->'meals'->0->'items'),
        jsonb_build_object('id', 'm2-ter', 'name', 'Almoço', 'time', '13:00', 'day_of_week', 2, 'items', plan_snapshot->'1800'->'meals'->1->'items'),
        jsonb_build_object('id', 'm3-ter', 'name', 'Lanche', 'time', '16:30', 'day_of_week', 2, 'items', plan_snapshot->'1800'->'meals'->2->'items'),
        jsonb_build_object('id', 'm4-ter', 'name', 'Jantar', 'time', '20:00', 'day_of_week', 2, 'items', plan_snapshot->'1800'->'meals'->3->'items')
      )
    )
  )
WHERE slug = 'soberano-tradicional-brasileiro';
