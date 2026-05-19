
-- Repopulate V3 Diet Templates with Premium Content
UPDATE v3_diet_templates
SET 
  meal_distribution = '[
    {"slot": "Café da Manhã", "time": "08:00"},
    {"slot": "Lanche da Manhã", "time": "10:30"},
    {"slot": "Almoço", "time": "12:30"},
    {"slot": "Lanche da Tarde", "time": "16:00"},
    {"slot": "Jantar", "time": "19:30"},
    {"slot": "Ceia", "time": "22:00"}
  ]'::jsonb,
  active = true,
  editable = true
WHERE active = true;

-- For each template, we update the plan_snapshot with real data
-- This is a simplified version but using real slugs and images we found.
-- I will use a PL/pgSQL block to iterate and update.

DO $$
DECLARE
    template_record RECORD;
    premium_snapshot JSONB;
    meal_café JSONB;
    meal_lanche_m JSONB;
    meal_almoco JSONB;
    meal_lanche_t JSONB;
    meal_jantar JSONB;
    meal_ceia JSONB;
BEGIN
    -- Define standard premium meals
    meal_café := '{
        "name": "Café da Manhã", "time": "08:00",
        "items": [{
            "name": "Pão Francês com Ovo e Café", "title": "Pão Francês com Ovo e Café",
            "imageUrl": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/pao-frances.jpg",
            "quantity_display": "1 pão + 2 ovos", "kcal": 320, "protein": 14, "carbs": 35, "fat": 12, "is_primary": true,
            "substitutions": [
                {"name": "Crepioca de Frango", "title": "Crepioca de Frango", "imageUrl": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/crepioca%2Fcrepioca.jpg", "kcal": 280, "protein": 22, "carbs": 15, "fat": 12},
                {"name": "Cuscuz com Ovo", "title": "Cuscuz com Ovo", "imageUrl": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/cuscuz-com-ovo-2.jpg", "kcal": 250, "protein": 12, "carbs": 40, "fat": 8}
            ]
        }]
    }'::jsonb;

    meal_lanche_m := '{
        "name": "Lanche da Manhã", "time": "10:30",
        "items": [{
            "name": "Mix de Fruta com Oleaginosas", "title": "Mix de Fruta com Oleaginosas",
            "imageUrl": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/fruta.jpg",
            "quantity_display": "1 banana + 2 castanhas", "kcal": 150, "protein": 2, "carbs": 25, "fat": 6, "is_primary": true,
            "substitutions": [
                {"name": "Bowl de Iogurte", "title": "Bowl de Iogurte", "imageUrl": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/iogurte-natural/iogurte-natural.jpg", "kcal": 180, "protein": 12, "carbs": 20, "fat": 5}
            ]
        }]
    }'::jsonb;

    meal_almoco := '{
        "name": "Almoço", "time": "12:30",
        "items": [
            {"name": "Arroz, Feijão e Frango Grelhado", "title": "Arroz, Feijão e Frango Grelhado",
             "imageUrl": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/arroz-feijao-frango.png",
             "quantity_display": "150g arroz + 100g feijão + 120g frango", "kcal": 550, "protein": 45, "carbs": 65, "fat": 12, "is_primary": true,
             "substitutions": [
                 {"name": "Carne de Panela com Legumes", "title": "Carne de Panela com Legumes", "imageUrl": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/carne-assada-de-panela/carne-assada-de-panela.jpg", "kcal": 480, "protein": 35, "carbs": 40, "fat": 18},
                 {"name": "Strogonoff de Frango Fit", "title": "Strogonoff de Frango Fit", "imageUrl": "https://images.unsplash.com/photo-1541544741938-0af808871cc0?w=800&auto=format&fit=crop", "kcal": 520, "protein": 38, "carbs": 45, "fat": 15}
             ]
            }
        ]
    }'::jsonb;

    meal_lanche_t := '{
        "name": "Lanche da Tarde", "time": "16:00",
        "items": [{
            "name": "Wrap Integral de Frango", "title": "Wrap Integral de Frango",
            "imageUrl": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/wrap-integral.jpg",
            "quantity_display": "1 unidade (180g)", "kcal": 280, "protein": 24, "carbs": 22, "fat": 10, "is_primary": true,
            "substitutions": [
                {"name": "Smoothie de Whey", "title": "Smoothie de Whey", "imageUrl": "https://images.unsplash.com/photo-1553531384-cc64ac80f931?w=800&auto=format&fit=crop", "kcal": 220, "protein": 25, "carbs": 20, "fat": 4},
                {"name": "Mix de Castanhas Nobres", "title": "Mix de Castanhas Nobres", "imageUrl": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/castanhas.jpg", "kcal": 160, "protein": 5, "carbs": 6, "fat": 14}
            ]
        }]
    }'::jsonb;

    meal_jantar := '{
        "name": "Jantar", "time": "19:30",
        "items": [{
            "name": "Filé Mignon com Quinoa", "title": "Filé Mignon com Quinoa",
            "imageUrl": "https://images.unsplash.com/photo-1558030006-45c27e5c7b3b?w=800&auto=format&fit=crop",
            "quantity_display": "120g filé + 100g quinoa", "kcal": 420, "protein": 38, "carbs": 30, "fat": 16, "is_primary": true,
            "substitutions": [
                {"name": "Peixe ao Limone", "title": "Peixe ao Limone", "imageUrl": "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=800&auto=format&fit=crop", "kcal": 350, "protein": 32, "carbs": 15, "fat": 12},
                {"name": "Sopa de Abóbora com Frango", "title": "Sopa de Abóbora com Frango", "imageUrl": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/sopa-de-legumes%2Fsopa-de-legumes.jpg", "kcal": 280, "protein": 25, "carbs": 25, "fat": 8}
            ]
        }]
    }'::jsonb;

    meal_ceia := '{
        "name": "Ceia", "time": "22:00",
        "items": [{
            "name": "Chá com Torrada Integral", "title": "Chá com Torrada Integral",
            "imageUrl": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/cha-com-torrada/cha-com-torrada.jpg",
            "quantity_display": "1 xícara chá + 2 torradas", "kcal": 80, "protein": 2, "carbs": 15, "fat": 1, "is_primary": true,
            "substitutions": [
                {"name": "Banana com Canela", "title": "Banana com Canela", "imageUrl": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/banana-com-canela.jpg", "kcal": 90, "protein": 1, "carbs": 22, "fat": 0}
            ]
        }]
    }'::jsonb;

    premium_snapshot := jsonb_build_object(
        '1400', jsonb_build_object('days', jsonb_build_array(jsonb_build_object('day_of_week', 1, 'meals', jsonb_build_array(meal_café, meal_lanche_m, meal_almoco, meal_lanche_t, meal_jantar, meal_ceia)))),
        '1600', jsonb_build_object('days', jsonb_build_array(jsonb_build_object('day_of_week', 1, 'meals', jsonb_build_array(meal_café, meal_lanche_m, meal_almoco, meal_lanche_t, meal_jantar, meal_ceia)))),
        '1800', jsonb_build_object('days', jsonb_build_array(jsonb_build_object('day_of_week', 1, 'meals', jsonb_build_array(meal_café, meal_lanche_m, meal_almoco, meal_lanche_t, meal_jantar, meal_ceia)))),
        '2000', jsonb_build_object('days', jsonb_build_array(jsonb_build_object('day_of_week', 1, 'meals', jsonb_build_array(meal_café, meal_lanche_m, meal_almoco, meal_lanche_t, meal_jantar, meal_ceia)))),
        '2200', jsonb_build_object('days', jsonb_build_array(jsonb_build_object('day_of_week', 1, 'meals', jsonb_build_array(meal_café, meal_lanche_m, meal_almoco, meal_lanche_t, meal_jantar, meal_ceia)))),
        '2500', jsonb_build_object('days', jsonb_build_array(jsonb_build_object('day_of_week', 1, 'meals', jsonb_build_array(meal_café, meal_lanche_m, meal_almoco, meal_lanche_t, meal_jantar, meal_ceia))))
    );

    UPDATE v3_diet_templates SET plan_snapshot = premium_snapshot WHERE active = true;
END $$;
