-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 3 TEMPLATES PRIORITÁRIOS COM 7 DIAS VARIADOS
-- Colesterol Alto, Emagrecimento 1500 kcal, Emagrecimento 1200 kcal
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- 1️⃣ COLESTEROL ALTO 1600 KCAL - 7 DIAS VARIADOS
UPDATE meal_plan_templates 
SET meals = '[
  {
    "day": "Segunda-feira",
    "meals": [
      {"type": "cafe", "time": "08:00", "name": "Mingau de Aveia", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/mingau-de-aveia.jpg", "foods": [{"name": "Aveia", "qty": "50g", "kcal": 195}, {"name": "Leite Desnatado", "qty": "200ml", "kcal": 70}, {"name": "Morango", "qty": "100g", "kcal": 32}]},
      {"type": "almoco", "time": "12:30", "name": "Peixe com Legumes", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/peixe-com-legumes.jpg", "foods": [{"name": "Peixe", "qty": "150g", "kcal": 144}, {"name": "Arroz Integral", "qty": "3 colheres", "kcal": 195}, {"name": "Legumes", "qty": "à vontade", "kcal": 40}]},
      {"type": "lanche", "time": "16:00", "name": "Frutas", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/maca.jpg", "foods": [{"name": "Maçã", "qty": "1 unidade", "kcal": 78}, {"name": "Castanhas", "qty": "20g", "kcal": 120}]},
      {"type": "jantar", "time": "19:30", "name": "Frango Grelhado", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/frango-grelhado.jpg", "foods": [{"name": "Frango", "qty": "120g", "kcal": 198}, {"name": "Salada", "qty": "à vontade", "kcal": 50}]}
    ]
  },
  {
    "day": "Terça-feira",
    "meals": [
      {"type": "cafe", "time": "08:00", "name": "Tapioca com Ovo", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/tapioca-com-ovo.jpg", "foods": [{"name": "Tapioca", "qty": "1 unidade", "kcal": 150}, {"name": "Ovo Cozido", "qty": "2 unidades", "kcal": 146}, {"name": "Mamão", "qty": "1 fatia", "kcal": 43}]},
      {"type": "almoco", "time": "12:30", "name": "Salmão com Quinoa", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/peixe-com-legumes.jpg", "foods": [{"name": "Salmão", "qty": "120g", "kcal": 206}, {"name": "Quinoa", "qty": "3 colheres", "kcal": 111}, {"name": "Brócolis", "qty": "à vontade", "kcal": 34}]},
      {"type": "lanche", "time": "16:00", "name": "Iogurte com Linhaça", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/iogurte-com-fruta.jpg", "foods": [{"name": "Iogurte Natural", "qty": "1 pote", "kcal": 61}, {"name": "Linhaça", "qty": "1 colher", "kcal": 55}, {"name": "Banana", "qty": "1 unidade", "kcal": 89}]},
      {"type": "jantar", "time": "19:30", "name": "Peito de Peru com Salada", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/frango-grelhado.jpg", "foods": [{"name": "Peito de Peru", "qty": "100g", "kcal": 104}, {"name": "Batata Doce", "qty": "1 unidade", "kcal": 86}, {"name": "Salada Verde", "qty": "à vontade", "kcal": 30}]}
    ]
  },
  {
    "day": "Quarta-feira",
    "meals": [
      {"type": "cafe", "time": "08:00", "name": "Pão Integral com Pasta de Amendoim", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/pao-com-ovo.jpg", "foods": [{"name": "Pão Integral", "qty": "2 fatias", "kcal": 160}, {"name": "Pasta de Amendoim", "qty": "1 colher", "kcal": 94}, {"name": "Banana", "qty": "1 unidade", "kcal": 89}]},
      {"type": "almoco", "time": "12:30", "name": "Tilápia com Legumes", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/peixe-com-legumes.jpg", "foods": [{"name": "Tilápia", "qty": "150g", "kcal": 144}, {"name": "Arroz Integral", "qty": "3 colheres", "kcal": 195}, {"name": "Abobrinha", "qty": "à vontade", "kcal": 20}]},
      {"type": "lanche", "time": "16:00", "name": "Frutas Vermelhas", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/iogurte-com-fruta.jpg", "foods": [{"name": "Morango", "qty": "150g", "kcal": 48}, {"name": "Amêndoas", "qty": "20g", "kcal": 120}, {"name": "Mirtilo", "qty": "50g", "kcal": 29}]},
      {"type": "jantar", "time": "19:30", "name": "Frango com Espinafre", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/frango-grelhado.jpg", "foods": [{"name": "Frango", "qty": "120g", "kcal": 198}, {"name": "Espinafre", "qty": "à vontade", "kcal": 23}, {"name": "Batata Doce", "qty": "1 pequena", "kcal": 60}]}
    ]
  },
  {
    "day": "Quinta-feira",
    "meals": [
      {"type": "cafe", "time": "08:00", "name": "Vitamina de Aveia", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/mingau-de-aveia.jpg", "foods": [{"name": "Aveia", "qty": "40g", "kcal": 156}, {"name": "Leite Desnatado", "qty": "200ml", "kcal": 70}, {"name": "Mamão", "qty": "100g", "kcal": 43}, {"name": "Chia", "qty": "1 colher", "kcal": 58}]},
      {"type": "almoco", "time": "12:30", "name": "Atum com Salada", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/peixe-com-legumes.jpg", "foods": [{"name": "Atum", "qty": "120g", "kcal": 132}, {"name": "Grão de Bico", "qty": "3 colheres", "kcal": 164}, {"name": "Salada Mista", "qty": "à vontade", "kcal": 40}]},
      {"type": "lanche", "time": "16:00", "name": "Maçã com Nozes", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/maca.jpg", "foods": [{"name": "Maçã", "qty": "1 unidade", "kcal": 78}, {"name": "Nozes", "qty": "20g", "kcal": 131}]},
      {"type": "jantar", "time": "19:30", "name": "Frango com Couve-flor", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/frango-grelhado.jpg", "foods": [{"name": "Frango", "qty": "120g", "kcal": 198}, {"name": "Couve-flor", "qty": "à vontade", "kcal": 25}, {"name": "Arroz Integral", "qty": "2 colheres", "kcal": 130}]}
    ]
  },
  {
    "day": "Sexta-feira",
    "meals": [
      {"type": "cafe", "time": "08:00", "name": "Crepioca com Queijo", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/tapioca-com-queijo.jpg", "foods": [{"name": "Crepioca", "qty": "1 unidade", "kcal": 120}, {"name": "Queijo Cottage", "qty": "2 colheres", "kcal": 81}, {"name": "Tomate", "qty": "à vontade", "kcal": 18}, {"name": "Laranja", "qty": "1 unidade", "kcal": 86}]},
      {"type": "almoco", "time": "12:30", "name": "Sardinha com Batata", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/peixe-com-legumes.jpg", "foods": [{"name": "Sardinha", "qty": "100g", "kcal": 208}, {"name": "Batata", "qty": "1 unidade", "kcal": 77}, {"name": "Salada", "qty": "à vontade", "kcal": 30}]},
      {"type": "lanche", "time": "16:00", "name": "Iogurte com Granola", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/iogurte-com-fruta.jpg", "foods": [{"name": "Iogurte Natural", "qty": "1 pote", "kcal": 61}, {"name": "Granola", "qty": "2 colheres", "kcal": 120}, {"name": "Kiwi", "qty": "1 unidade", "kcal": 42}]},
      {"type": "jantar", "time": "19:30", "name": "Peru com Legumes", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/frango-grelhado.jpg", "foods": [{"name": "Peito de Peru", "qty": "120g", "kcal": 125}, {"name": "Cenoura", "qty": "à vontade", "kcal": 41}, {"name": "Vagem", "qty": "à vontade", "kcal": 31}]}
    ]
  },
  {
    "day": "Sábado",
    "meals": [
      {"type": "cafe", "time": "08:00", "name": "Omelete com Legumes", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/omelete.jpg", "foods": [{"name": "Ovos", "qty": "2 unidades", "kcal": 146}, {"name": "Tomate", "qty": "à vontade", "kcal": 18}, {"name": "Cebola", "qty": "à vontade", "kcal": 10}, {"name": "Pão Integral", "qty": "1 fatia", "kcal": 80}, {"name": "Mamão", "qty": "1 fatia", "kcal": 43}]},
      {"type": "almoco", "time": "12:30", "name": "Bacalhau com Grão de Bico", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/peixe-com-legumes.jpg", "foods": [{"name": "Bacalhau", "qty": "100g", "kcal": 82}, {"name": "Grão de Bico", "qty": "4 colheres", "kcal": 218}, {"name": "Azeite", "qty": "1 colher", "kcal": 120}]},
      {"type": "lanche", "time": "16:00", "name": "Abacate com Cacau", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/banana-com-aveia.jpg", "foods": [{"name": "Abacate", "qty": "1/4 unidade", "kcal": 80}, {"name": "Cacau", "qty": "1 colher", "kcal": 12}, {"name": "Mel", "qty": "1 colher", "kcal": 64}]},
      {"type": "jantar", "time": "19:30", "name": "Frango com Berinjela", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/frango-grelhado.jpg", "foods": [{"name": "Frango", "qty": "120g", "kcal": 198}, {"name": "Berinjela", "qty": "à vontade", "kcal": 25}, {"name": "Arroz Integral", "qty": "2 colheres", "kcal": 130}]}
    ]
  },
  {
    "day": "Domingo",
    "meals": [
      {"type": "cafe", "time": "08:00", "name": "Panqueca de Aveia", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/mingau-de-aveia.jpg", "foods": [{"name": "Aveia", "qty": "40g", "kcal": 156}, {"name": "Ovo", "qty": "1 unidade", "kcal": 73}, {"name": "Banana", "qty": "1 unidade", "kcal": 89}, {"name": "Mel", "qty": "1 colher", "kcal": 64}]},
      {"type": "almoco", "time": "12:30", "name": "Merluza com Legumes", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/peixe-com-legumes.jpg", "foods": [{"name": "Merluza", "qty": "150g", "kcal": 112}, {"name": "Batata Doce", "qty": "1 unidade", "kcal": 86}, {"name": "Brócolis", "qty": "à vontade", "kcal": 34}, {"name": "Cenoura", "qty": "à vontade", "kcal": 41}]},
      {"type": "lanche", "time": "16:00", "name": "Castanhas Mix", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/maca.jpg", "foods": [{"name": "Castanha do Pará", "qty": "15g", "kcal": 99}, {"name": "Amêndoas", "qty": "15g", "kcal": 90}, {"name": "Pera", "qty": "1 unidade", "kcal": 57}]},
      {"type": "jantar", "time": "19:30", "name": "Frango com Aspargos", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/frango-grelhado.jpg", "foods": [{"name": "Frango", "qty": "120g", "kcal": 198}, {"name": "Aspargos", "qty": "à vontade", "kcal": 20}, {"name": "Quinoa", "qty": "2 colheres", "kcal": 74}]}
    ]
  }
]'::jsonb
WHERE name = 'Colesterol Alto 1600 kcal';

-- Verificar
SELECT name, jsonb_array_length(meals) as total_dias FROM meal_plan_templates WHERE name = 'Colesterol Alto 1600 kcal';


-- 2️⃣ EMAGRECIMENTO 1500 KCAL - 7 DIAS VARIADOS
UPDATE meal_plan_templates 
SET meals = '[
  {
    "day": "Segunda-feira",
    "meals": [
      {"type": "cafe", "time": "08:00", "name": "Cuscuz com Ovo", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/cuscuz-com-ovo.jpg", "foods": [{"name": "Cuscuz", "qty": "100g", "kcal": 112}, {"name": "Ovo", "qty": "2 unidades", "kcal": 146}, {"name": "Mamão", "qty": "1 fatia", "kcal": 43}]},
      {"type": "almoco", "time": "12:30", "name": "Frango com Batata Doce", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/frango-com-batata-doce.jpg", "foods": [{"name": "Frango", "qty": "120g", "kcal": 198}, {"name": "Batata Doce", "qty": "1 unidade", "kcal": 86}, {"name": "Salada", "qty": "à vontade", "kcal": 30}]},
      {"type": "lanche", "time": "16:00", "name": "Fruta", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/laranja.jpg", "foods": [{"name": "Laranja", "qty": "1 unidade", "kcal": 86}]},
      {"type": "jantar", "time": "19:30", "name": "Peixe com Legumes", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/peixe-com-legumes.jpg", "foods": [{"name": "Peixe", "qty": "150g", "kcal": 144}, {"name": "Legumes", "qty": "à vontade", "kcal": 40}]}
    ]
  },
  {
    "day": "Terça-feira",
    "meals": [
      {"type": "cafe", "time": "08:00", "name": "Tapioca com Queijo", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/tapioca-com-queijo.jpg", "foods": [{"name": "Tapioca", "qty": "1 unidade", "kcal": 150}, {"name": "Queijo Branco", "qty": "2 fatias", "kcal": 138}, {"name": "Melão", "qty": "1 fatia", "kcal": 34}]},
      {"type": "almoco", "time": "12:30", "name": "Carne Magra com Abobrinha", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/carne-com-batata.jpg", "foods": [{"name": "Patinho", "qty": "100g", "kcal": 215}, {"name": "Abobrinha", "qty": "à vontade", "kcal": 20}, {"name": "Arroz Integral", "qty": "2 colheres", "kcal": 130}]},
      {"type": "lanche", "time": "16:00", "name": "Iogurte Natural", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/iogurte-com-fruta.jpg", "foods": [{"name": "Iogurte Natural", "qty": "1 pote", "kcal": 61}, {"name": "Morango", "qty": "100g", "kcal": 32}]},
      {"type": "jantar", "time": "19:30", "name": "Omelete de Claras", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/omelete.jpg", "foods": [{"name": "Claras", "qty": "4 unidades", "kcal": 68}, {"name": "Tomate", "qty": "à vontade", "kcal": 18}, {"name": "Salada", "qty": "à vontade", "kcal": 30}]}
    ]
  },
  {
    "day": "Quarta-feira",
    "meals": [
      {"type": "cafe", "time": "08:00", "name": "Pão Integral com Ovo", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/pao-com-ovo.jpg", "foods": [{"name": "Pão Integral", "qty": "2 fatias", "kcal": 160}, {"name": "Ovo Cozido", "qty": "1 unidade", "kcal": 73}, {"name": "Banana", "qty": "1 unidade", "kcal": 89}]},
      {"type": "almoco", "time": "12:30", "name": "Tilápia Grelhada", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/peixe-com-legumes.jpg", "foods": [{"name": "Tilápia", "qty": "150g", "kcal": 144}, {"name": "Brócolis", "qty": "à vontade", "kcal": 34}, {"name": "Batata Doce", "qty": "1 pequena", "kcal": 60}]},
      {"type": "lanche", "time": "16:00", "name": "Maçã", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/maca.jpg", "foods": [{"name": "Maçã", "qty": "1 unidade", "kcal": 78}]},
      {"type": "jantar", "time": "19:30", "name": "Frango com Couve-flor", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/frango-grelhado.jpg", "foods": [{"name": "Frango", "qty": "120g", "kcal": 198}, {"name": "Couve-flor", "qty": "à vontade", "kcal": 25}, {"name": "Salada", "qty": "à vontade", "kcal": 30}]}
    ]
  },
  {
    "day": "Quinta-feira",
    "meals": [
      {"type": "cafe", "time": "08:00", "name": "Mingau de Aveia", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/mingau-de-aveia.jpg", "foods": [{"name": "Aveia", "qty": "40g", "kcal": 156}, {"name": "Leite Desnatado", "qty": "200ml", "kcal": 70}, {"name": "Banana", "qty": "1/2 unidade", "kcal": 45}]},
      {"type": "almoco", "time": "12:30", "name": "Carne Moída com Legumes", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/carne-com-batata.jpg", "foods": [{"name": "Carne Moída Magra", "qty": "100g", "kcal": 209}, {"name": "Cenoura", "qty": "à vontade", "kcal": 41}, {"name": "Vagem", "qty": "à vontade", "kcal": 31}]},
      {"type": "lanche", "time": "16:00", "name": "Gelatina com Frutas", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/iogurte-com-fruta.jpg", "foods": [{"name": "Gelatina Diet", "qty": "1 pote", "kcal": 10}, {"name": "Kiwi", "qty": "1 unidade", "kcal": 42}]},
      {"type": "jantar", "time": "19:30", "name": "Salmão com Aspargos", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/peixe-com-legumes.jpg", "foods": [{"name": "Salmão", "qty": "100g", "kcal": 172}, {"name": "Aspargos", "qty": "à vontade", "kcal": 20}, {"name": "Salada", "qty": "à vontade", "kcal": 30}]}
    ]
  },
  {
    "day": "Sexta-feira",
    "meals": [
      {"type": "cafe", "time": "08:00", "name": "Crepioca Light", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/tapioca-com-ovo.jpg", "foods": [{"name": "Crepioca", "qty": "1 unidade", "kcal": 120}, {"name": "Queijo Cottage", "qty": "2 colheres", "kcal": 81}, {"name": "Tomate", "qty": "à vontade", "kcal": 18}, {"name": "Mamão", "qty": "1 fatia", "kcal": 43}]},
      {"type": "almoco", "time": "12:30", "name": "Frango com Quinoa", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/frango-grelhado.jpg", "foods": [{"name": "Frango", "qty": "120g", "kcal": 198}, {"name": "Quinoa", "qty": "3 colheres", "kcal": 111}, {"name": "Salada", "qty": "à vontade", "kcal": 30}]},
      {"type": "lanche", "time": "16:00", "name": "Pera", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/maca.jpg", "foods": [{"name": "Pera", "qty": "1 unidade", "kcal": 57}]},
      {"type": "jantar", "time": "19:30", "name": "Atum com Salada", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/peixe-com-legumes.jpg", "foods": [{"name": "Atum", "qty": "1 lata", "kcal": 132}, {"name": "Salada Verde", "qty": "à vontade", "kcal": 30}, {"name": "Tomate", "qty": "à vontade", "kcal": 18}]}
    ]
  },
  {
    "day": "Sábado",
    "meals": [
      {"type": "cafe", "time": "08:00", "name": "Omelete de Legumes", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/omelete.jpg", "foods": [{"name": "Ovos", "qty": "2 unidades", "kcal": 146}, {"name": "Tomate", "qty": "à vontade", "kcal": 18}, {"name": "Cebola", "qty": "à vontade", "kcal": 10}, {"name": "Laranja", "qty": "1 unidade", "kcal": 86}]},
      {"type": "almoco", "time": "12:30", "name": "Peito de Peru com Legumes", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/frango-grelhado.jpg", "foods": [{"name": "Peito de Peru", "qty": "120g", "kcal": 125}, {"name": "Berinjela", "qty": "à vontade", "kcal": 25}, {"name": "Arroz Integral", "qty": "2 colheres", "kcal": 130}]},
      {"type": "lanche", "time": "16:00", "name": "Iogurte com Chia", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/iogurte-com-fruta.jpg", "foods": [{"name": "Iogurte Natural", "qty": "1 pote", "kcal": 61}, {"name": "Chia", "qty": "1 colher", "kcal": 58}]},
      {"type": "jantar", "time": "19:30", "name": "Frango com Espinafre", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/frango-grelhado.jpg", "foods": [{"name": "Frango", "qty": "120g", "kcal": 198}, {"name": "Espinafre", "qty": "à vontade", "kcal": 23}, {"name": "Batata Doce", "qty": "1 pequena", "kcal": 60}]}
    ]
  },
  {
    "day": "Domingo",
    "meals": [
      {"type": "cafe", "time": "08:00", "name": "Panqueca de Banana", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/mingau-de-aveia.jpg", "foods": [{"name": "Banana", "qty": "1 unidade", "kcal": 89}, {"name": "Ovo", "qty": "1 unidade", "kcal": 73}, {"name": "Aveia", "qty": "2 colheres", "kcal": 78}]},
      {"type": "almoco", "time": "12:30", "name": "Merluza com Legumes", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/peixe-com-legumes.jpg", "foods": [{"name": "Merluza", "qty": "150g", "kcal": 112}, {"name": "Brócolis", "qty": "à vontade", "kcal": 34}, {"name": "Cenoura", "qty": "à vontade", "kcal": 41}, {"name": "Batata Doce", "qty": "1 unidade", "kcal": 86}]},
      {"type": "lanche", "time": "16:00", "name": "Melancia", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/maca.jpg", "foods": [{"name": "Melancia", "qty": "2 fatias", "kcal": 60}]},
      {"type": "jantar", "time": "19:30", "name": "Frango com Abobrinha", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/frango-grelhado.jpg", "foods": [{"name": "Frango", "qty": "120g", "kcal": 198}, {"name": "Abobrinha", "qty": "à vontade", "kcal": 20}, {"name": "Salada", "qty": "à vontade", "kcal": 30}]}
    ]
  }
]'::jsonb
WHERE name = 'Emagrecimento 1500 kcal';

-- Verificar
SELECT name, jsonb_array_length(meals) as total_dias FROM meal_plan_templates WHERE name = 'Emagrecimento 1500 kcal';


-- 3️⃣ EMAGRECIMENTO 1200 KCAL - 7 DIAS VARIADOS
UPDATE meal_plan_templates 
SET meals = '[
  {
    "day": "Segunda-feira",
    "meals": [
      {"type": "cafe", "time": "08:00", "name": "Tapioca com Ovo", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/tapioca-com-ovo.jpg", "foods": [{"name": "Tapioca", "qty": "1 pequena", "kcal": 100}, {"name": "Ovo", "qty": "1 unidade", "kcal": 73}, {"name": "Mamão", "qty": "1 fatia", "kcal": 43}]},
      {"type": "almoco", "time": "12:30", "name": "Frango com Salada", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/frango-grelhado.jpg", "foods": [{"name": "Frango", "qty": "100g", "kcal": 165}, {"name": "Salada", "qty": "à vontade", "kcal": 30}, {"name": "Batata Doce", "qty": "1 pequena", "kcal": 60}]},
      {"type": "lanche", "time": "16:00", "name": "Fruta", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/maca.jpg", "foods": [{"name": "Maçã", "qty": "1 unidade", "kcal": 78}]},
      {"type": "jantar", "time": "19:30", "name": "Peixe com Legumes", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/peixe-com-legumes.jpg", "foods": [{"name": "Tilápia", "qty": "120g", "kcal": 115}, {"name": "Legumes", "qty": "à vontade", "kcal": 40}]}
    ]
  },
  {
    "day": "Terça-feira",
    "meals": [
      {"type": "cafe", "time": "08:00", "name": "Cuscuz Light", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/cuscuz-com-ovo.jpg", "foods": [{"name": "Cuscuz", "qty": "80g", "kcal": 90}, {"name": "Ovo Cozido", "qty": "1 unidade", "kcal": 73}, {"name": "Melão", "qty": "1 fatia", "kcal": 34}]},
      {"type": "almoco", "time": "12:30", "name": "Peito de Peru com Abobrinha", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/frango-grelhado.jpg", "foods": [{"name": "Peito de Peru", "qty": "100g", "kcal": 104}, {"name": "Abobrinha", "qty": "à vontade", "kcal": 20}, {"name": "Arroz Integral", "qty": "2 colheres", "kcal": 130}]},
      {"type": "lanche", "time": "16:00", "name": "Iogurte Natural", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/iogurte-com-fruta.jpg", "foods": [{"name": "Iogurte Natural", "qty": "1 pote", "kcal": 61}]},
      {"type": "jantar", "time": "19:30", "name": "Omelete de Claras", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/omelete.jpg", "foods": [{"name": "Claras", "qty": "3 unidades", "kcal": 51}, {"name": "Tomate", "qty": "à vontade", "kcal": 18}, {"name": "Salada", "qty": "à vontade", "kcal": 30}]}
    ]
  },
  {
    "day": "Quarta-feira",
    "meals": [
      {"type": "cafe", "time": "08:00", "name": "Pão Integral Light", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/pao-com-ovo.jpg", "foods": [{"name": "Pão Integral", "qty": "1 fatia", "kcal": 80}, {"name": "Queijo Cottage", "qty": "2 colheres", "kcal": 81}, {"name": "Banana", "qty": "1/2 unidade", "kcal": 45}]},
      {"type": "almoco", "time": "12:30", "name": "Merluza Grelhada", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/peixe-com-legumes.jpg", "foods": [{"name": "Merluza", "qty": "120g", "kcal": 90}, {"name": "Brócolis", "qty": "à vontade", "kcal": 34}, {"name": "Batata Doce", "qty": "1 pequena", "kcal": 60}]},
      {"type": "lanche", "time": "16:00", "name": "Gelatina Diet", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/iogurte-com-fruta.jpg", "foods": [{"name": "Gelatina Diet", "qty": "1 pote", "kcal": 10}, {"name": "Morango", "qty": "100g", "kcal": 32}]},
      {"type": "jantar", "time": "19:30", "name": "Frango com Couve-flor", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/frango-grelhado.jpg", "foods": [{"name": "Frango", "qty": "100g", "kcal": 165}, {"name": "Couve-flor", "qty": "à vontade", "kcal": 25}]}
    ]
  },
  {
    "day": "Quinta-feira",
    "meals": [
      {"type": "cafe", "time": "08:00", "name": "Mingau de Aveia Light", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/mingau-de-aveia.jpg", "foods": [{"name": "Aveia", "qty": "30g", "kcal": 117}, {"name": "Leite Desnatado", "qty": "150ml", "kcal": 53}, {"name": "Banana", "qty": "1/2 unidade", "kcal": 45}]},
      {"type": "almoco", "time": "12:30", "name": "Atum com Salada", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/peixe-com-legumes.jpg", "foods": [{"name": "Atum", "qty": "1 lata", "kcal": 132}, {"name": "Salada Verde", "qty": "à vontade", "kcal": 30}, {"name": "Tomate", "qty": "à vontade", "kcal": 18}]},
      {"type": "lanche", "time": "16:00", "name": "Pera", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/maca.jpg", "foods": [{"name": "Pera", "qty": "1 unidade", "kcal": 57}]},
      {"type": "jantar", "time": "19:30", "name": "Salmão com Aspargos", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/peixe-com-legumes.jpg", "foods": [{"name": "Salmão", "qty": "80g", "kcal": 138}, {"name": "Aspargos", "qty": "à vontade", "kcal": 20}]}
    ]
  },
  {
    "day": "Sexta-feira",
    "meals": [
      {"type": "cafe", "time": "08:00", "name": "Crepioca Light", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/tapioca-com-ovo.jpg", "foods": [{"name": "Crepioca", "qty": "1 pequena", "kcal": 100}, {"name": "Tomate", "qty": "à vontade", "kcal": 18}, {"name": "Mamão", "qty": "1 fatia", "kcal": 43}]},
      {"type": "almoco", "time": "12:30", "name": "Frango com Quinoa", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/frango-grelhado.jpg", "foods": [{"name": "Frango", "qty": "100g", "kcal": 165}, {"name": "Quinoa", "qty": "2 colheres", "kcal": 74}, {"name": "Salada", "qty": "à vontade", "kcal": 30}]},
      {"type": "lanche", "time": "16:00", "name": "Kiwi", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/maca.jpg", "foods": [{"name": "Kiwi", "qty": "1 unidade", "kcal": 42}]},
      {"type": "jantar", "time": "19:30", "name": "Peixe com Espinafre", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/peixe-com-legumes.jpg", "foods": [{"name": "Tilápia", "qty": "120g", "kcal": 115}, {"name": "Espinafre", "qty": "à vontade", "kcal": 23}]}
    ]
  },
  {
    "day": "Sábado",
    "meals": [
      {"type": "cafe", "time": "08:00", "name": "Omelete Light", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/omelete.jpg", "foods": [{"name": "Claras", "qty": "3 unidades", "kcal": 51}, {"name": "Tomate", "qty": "à vontade", "kcal": 18}, {"name": "Cebola", "qty": "à vontade", "kcal": 10}, {"name": "Laranja", "qty": "1 unidade", "kcal": 86}]},
      {"type": "almoco", "time": "12:30", "name": "Peito de Peru com Legumes", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/frango-grelhado.jpg", "foods": [{"name": "Peito de Peru", "qty": "100g", "kcal": 104}, {"name": "Berinjela", "qty": "à vontade", "kcal": 25}, {"name": "Cenoura", "qty": "à vontade", "kcal": 41}]},
      {"type": "lanche", "time": "16:00", "name": "Iogurte com Chia", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/iogurte-com-fruta.jpg", "foods": [{"name": "Iogurte Natural", "qty": "1 pote", "kcal": 61}, {"name": "Chia", "qty": "1 colher", "kcal": 58}]},
      {"type": "jantar", "time": "19:30", "name": "Frango com Abobrinha", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/frango-grelhado.jpg", "foods": [{"name": "Frango", "qty": "100g", "kcal": 165}, {"name": "Abobrinha", "qty": "à vontade", "kcal": 20}]}
    ]
  },
  {
    "day": "Domingo",
    "meals": [
      {"type": "cafe", "time": "08:00", "name": "Panqueca de Banana Light", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/mingau-de-aveia.jpg", "foods": [{"name": "Banana", "qty": "1 unidade", "kcal": 89}, {"name": "Ovo", "qty": "1 unidade", "kcal": 73}]},
      {"type": "almoco", "time": "12:30", "name": "Merluza com Legumes", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/peixe-com-legumes.jpg", "foods": [{"name": "Merluza", "qty": "120g", "kcal": 90}, {"name": "Brócolis", "qty": "à vontade", "kcal": 34}, {"name": "Cenoura", "qty": "à vontade", "kcal": 41}, {"name": "Batata Doce", "qty": "1 pequena", "kcal": 60}]},
      {"type": "lanche", "time": "16:00", "name": "Melancia", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/maca.jpg", "foods": [{"name": "Melancia", "qty": "2 fatias", "kcal": 60}]},
      {"type": "jantar", "time": "19:30", "name": "Frango com Salada", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/frango-grelhado.jpg", "foods": [{"name": "Frango", "qty": "100g", "kcal": 165}, {"name": "Salada Verde", "qty": "à vontade", "kcal": 30}]}
    ]
  }
]'::jsonb
WHERE name = 'Emagrecimento 1200 kcal';

-- Verificar
SELECT name, jsonb_array_length(meals) as total_dias FROM meal_plan_templates WHERE name = 'Emagrecimento 1200 kcal';

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- VERIFICAÇÃO FINAL DOS 3 TEMPLATES PRIORITÁRIOS
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SELECT 
  name,
  category,
  jsonb_array_length(meals) as total_dias,
  meals->0->>'day' as dia_1,
  meals->6->>'day' as dia_7
FROM meal_plan_templates
WHERE name IN (
  'Colesterol Alto 1600 kcal',
  'Emagrecimento 1500 kcal',
  'Emagrecimento 1200 kcal'
)
ORDER BY name;


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- CONVERTER PARA FORMATO DO EDITOR V3 (COM 7 DIAS)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Função para converter 7 dias para formato V3
CREATE OR REPLACE FUNCTION convert_7_days_to_v3(meals_array JSONB)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'days',
    jsonb_agg(
      jsonb_build_object(
        'day_of_week', row_number,
        'meals', day_data->'meals'
      )
      ORDER BY row_number
    )
  )
  INTO result
  FROM jsonb_array_elements(meals_array) WITH ORDINALITY AS t(day_data, row_number);
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Atualizar os 3 templates prioritários no Editor V3
UPDATE v3_diet_templates vt
SET plan_snapshot = (
  SELECT jsonb_object_agg(
    kcal_key,
    convert_7_days_to_v3(t.meals)
  )
  FROM meal_plan_templates t,
       LATERAL (SELECT SUBSTRING(t.name FROM '\d+') as kcal_key) k
  WHERE t.name = CASE vt.slug
    WHEN 'colesterol_alto_1600_kcal' THEN 'Colesterol Alto 1600 kcal'
    WHEN 'emagrecimento_1500_kcal' THEN 'Emagrecimento 1500 kcal'
    WHEN 'emagrecimento_1200_kcal' THEN 'Emagrecimento 1200 kcal'
  END
  AND k.kcal_key IS NOT NULL
),
updated_at = now()
WHERE vt.slug IN (
  'colesterol_alto_1600_kcal',
  'emagrecimento_1500_kcal',
  'emagrecimento_1200_kcal'
);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- VERIFICAÇÃO FINAL NO EDITOR V3
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SELECT 
  title,
  family,
  kcal_profiles->>0 as kcal,
  jsonb_array_length((plan_snapshot->(kcal_profiles->>0))->'days') as total_dias,
  (plan_snapshot->(kcal_profiles->>0))->'days'->0->'meals'->0->>'name' as cafe_dia_1,
  (plan_snapshot->(kcal_profiles->>0))->'days'->6->'meals'->0->>'name' as cafe_dia_7
FROM v3_diet_templates
WHERE slug IN (
  'colesterol_alto_1600_kcal',
  'emagrecimento_1500_kcal',
  'emagrecimento_1200_kcal'
)
ORDER BY family, title;

-- Ver estrutura completa de um dia
SELECT 
  title,
  jsonb_pretty((plan_snapshot->'1500'->'days'->0)) as estrutura_dia_1_completa
FROM v3_diet_templates
WHERE slug = 'emagrecimento_1500_kcal';
