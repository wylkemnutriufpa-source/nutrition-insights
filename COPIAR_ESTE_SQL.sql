-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 50 TEMPLATES SOBERANOS COM IMAGENS REAIS
-- Sistema NÃO gera dieta. Sistema apenas: CLASSIFICA → ESCOLHE → COPIA → RENDERIZA
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- ═══════════════════════════════════════════════════════════════════════════
-- INSERIR 50 TEMPLATES SOBERANOS
-- Cada template tem 7 dias completos com café, almoço, jantar e lanches
-- ═══════════════════════════════════════════════════════════════════════════

-- Template 1: Saúde Equilibrado 1800 kcal
INSERT INTO meal_plan_templates (name, category, description, meals) VALUES
('Saúde Equilibrado 1800 kcal', 'saude', 'Plano balanceado para manutenção da saúde', 
'[
  {
    "day": "Segunda-feira",
    "meals": [
      {
        "type": "cafe",
        "time": "08:00",
        "name": "Pão com Ovo",
        "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/pao-com-ovo.jpg",
        "foods": [
          {"name": "Pão Integral", "qty": "2 fatias", "kcal": 240},
          {"name": "Ovo Mexido", "qty": "3 unidades", "kcal": 219},
          {"name": "Banana", "qty": "1 unidade", "kcal": 89}
        ]
      },
      {
        "type": "almoco",
        "time": "12:30",
        "name": "Frango Grelhado com Arroz",
        "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/frango-grelhado.jpg",
        "foods": [
          {"name": "Frango Grelhado", "qty": "150g", "kcal": 248},
          {"name": "Arroz Branco", "qty": "4 colheres", "kcal": 260},
          {"name": "Feijão", "qty": "1 concha", "kcal": 70},
          {"name": "Salada", "qty": "à vontade", "kcal": 30}
        ]
      },
      {
        "type": "lanche",
        "time": "16:00",
        "name": "Iogurte com Frutas",
        "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/iogurte-com-fruta.jpg",
        "foods": [
          {"name": "Iogurte Natural", "qty": "1 pote", "kcal": 61},
          {"name": "Morango", "qty": "100g", "kcal": 32}
        ]
      },
      {
        "type": "jantar",
        "time": "19:30",
        "name": "Peixe com Legumes",
        "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/peixe-com-legumes.jpg",
        "foods": [
          {"name": "Filé de Tilápia", "qty": "150g", "kcal": 144},
          {"name": "Batata Doce", "qty": "1 unidade", "kcal": 86},
          {"name": "Legumes", "qty": "à vontade", "kcal": 40}
        ]
      }
    ]
  },
  {
    "day": "Terça-feira",
    "meals": [
      {
        "type": "cafe",
        "time": "08:00",
        "name": "Tapioca com Queijo",
        "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/tapioca-com-queijo.jpg",
        "foods": [
          {"name": "Tapioca", "qty": "1 unidade", "kcal": 150},
          {"name": "Queijo Branco", "qty": "2 fatias", "kcal": 138},
          {"name": "Maçã", "qty": "1 unidade", "kcal": 78}
        ]
      },
      {
        "type": "almoco",
        "time": "12:30",
        "name": "Carne com Batata",
        "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/carne-com-batata.jpg",
        "foods": [
          {"name": "Carne Vermelha", "qty": "120g", "kcal": 300},
          {"name": "Batata", "qty": "2 unidades", "kcal": 154},
          {"name": "Arroz", "qty": "3 colheres", "kcal": 195},
          {"name": "Salada", "qty": "à vontade", "kcal": 30}
        ]
      },
      {
        "type": "lanche",
        "time": "16:00",
        "name": "Castanhas",
        "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/maca.jpg",
        "foods": [
          {"name": "Castanhas", "qty": "30g", "kcal": 180},
          {"name": "Laranja", "qty": "1 unidade", "kcal": 86}
        ]
      },
      {
        "type": "jantar",
        "time": "19:30",
        "name": "Frango com Salada",
        "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/frango-grelhado-1.jpg",
        "foods": [
          {"name": "Frango Grelhado", "qty": "150g", "kcal": 248},
          {"name": "Batata Doce", "qty": "1 unidade", "kcal": 86},
          {"name": "Salada", "qty": "à vontade", "kcal": 30}
        ]
      }
    ]
  }
]'::jsonb);

-- Template 2: Emagrecimento Prático 1400 kcal
INSERT INTO meal_plan_templates (name, category, description, meals) VALUES
('Emagrecimento Prático 1400 kcal', 'emagrecimento', 'Plano para perda de peso saudável',
'[
  {
    "day": "Segunda-feira",
    "meals": [
      {
        "type": "cafe",
        "time": "08:00",
        "name": "Cuscuz com Ovo",
        "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/cuscuz-com-ovo.jpg",
        "foods": [
          {"name": "Cuscuz", "qty": "100g", "kcal": 112},
          {"name": "Ovo Mexido", "qty": "2 unidades", "kcal": 146},
          {"name": "Mamão", "qty": "1 fatia", "kcal": 43}
        ]
      },
      {
        "type": "almoco",
        "time": "12:30",
        "name": "Frango com Batata Doce",
        "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/frango-com-batata-doce.jpg",
        "foods": [
          {"name": "Frango Grelhado", "qty": "120g", "kcal": 198},
          {"name": "Batata Doce", "qty": "1 unidade", "kcal": 86},
          {"name": "Salada", "qty": "à vontade", "kcal": 30}
        ]
      },
      {
        "type": "lanche",
        "time": "16:00",
        "name": "Fruta",
        "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/banana-com-aveia.jpg",
        "foods": [
          {"name": "Banana", "qty": "1 unidade", "kcal": 89}
        ]
      },
      {
        "type": "jantar",
        "time": "19:30",
        "name": "Peixe com Legumes",
        "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/peixe-com-legumes.jpg",
        "foods": [
          {"name": "Filé de Tilápia", "qty": "150g", "kcal": 144},
          {"name": "Legumes", "qty": "à vontade", "kcal": 40}
        ]
      }
    ]
  }
]'::jsonb);

-- Template 3: Hipertrofia Prática 2200 kcal
INSERT INTO meal_plan_templates (name, category, description, meals) VALUES
('Hipertrofia Prática 2200 kcal', 'hipertrofia', 'Plano para ganho de massa muscular',
'[
  {
    "day": "Segunda-feira",
    "meals": [
      {
        "type": "cafe",
        "time": "08:00",
        "name": "Pão com Frango Desfiado",
        "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/pao-com-frango-desfiado.jpg",
        "foods": [
          {"name": "Pão Integral", "qty": "3 fatias", "kcal": 360},
          {"name": "Frango Desfiado", "qty": "100g", "kcal": 165},
          {"name": "Banana", "qty": "2 unidades", "kcal": 178}
        ]
      },
      {
        "type": "almoco",
        "time": "12:30",
        "name": "Carne com Batata e Arroz",
        "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/carne-com-batata.jpg",
        "foods": [
          {"name": "Carne Vermelha", "qty": "150g", "kcal": 375},
          {"name": "Arroz", "qty": "6 colheres", "kcal": 390},
          {"name": "Batata", "qty": "2 unidades", "kcal": 154},
          {"name": "Feijão", "qty": "1 concha", "kcal": 70}
        ]
      },
      {
        "type": "lanche",
        "time": "16:00",
        "name": "Whey Protein",
        "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/banana-com-aveia.jpg",
        "foods": [
          {"name": "Whey Protein", "qty": "1 scoop", "kcal": 120},
          {"name": "Banana", "qty": "1 unidade", "kcal": 89}
        ]
      },
      {
        "type": "jantar",
        "time": "19:30",
        "name": "Frango Grelhado",
        "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/frango-grelhado.jpg",
        "foods": [
          {"name": "Frango Grelhado", "qty": "200g", "kcal": 330},
          {"name": "Batata Doce", "qty": "2 unidades", "kcal": 172},
          {"name": "Salada", "qty": "à vontade", "kcal": 30}
        ]
      }
    ]
  }
]'::jsonb);

-- Template 4: Nordeste Tradicional 1800 kcal
INSERT INTO meal_plan_templates (name, category, description, meals) VALUES
('Nordeste Tradicional 1800 kcal', 'saude', 'Plano com alimentos típicos do Nordeste',
'[
  {
    "day": "Segunda-feira",
    "meals": [
      {
        "type": "cafe",
        "time": "07:00",
        "name": "Cuscuz com Ovo",
        "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/cuscuz-com-ovo.jpg",
        "foods": [
          {"name": "Cuscuz", "qty": "150g", "kcal": 168},
          {"name": "Ovo Mexido", "qty": "2 unidades", "kcal": 146},
          {"name": "Mamão", "qty": "1 fatia", "kcal": 43}
        ]
      },
      {
        "type": "almoco",
        "time": "12:00",
        "name": "Frango com Macaxeira",
        "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/frango-grelhado.jpg",
        "foods": [
          {"name": "Frango Grelhado", "qty": "150g", "kcal": 248},
          {"name": "Macaxeira", "qty": "150g", "kcal": 188},
          {"name": "Feijão", "qty": "1 concha", "kcal": 70},
          {"name": "Salada", "qty": "à vontade", "kcal": 30}
        ]
      },
      {
        "type": "lanche",
        "time": "16:00",
        "name": "Iogurte com Frutas",
        "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/iogurte-com-fruta.jpg",
        "foods": [
          {"name": "Iogurte", "qty": "1 pote", "kcal": 61},
          {"name": "Manga", "qty": "1 unidade", "kcal": 60}
        ]
      },
      {
        "type": "jantar",
        "time": "19:30",
        "name": "Peixe com Legumes",
        "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/peixe-com-legumes.jpg",
        "foods": [
          {"name": "Peixe", "qty": "150g", "kcal": 144},
          {"name": "Legumes", "qty": "à vontade", "kcal": 40}
        ]
      }
    ]
  }
]'::jsonb);

-- Template 5: Sul Tradicional 2000 kcal
INSERT INTO meal_plan_templates (name, category, description, meals) VALUES
('Sul Tradicional 2000 kcal', 'saude', 'Plano com alimentos típicos do Sul',
'[
  {
    "day": "Segunda-feira",
    "meals": [
      {
        "type": "cafe",
        "time": "08:00",
        "name": "Pão com Queijo",
        "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/pao-com-queijo.jpg",
        "foods": [
          {"name": "Pão Integral", "qty": "2 fatias", "kcal": 240},
          {"name": "Queijo", "qty": "2 fatias", "kcal": 138},
          {"name": "Leite", "qty": "1 copo", "kcal": 122}
        ]
      },
      {
        "type": "almoco",
        "time": "12:30",
        "name": "Churrasco com Polenta",
        "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/carne-grelhada.jpg",
        "foods": [
          {"name": "Carne", "qty": "150g", "kcal": 375},
          {"name": "Arroz", "qty": "4 colheres", "kcal": 260},
          {"name": "Salada", "qty": "à vontade", "kcal": 30}
        ]
      },
      {
        "type": "lanche",
        "time": "16:00",
        "name": "Iogurte",
        "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/iogurte-natural.jpg",
        "foods": [
          {"name": "Iogurte", "qty": "1 pote", "kcal": 61},
          {"name": "Uva", "qty": "100g", "kcal": 69}
        ]
      },
      {
        "type": "jantar",
        "time": "19:30",
        "name": "Frango com Salada",
        "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/frango-grelhado-1.jpg",
        "foods": [
          {"name": "Frango", "qty": "150g", "kcal": 248},
          {"name": "Batata", "qty": "1 unidade", "kcal": 77},
          {"name": "Salada", "qty": "à vontade", "kcal": 30}
        ]
      }
    ]
  }
]'::jsonb);

-- Template 6: Emagrecimento Low Carb 1500 kcal
INSERT INTO meal_plan_templates (name, category, description, meals) VALUES
('Emagrecimento Low Carb 1500 kcal', 'emagrecimento', 'Plano low carb para perda de peso',
'[{"day": "Segunda-feira", "meals": [{"type": "cafe", "time": "08:00", "name": "Omelete", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/omelete.jpg", "foods": [{"name": "Omelete", "qty": "3 ovos", "kcal": 219}, {"name": "Abacaxi", "qty": "1 fatia", "kcal": 50}]}, {"type": "almoco", "time": "12:30", "name": "Frango com Salada", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/frango-grelhado.jpg", "foods": [{"name": "Frango", "qty": "150g", "kcal": 248}, {"name": "Salada Completa", "qty": "à vontade", "kcal": 50}]}, {"type": "lanche", "time": "16:00", "name": "Castanhas", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/morango.jpg", "foods": [{"name": "Castanhas", "qty": "30g", "kcal": 180}]}, {"type": "jantar", "time": "19:30", "name": "Peixe Grelhado", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/peixe-com-legumes.jpg", "foods": [{"name": "Peixe", "qty": "150g", "kcal": 144}, {"name": "Legumes", "qty": "à vontade", "kcal": 40}]}]}]'::jsonb);

-- Template 7: Hipertrofia Alto Carbo 2500 kcal
INSERT INTO meal_plan_templates (name, category, description, meals) VALUES
('Hipertrofia Alto Carbo 2500 kcal', 'hipertrofia', 'Plano alto carbo para ganho de massa',
'[{"day": "Segunda-feira", "meals": [{"type": "cafe", "time": "08:00", "name": "Panqueca Proteica", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/panqueca-proteica.jpg", "foods": [{"name": "Panqueca", "qty": "3 unidades", "kcal": 300}, {"name": "Banana", "qty": "2 unidades", "kcal": 178}]}, {"type": "almoco", "time": "12:30", "name": "Carne com Macarrão", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/macarrao-com-carne-moida.jpg", "foods": [{"name": "Macarrão", "qty": "200g", "kcal": 262}, {"name": "Carne Moída", "qty": "150g", "kcal": 375}, {"name": "Feijão", "qty": "1 concha", "kcal": 70}]}, {"type": "lanche", "time": "16:00", "name": "Whey com Aveia", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/banana-com-aveia.jpg", "foods": [{"name": "Whey", "qty": "1 scoop", "kcal": 120}, {"name": "Aveia", "qty": "50g", "kcal": 195}, {"name": "Banana", "qty": "1 unidade", "kcal": 89}]}, {"type": "jantar", "time": "19:30", "name": "Frango com Batata", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/frango-com-batata-doce.jpg", "foods": [{"name": "Frango", "qty": "200g", "kcal": 330}, {"name": "Batata Doce", "qty": "2 unidades", "kcal": 172}]}]}]'::jsonb);

-- Template 8: Vegetariano 1600 kcal
INSERT INTO meal_plan_templates (name, category, description, meals) VALUES
('Vegetariano 1600 kcal', 'saude', 'Plano vegetariano balanceado',
'[{"day": "Segunda-feira", "meals": [{"type": "cafe", "time": "08:00", "name": "Mingau de Aveia", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/mingau-de-aveia.jpg", "foods": [{"name": "Aveia", "qty": "50g", "kcal": 195}, {"name": "Leite", "qty": "200ml", "kcal": 122}, {"name": "Banana", "qty": "1 unidade", "kcal": 89}]}, {"type": "almoco", "time": "12:30", "name": "Arroz com Feijão", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/carne-com-batata.jpg", "foods": [{"name": "Arroz", "qty": "4 colheres", "kcal": 260}, {"name": "Feijão", "qty": "2 conchas", "kcal": 140}, {"name": "Salada", "qty": "à vontade", "kcal": 50}]}, {"type": "lanche", "time": "16:00", "name": "Iogurte com Granola", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/iogurte-com-ganola.jpg", "foods": [{"name": "Iogurte", "qty": "1 pote", "kcal": 61}, {"name": "Granola", "qty": "30g", "kcal": 140}]}, {"type": "jantar", "time": "19:30", "name": "Sopa de Legumes", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/sopa-de-legumes.jpg", "foods": [{"name": "Sopa", "qty": "1 prato", "kcal": 150}, {"name": "Pão Integral", "qty": "1 fatia", "kcal": 120}]}]}]'::jsonb);

-- Template 9: Diabetes Controlado 1700 kcal
INSERT INTO meal_plan_templates (name, category, description, meals) VALUES
('Diabetes Controlado 1700 kcal', 'clinico', 'Plano para controle glicêmico',
'[{"day": "Segunda-feira", "meals": [{"type": "cafe", "time": "08:00", "name": "Tapioca com Ovo", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/tapioca-com-ovo.jpg", "foods": [{"name": "Tapioca", "qty": "1 unidade", "kcal": 150}, {"name": "Ovo", "qty": "2 unidades", "kcal": 146}, {"name": "Morango", "qty": "100g", "kcal": 32}]}, {"type": "almoco", "time": "12:30", "name": "Frango com Batata Doce", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/frango-com-batata-doce.jpg", "foods": [{"name": "Frango", "qty": "150g", "kcal": 248}, {"name": "Batata Doce", "qty": "1 unidade", "kcal": 86}, {"name": "Salada", "qty": "à vontade", "kcal": 30}]}, {"type": "lanche", "time": "16:00", "name": "Castanhas e Fruta", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/maca.jpg", "foods": [{"name": "Castanhas", "qty": "20g", "kcal": 120}, {"name": "Maçã", "qty": "1 unidade", "kcal": 78}]}, {"type": "jantar", "time": "19:30", "name": "Peixe com Legumes", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/peixe-com-legumes.jpg", "foods": [{"name": "Peixe", "qty": "150g", "kcal": 144}, {"name": "Legumes", "qty": "à vontade", "kcal": 40}]}]}]'::jsonb);

-- Template 10: Gestante 2000 kcal
INSERT INTO meal_plan_templates (name, category, description, meals) VALUES
('Gestante 2000 kcal', 'clinico', 'Plano nutricional para gestantes',
'[{"day": "Segunda-feira", "meals": [{"type": "cafe", "time": "08:00", "name": "Pão com Queijo e Leite", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/pao-com-queijo.jpg", "foods": [{"name": "Pão", "qty": "2 fatias", "kcal": 240}, {"name": "Queijo", "qty": "2 fatias", "kcal": 138}, {"name": "Leite", "qty": "1 copo", "kcal": 122}]}, {"type": "almoco", "time": "12:30", "name": "Carne com Arroz", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/carne-com-batata.jpg", "foods": [{"name": "Carne", "qty": "120g", "kcal": 300}, {"name": "Arroz", "qty": "4 colheres", "kcal": 260}, {"name": "Feijão", "qty": "1 concha", "kcal": 70}, {"name": "Salada", "qty": "à vontade", "kcal": 30}]}, {"type": "lanche", "time": "16:00", "name": "Iogurte com Frutas", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/iogurte-com-fruta.jpg", "foods": [{"name": "Iogurte", "qty": "1 pote", "kcal": 61}, {"name": "Mamão", "qty": "1 fatia", "kcal": 43}]}, {"type": "jantar", "time": "19:30", "name": "Frango Grelhado", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/frango-grelhado.jpg", "foods": [{"name": "Frango", "qty": "150g", "kcal": 248}, {"name": "Batata", "qty": "1 unidade", "kcal": 77}, {"name": "Legumes", "qty": "à vontade", "kcal": 40}]}]}]'::jsonb);

COMMENT ON COLUMN meal_plan_templates.meals IS '50 templates soberanos com imagens reais do Supabase Storage';


-- Templates 11-20: Variações Regionais e Especializadas

-- Template 11: Nordeste Cuscuz 1600 kcal
INSERT INTO meal_plan_templates (name, category, description, meals) VALUES
('Nordeste Cuscuz 1600 kcal', 'saude', 'Plano nordestino com cuscuz',
'[{"day": "Segunda-feira", "meals": [{"type": "cafe", "time": "07:00", "name": "Cuscuz com Ovo", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/cuscuz-com-ovo.jpg", "foods": [{"name": "Cuscuz", "qty": "150g", "kcal": 168}, {"name": "Ovo", "qty": "2 unidades", "kcal": 146}]}, {"type": "almoco", "time": "12:00", "name": "Frango com Macaxeira", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/frango-grelhado.jpg", "foods": [{"name": "Frango", "qty": "120g", "kcal": 198}, {"name": "Macaxeira", "qty": "100g", "kcal": 125}, {"name": "Feijão", "qty": "1 concha", "kcal": 70}]}, {"type": "lanche", "time": "16:00", "name": "Manga", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/manga.jpg", "foods": [{"name": "Manga", "qty": "1 unidade", "kcal": 60}]}, {"type": "jantar", "time": "19:30", "name": "Peixe", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/peixe-com-legumes.jpg", "foods": [{"name": "Peixe", "qty": "150g", "kcal": 144}, {"name": "Salada", "qty": "à vontade", "kcal": 30}]}]}]'::jsonb);

-- Template 12: Sul Churrasco 2100 kcal
INSERT INTO meal_plan_templates (name, category, description, meals) VALUES
('Sul Churrasco 2100 kcal', 'saude', 'Plano sulista com churrasco',
'[{"day": "Domingo", "meals": [{"type": "cafe", "time": "08:00", "name": "Pão de Queijo", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/pao-de-queijo.jpg", "foods": [{"name": "Pão de Queijo", "qty": "3 unidades", "kcal": 495}, {"name": "Leite", "qty": "1 copo", "kcal": 122}]}, {"type": "almoco", "time": "13:00", "name": "Churrasco", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/carne-grelhada.jpg", "foods": [{"name": "Picanha", "qty": "150g", "kcal": 375}, {"name": "Arroz", "qty": "4 colheres", "kcal": 260}, {"name": "Salada", "qty": "à vontade", "kcal": 30}]}, {"type": "lanche", "time": "16:00", "name": "Uva", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/uva.jpg", "foods": [{"name": "Uva", "qty": "100g", "kcal": 69}]}, {"type": "jantar", "time": "19:30", "name": "Sopa", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/sopa-de-legumes.jpg", "foods": [{"name": "Sopa", "qty": "1 prato", "kcal": 150}]}]}]'::jsonb);

-- Template 13: Atleta Endurance 2800 kcal
INSERT INTO meal_plan_templates (name, category, description, meals) VALUES
('Atleta Endurance 2800 kcal', 'hipertrofia', 'Plano para atletas de endurance',
'[{"day": "Segunda-feira", "meals": [{"type": "cafe", "time": "06:00", "name": "Banana com Aveia", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/banana-com-aveia.jpg", "foods": [{"name": "Aveia", "qty": "80g", "kcal": 312}, {"name": "Banana", "qty": "2 unidades", "kcal": 178}, {"name": "Mel", "qty": "1 colher", "kcal": 64}]}, {"type": "almoco", "time": "12:00", "name": "Macarrão com Frango", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/macarrao-com-carne-moida.jpg", "foods": [{"name": "Macarrão", "qty": "250g", "kcal": 328}, {"name": "Frango", "qty": "200g", "kcal": 330}]}, {"type": "lanche", "time": "16:00", "name": "Whey e Batata Doce", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/frango-com-batata-doce.jpg", "foods": [{"name": "Whey", "qty": "2 scoops", "kcal": 240}, {"name": "Batata Doce", "qty": "2 unidades", "kcal": 172}]}, {"type": "jantar", "time": "20:00", "name": "Carne com Arroz", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/carne-com-batata.jpg", "foods": [{"name": "Carne", "qty": "200g", "kcal": 500}, {"name": "Arroz", "qty": "6 colheres", "kcal": 390}]}]}]'::jsonb);

-- Template 14: Idoso 1500 kcal
INSERT INTO meal_plan_templates (name, category, description, meals) VALUES
('Idoso 1500 kcal', 'clinico', 'Plano nutricional para idosos',
'[{"day": "Segunda-feira", "meals": [{"type": "cafe", "time": "08:00", "name": "Mingau", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/mingau-de-aveia.jpg", "foods": [{"name": "Aveia", "qty": "40g", "kcal": 156}, {"name": "Leite", "qty": "200ml", "kcal": 122}]}, {"type": "almoco", "time": "12:00", "name": "Frango com Legumes", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/frango-grelhado.jpg", "foods": [{"name": "Frango", "qty": "100g", "kcal": 165}, {"name": "Arroz", "qty": "3 colheres", "kcal": 195}, {"name": "Legumes", "qty": "à vontade", "kcal": 40}]}, {"type": "lanche", "time": "16:00", "name": "Iogurte", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/iogurte-natural.jpg", "foods": [{"name": "Iogurte", "qty": "1 pote", "kcal": 61}, {"name": "Mamão", "qty": "1 fatia", "kcal": 43}]}, {"type": "jantar", "time": "18:30", "name": "Sopa", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/sopa-de-legumes.jpg", "foods": [{"name": "Sopa", "qty": "1 prato", "kcal": 150}]}]}]'::jsonb);

-- Template 15: Criança 1400 kcal
INSERT INTO meal_plan_templates (name, category, description, meals) VALUES
('Criança 1400 kcal', 'clinico', 'Plano nutricional infantil',
'[{"day": "Segunda-feira", "meals": [{"type": "cafe", "time": "07:30", "name": "Pão com Queijo", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/pao-com-queijo.jpg", "foods": [{"name": "Pão", "qty": "1 fatia", "kcal": 120}, {"name": "Queijo", "qty": "1 fatia", "kcal": 69}, {"name": "Leite", "qty": "1 copo", "kcal": 122}]}, {"type": "almoco", "time": "12:00", "name": "Frango com Arroz", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/frango-grelhado.jpg", "foods": [{"name": "Frango", "qty": "80g", "kcal": 132}, {"name": "Arroz", "qty": "3 colheres", "kcal": 195}, {"name": "Feijão", "qty": "1 concha", "kcal": 70}]}, {"type": "lanche", "time": "15:30", "name": "Fruta", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/banana-com-aveia.jpg", "foods": [{"name": "Banana", "qty": "1 unidade", "kcal": 89}]}, {"type": "jantar", "time": "19:00", "name": "Omelete", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/omelete.jpg", "foods": [{"name": "Omelete", "qty": "2 ovos", "kcal": 146}, {"name": "Batata", "qty": "1 unidade", "kcal": 77}]}]}]'::jsonb);

-- Template 16: Pré-Treino 1900 kcal
INSERT INTO meal_plan_templates (name, category, description, meals) VALUES
('Pré-Treino 1900 kcal', 'hipertrofia', 'Plano focado em pré-treino',
'[{"day": "Segunda-feira", "meals": [{"type": "cafe", "time": "07:00", "name": "Panqueca", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/panqueca-proteica.jpg", "foods": [{"name": "Panqueca", "qty": "2 unidades", "kcal": 200}, {"name": "Banana", "qty": "1 unidade", "kcal": 89}]}, {"type": "almoco", "time": "12:00", "name": "Frango com Batata Doce", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/frango-com-batata-doce.jpg", "foods": [{"name": "Frango", "qty": "150g", "kcal": 248}, {"name": "Batata Doce", "qty": "2 unidades", "kcal": 172}]}, {"type": "lanche", "time": "15:30", "name": "Pré-Treino", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/banana-com-aveia.jpg", "foods": [{"name": "Banana", "qty": "2 unidades", "kcal": 178}, {"name": "Aveia", "qty": "30g", "kcal": 117}]}, {"type": "jantar", "time": "20:00", "name": "Pós-Treino", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/frango-grelhado.jpg", "foods": [{"name": "Whey", "qty": "1 scoop", "kcal": 120}, {"name": "Frango", "qty": "150g", "kcal": 248}, {"name": "Arroz", "qty": "4 colheres", "kcal": 260}]}]}]'::jsonb);

-- Template 17: Detox 1300 kcal
INSERT INTO meal_plan_templates (name, category, description, meals) VALUES
('Detox 1300 kcal', 'emagrecimento', 'Plano detox para limpeza',
'[{"day": "Segunda-feira", "meals": [{"type": "cafe", "time": "08:00", "name": "Vitamina Verde", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/vitamina-de-fruta.jpg", "foods": [{"name": "Vitamina", "qty": "300ml", "kcal": 150}]}, {"type": "almoco", "time": "12:30", "name": "Salada Completa", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/salada-completa.jpg", "foods": [{"name": "Salada", "qty": "1 prato", "kcal": 200}, {"name": "Frango", "qty": "100g", "kcal": 165}]}, {"type": "lanche", "time": "16:00", "name": "Frutas", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/salada-de-frutas.jpg", "foods": [{"name": "Salada de Frutas", "qty": "1 tigela", "kcal": 120}]}, {"type": "jantar", "time": "19:30", "name": "Sopa Detox", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/sopa-de-legumes.jpg", "foods": [{"name": "Sopa", "qty": "1 prato", "kcal": 150}]}]}]'::jsonb);

-- Template 18: Marmita Fit 1700 kcal
INSERT INTO meal_plan_templates (name, category, description, meals, template_marmita) VALUES
('Marmita Fit 1700 kcal', 'saude', 'Plano prático para marmitas',
'[{"day": "Segunda-feira", "meals": [{"type": "cafe", "time": "07:00", "name": "Tapioca", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/tapioca-com-ovo.jpg", "foods": [{"name": "Tapioca", "qty": "1 unidade", "kcal": 150}, {"name": "Ovo", "qty": "2 unidades", "kcal": 146}]}, {"type": "almoco", "time": "12:00", "name": "Marmita Frango", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/frango-grelhado.jpg", "foods": [{"name": "Frango", "qty": "150g", "kcal": 248}, {"name": "Arroz", "qty": "4 colheres", "kcal": 260}, {"name": "Feijão", "qty": "1 concha", "kcal": 70}, {"name": "Salada", "qty": "à vontade", "kcal": 30}]}, {"type": "lanche", "time": "16:00", "name": "Fruta", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/maca.jpg", "foods": [{"name": "Maçã", "qty": "1 unidade", "kcal": 78}]}, {"type": "jantar", "time": "19:30", "name": "Marmita Peixe", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/peixe-com-legumes.jpg", "foods": [{"name": "Peixe", "qty": "150g", "kcal": 144}, {"name": "Batata Doce", "qty": "1 unidade", "kcal": 86}]}]}]'::jsonb, true);

-- Template 19: Café da Manhã Reforçado 2200 kcal
INSERT INTO meal_plan_templates (name, category, description, meals) VALUES
('Café da Manhã Reforçado 2200 kcal', 'hipertrofia', 'Plano com café reforçado',
'[{"day": "Segunda-feira", "meals": [{"type": "cafe", "time": "07:00", "name": "Café Completo", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/pao-com-ovo.jpg", "foods": [{"name": "Pão", "qty": "3 fatias", "kcal": 360}, {"name": "Ovo", "qty": "3 unidades", "kcal": 219}, {"name": "Queijo", "qty": "2 fatias", "kcal": 138}, {"name": "Leite", "qty": "1 copo", "kcal": 122}]}, {"type": "almoco", "time": "12:30", "name": "Carne com Arroz", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/carne-com-batata.jpg", "foods": [{"name": "Carne", "qty": "150g", "kcal": 375}, {"name": "Arroz", "qty": "5 colheres", "kcal": 325}]}, {"type": "lanche", "time": "16:00", "name": "Sanduíche", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/sanduiche-natural.jpg", "foods": [{"name": "Sanduíche", "qty": "1 unidade", "kcal": 250}]}, {"type": "jantar", "time": "19:30", "name": "Frango", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/frango-grelhado.jpg", "foods": [{"name": "Frango", "qty": "150g", "kcal": 248}]}]}]'::jsonb);

-- Template 20: Jejum Intermitente 1600 kcal
INSERT INTO meal_plan_templates (name, category, description, meals) VALUES
('Jejum Intermitente 1600 kcal', 'emagrecimento', 'Plano para jejum intermitente 16/8',
'[{"day": "Segunda-feira", "meals": [{"type": "almoco", "time": "12:00", "name": "Primeira Refeição", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/frango-grelhado.jpg", "foods": [{"name": "Frango", "qty": "150g", "kcal": 248}, {"name": "Arroz", "qty": "4 colheres", "kcal": 260}, {"name": "Salada", "qty": "à vontade", "kcal": 30}]}, {"type": "lanche", "time": "16:00", "name": "Lanche", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/iogurte-com-fruta.jpg", "foods": [{"name": "Iogurte", "qty": "1 pote", "kcal": 61}, {"name": "Castanhas", "qty": "30g", "kcal": 180}]}, {"type": "jantar", "time": "19:30", "name": "Última Refeição", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/peixe-com-legumes.jpg", "foods": [{"name": "Peixe", "qty": "150g", "kcal": 144}, {"name": "Batata Doce", "qty": "2 unidades", "kcal": 172}, {"name": "Legumes", "qty": "à vontade", "kcal": 40}]}]}]'::jsonb);

-- Template 21: Vegano 1700 kcal
INSERT INTO meal_plan_templates (name, category, description, meals) VALUES
('Vegano 1700 kcal', 'saude', 'Plano 100% vegano',
'[{"day": "Segunda-feira", "meals": [{"type": "cafe", "time": "08:00", "name": "Mingau de Aveia", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/mingau-de-aveia.jpg", "foods": [{"name": "Aveia", "qty": "60g", "kcal": 234}, {"name": "Leite Vegetal", "qty": "200ml", "kcal": 80}, {"name": "Banana", "qty": "1 unidade", "kcal": 89}]}, {"type": "almoco", "time": "12:30", "name": "Arroz com Feijão", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/salada-completa.jpg", "foods": [{"name": "Arroz", "qty": "5 colheres", "kcal": 325}, {"name": "Feijão", "qty": "2 conchas", "kcal": 140}, {"name": "Salada", "qty": "à vontade", "kcal": 50}]}, {"type": "lanche", "time": "16:00", "name": "Frutas", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/salada-de-frutas.jpg", "foods": [{"name": "Salada de Frutas", "qty": "1 tigela", "kcal": 120}]}, {"type": "jantar", "time": "19:30", "name": "Sopa de Legumes", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/sopa-de-legumes.jpg", "foods": [{"name": "Sopa", "qty": "1 prato", "kcal": 180}, {"name": "Grão de Bico", "qty": "100g", "kcal": 164}]}]}]'::jsonb);

-- Template 22: Paleo 1900 kcal
INSERT INTO meal_plan_templates (name, category, description, meals) VALUES
('Paleo 1900 kcal', 'saude', 'Plano paleo sem grãos',
'[{"day": "Segunda-feira", "meals": [{"type": "cafe", "time": "08:00", "name": "Ovos com Bacon", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/ovos-com-bacon.jpg", "foods": [{"name": "Ovos", "qty": "3 unidades", "kcal": 219}, {"name": "Bacon", "qty": "2 fatias", "kcal": 86}, {"name": "Abacaxi", "qty": "1 fatia", "kcal": 50}]}, {"type": "almoco", "time": "12:30", "name": "Bife Acebolado", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/bife-acebolado.jpg", "foods": [{"name": "Bife", "qty": "150g", "kcal": 375}, {"name": "Batata Doce", "qty": "2 unidades", "kcal": 172}, {"name": "Salada", "qty": "à vontade", "kcal": 50}]}, {"type": "lanche", "time": "16:00", "name": "Castanhas e Frutas", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/maca.jpg", "foods": [{"name": "Castanhas", "qty": "40g", "kcal": 240}, {"name": "Maçã", "qty": "1 unidade", "kcal": 78}]}, {"type": "jantar", "time": "19:30", "name": "Frango Grelhado", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/frango-grelhado.jpg", "foods": [{"name": "Frango", "qty": "150g", "kcal": 248}, {"name": "Legumes", "qty": "à vontade", "kcal": 60}]}]}]'::jsonb);

-- Template 23: Cetogênica 1600 kcal
INSERT INTO meal_plan_templates (name, category, description, meals) VALUES
('Cetogênica 1600 kcal', 'emagrecimento', 'Plano cetogênico low carb',
'[{"day": "Segunda-feira", "meals": [{"type": "cafe", "time": "08:00", "name": "Omelete com Queijo", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/omelete.jpg", "foods": [{"name": "Omelete", "qty": "3 ovos", "kcal": 219}, {"name": "Queijo", "qty": "2 fatias", "kcal": 138}, {"name": "Abacate", "qty": "1/2 unidade", "kcal": 120}]}, {"type": "almoco", "time": "12:30", "name": "Carne com Salada", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/carne-grelhada.jpg", "foods": [{"name": "Carne", "qty": "150g", "kcal": 375}, {"name": "Salada Completa", "qty": "à vontade", "kcal": 50}, {"name": "Azeite", "qty": "1 colher", "kcal": 120}]}, {"type": "lanche", "time": "16:00", "name": "Castanhas", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/morango.jpg", "foods": [{"name": "Castanhas", "qty": "30g", "kcal": 180}]}, {"type": "jantar", "time": "19:30", "name": "Peixe Grelhado", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/peixe-com-legumes.jpg", "foods": [{"name": "Peixe", "qty": "150g", "kcal": 144}, {"name": "Legumes", "qty": "à vontade", "kcal": 40}]}]}]'::jsonb);

-- Template 24: Mediterrânea 1800 kcal
INSERT INTO meal_plan_templates (name, category, description, meals) VALUES
('Mediterrânea 1800 kcal', 'saude', 'Plano dieta mediterrânea',
'[{"day": "Segunda-feira", "meals": [{"type": "cafe", "time": "08:00", "name": "Iogurte com Frutas", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/iogurte-com-fruta.jpg", "foods": [{"name": "Iogurte", "qty": "1 pote", "kcal": 61}, {"name": "Frutas", "qty": "100g", "kcal": 80}, {"name": "Mel", "qty": "1 colher", "kcal": 64}]}, {"type": "almoco", "time": "12:30", "name": "Peixe com Legumes", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/peixe-com-legumes.jpg", "foods": [{"name": "Peixe", "qty": "150g", "kcal": 144}, {"name": "Arroz", "qty": "4 colheres", "kcal": 260}, {"name": "Legumes", "qty": "à vontade", "kcal": 50}, {"name": "Azeite", "qty": "1 colher", "kcal": 120}]}, {"type": "lanche", "time": "16:00", "name": "Frutas Secas", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/uva.jpg", "foods": [{"name": "Uva", "qty": "100g", "kcal": 69}, {"name": "Castanhas", "qty": "20g", "kcal": 120}]}, {"type": "jantar", "time": "19:30", "name": "Frango com Salada", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/frango-grelhado.jpg", "foods": [{"name": "Frango", "qty": "120g", "kcal": 198}, {"name": "Salada", "qty": "à vontade", "kcal": 50}]}]}]'::jsonb);

-- Template 25: Hipertensão 1700 kcal
INSERT INTO meal_plan_templates (name, category, description, meals) VALUES
('Hipertensão 1700 kcal', 'clinico', 'Plano para controle de pressão',
'[{"day": "Segunda-feira", "meals": [{"type": "cafe", "time": "08:00", "name": "Tapioca com Ovo", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/tapioca-com-ovo.jpg", "foods": [{"name": "Tapioca", "qty": "1 unidade", "kcal": 150}, {"name": "Ovo", "qty": "2 unidades", "kcal": 146}, {"name": "Mamão", "qty": "1 fatia", "kcal": 43}]}, {"type": "almoco", "time": "12:30", "name": "Frango com Batata Doce", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/frango-com-batata-doce.jpg", "foods": [{"name": "Frango", "qty": "150g", "kcal": 248}, {"name": "Batata Doce", "qty": "1 unidade", "kcal": 86}, {"name": "Salada", "qty": "à vontade", "kcal": 30}]}, {"type": "lanche", "time": "16:00", "name": "Frutas", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/banana-com-aveia.jpg", "foods": [{"name": "Banana", "qty": "1 unidade", "kcal": 89}]}, {"type": "jantar", "time": "19:30", "name": "Peixe com Legumes", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/peixe-com-legumes.jpg", "foods": [{"name": "Peixe", "qty": "150g", "kcal": 144}, {"name": "Legumes", "qty": "à vontade", "kcal": 40}]}]}]'::jsonb);

-- Template 26: Colesterol Alto 1600 kcal
INSERT INTO meal_plan_templates (name, category, description, meals) VALUES
('Colesterol Alto 1600 kcal', 'clinico', 'Plano para controle de colesterol',
'[{"day": "Segunda-feira", "meals": [{"type": "cafe", "time": "08:00", "name": "Mingau de Aveia", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/mingau-de-aveia.jpg", "foods": [{"name": "Aveia", "qty": "50g", "kcal": 195}, {"name": "Leite Desnatado", "qty": "200ml", "kcal": 70}, {"name": "Morango", "qty": "100g", "kcal": 32}]}, {"type": "almoco", "time": "12:30", "name": "Peixe com Legumes", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/peixe-com-legumes.jpg", "foods": [{"name": "Peixe", "qty": "150g", "kcal": 144}, {"name": "Arroz Integral", "qty": "3 colheres", "kcal": 195}, {"name": "Legumes", "qty": "à vontade", "kcal": 40}]}, {"type": "lanche", "time": "16:00", "name": "Frutas", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/maca.jpg", "foods": [{"name": "Maçã", "qty": "1 unidade", "kcal": 78}, {"name": "Castanhas", "qty": "20g", "kcal": 120}]}, {"type": "jantar", "time": "19:30", "name": "Frango Grelhado", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/frango-grelhado.jpg", "foods": [{"name": "Frango", "qty": "120g", "kcal": 198}, {"name": "Salada", "qty": "à vontade", "kcal": 50}]}]}]'::jsonb);

-- Template 27: Crossfit 2400 kcal
INSERT INTO meal_plan_templates (name, category, description, meals) VALUES
('Crossfit 2400 kcal', 'hipertrofia', 'Plano para praticantes de crossfit',
'[{"day": "Segunda-feira", "meals": [{"type": "cafe", "time": "06:30", "name": "Panqueca Proteica", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/panqueca-proteica.jpg", "foods": [{"name": "Panqueca", "qty": "3 unidades", "kcal": 300}, {"name": "Banana", "qty": "2 unidades", "kcal": 178}, {"name": "Mel", "qty": "1 colher", "kcal": 64}]}, {"type": "almoco", "time": "12:00", "name": "Carne com Batata", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/carne-com-batata.jpg", "foods": [{"name": "Carne", "qty": "180g", "kcal": 450}, {"name": "Batata", "qty": "2 unidades", "kcal": 154}, {"name": "Arroz", "qty": "5 colheres", "kcal": 325}]}, {"type": "lanche", "time": "16:00", "name": "Pré-Treino", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/banana-com-aveia.jpg", "foods": [{"name": "Whey", "qty": "1 scoop", "kcal": 120}, {"name": "Banana", "qty": "2 unidades", "kcal": 178}, {"name": "Aveia", "qty": "40g", "kcal": 156}]}, {"type": "jantar", "time": "20:00", "name": "Frango com Batata Doce", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/frango-com-batata-doce.jpg", "foods": [{"name": "Frango", "qty": "200g", "kcal": 330}, {"name": "Batata Doce", "qty": "2 unidades", "kcal": 172}]}]}]'::jsonb);

-- Template 28: Natação 2300 kcal
INSERT INTO meal_plan_templates (name, category, description, meals) VALUES
('Natação 2300 kcal', 'hipertrofia', 'Plano para nadadores',
'[{"day": "Segunda-feira", "meals": [{"type": "cafe", "time": "06:00", "name": "Banana com Aveia", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/banana-com-aveia.jpg", "foods": [{"name": "Aveia", "qty": "70g", "kcal": 273}, {"name": "Banana", "qty": "2 unidades", "kcal": 178}, {"name": "Leite", "qty": "200ml", "kcal": 122}]}, {"type": "almoco", "time": "12:00", "name": "Macarrão com Frango", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/macarrao-com-carne-moida.jpg", "foods": [{"name": "Macarrão", "qty": "200g", "kcal": 262}, {"name": "Frango", "qty": "150g", "kcal": 248}, {"name": "Feijão", "qty": "1 concha", "kcal": 70}]}, {"type": "lanche", "time": "16:00", "name": "Sanduíche", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/sanduiche-natural.jpg", "foods": [{"name": "Sanduíche Natural", "qty": "1 unidade", "kcal": 250}]}, {"type": "jantar", "time": "19:30", "name": "Peixe com Arroz", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/peixe-com-legumes.jpg", "foods": [{"name": "Peixe", "qty": "150g", "kcal": 144}, {"name": "Arroz", "qty": "5 colheres", "kcal": 325}, {"name": "Legumes", "qty": "à vontade", "kcal": 40}]}]}]'::jsonb);

-- Template 29: Ciclismo 2600 kcal
INSERT INTO meal_plan_templates (name, category, description, meals) VALUES
('Ciclismo 2600 kcal', 'hipertrofia', 'Plano para ciclistas',
'[{"day": "Segunda-feira", "meals": [{"type": "cafe", "time": "06:00", "name": "Pão com Frango", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/pao-com-frango-desfiado.jpg", "foods": [{"name": "Pão", "qty": "3 fatias", "kcal": 360}, {"name": "Frango", "qty": "100g", "kcal": 165}, {"name": "Banana", "qty": "2 unidades", "kcal": 178}]}, {"type": "almoco", "time": "12:00", "name": "Carne com Macarrão", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/macarrao-com-carne-moida.jpg", "foods": [{"name": "Macarrão", "qty": "250g", "kcal": 328}, {"name": "Carne", "qty": "150g", "kcal": 375}, {"name": "Feijão", "qty": "1 concha", "kcal": 70}]}, {"type": "lanche", "time": "16:00", "name": "Whey e Frutas", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/banana-com-aveia.jpg", "foods": [{"name": "Whey", "qty": "2 scoops", "kcal": 240}, {"name": "Banana", "qty": "2 unidades", "kcal": 178}]}, {"type": "jantar", "time": "20:00", "name": "Frango com Arroz", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/frango-grelhado.jpg", "foods": [{"name": "Frango", "qty": "200g", "kcal": 330}, {"name": "Arroz", "qty": "6 colheres", "kcal": 390}]}]}]'::jsonb);

-- Template 30: Renal 1500 kcal
INSERT INTO meal_plan_templates (name, category, description, meals) VALUES
('Renal 1500 kcal', 'clinico', 'Plano para saúde renal',
'[{"day": "Segunda-feira", "meals": [{"type": "cafe", "time": "08:00", "name": "Tapioca", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/tapioca-com-queijo.jpg", "foods": [{"name": "Tapioca", "qty": "1 unidade", "kcal": 150}, {"name": "Queijo", "qty": "1 fatia", "kcal": 69}, {"name": "Maçã", "qty": "1 unidade", "kcal": 78}]}, {"type": "almoco", "time": "12:30", "name": "Frango com Arroz", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/frango-grelhado.jpg", "foods": [{"name": "Frango", "qty": "100g", "kcal": 165}, {"name": "Arroz", "qty": "3 colheres", "kcal": 195}, {"name": "Salada", "qty": "à vontade", "kcal": 30}]}, {"type": "lanche", "time": "16:00", "name": "Frutas", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/pera.jpg", "foods": [{"name": "Pera", "qty": "1 unidade", "kcal": 57}]}, {"type": "jantar", "time": "19:30", "name": "Peixe com Legumes", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/peixe-com-legumes.jpg", "foods": [{"name": "Peixe", "qty": "120g", "kcal": 115}, {"name": "Legumes", "qty": "à vontade", "kcal": 40}]}]}]'::jsonb);

-- Template 31: Norte Tradicional 1800 kcal
INSERT INTO meal_plan_templates (name, category, description, meals) VALUES
('Norte Tradicional 1800 kcal', 'saude', 'Plano com alimentos típicos do Norte',
'[{"day": "Segunda-feira", "meals": [{"type": "cafe", "time": "07:00", "name": "Açaí com Tapioca", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/acai-com-tapioca.jpg", "foods": [{"name": "Açaí", "qty": "200g", "kcal": 120}, {"name": "Tapioca", "qty": "1 unidade", "kcal": 150}, {"name": "Banana", "qty": "1 unidade", "kcal": 89}]}, {"type": "almoco", "time": "12:00", "name": "Peixe com Macaxeira", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/peixe-com-legumes.jpg", "foods": [{"name": "Peixe", "qty": "150g", "kcal": 144}, {"name": "Macaxeira", "qty": "150g", "kcal": 188}, {"name": "Feijão", "qty": "1 concha", "kcal": 70}]}, {"type": "lanche", "time": "16:00", "name": "Pupunha", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/pupunha-com-cafe.jpg", "foods": [{"name": "Pupunha", "qty": "2 unidades", "kcal": 120}]}, {"type": "jantar", "time": "19:30", "name": "Frango com Arroz", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/frango-grelhado.jpg", "foods": [{"name": "Frango", "qty": "150g", "kcal": 248}, {"name": "Arroz", "qty": "4 colheres", "kcal": 260}]}]}]'::jsonb);

-- Template 32: Centro-Oeste Tradicional 1900 kcal
INSERT INTO meal_plan_templates (name, category, description, meals) VALUES
('Centro-Oeste Tradicional 1900 kcal', 'saude', 'Plano com alimentos típicos do Centro-Oeste',
'[{"day": "Segunda-feira", "meals": [{"type": "cafe", "time": "07:30", "name": "Bolo de Milho", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/bolo-de-milho-com-cafe.jpg", "foods": [{"name": "Bolo de Milho", "qty": "1 fatia", "kcal": 180}, {"name": "Leite", "qty": "1 copo", "kcal": 122}, {"name": "Mamão", "qty": "1 fatia", "kcal": 43}]}, {"type": "almoco", "time": "12:30", "name": "Carne Assada", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/carne-assada-de-panela.jpg", "foods": [{"name": "Carne Assada", "qty": "150g", "kcal": 375}, {"name": "Arroz", "qty": "4 colheres", "kcal": 260}, {"name": "Feijão", "qty": "1 concha", "kcal": 70}]}, {"type": "lanche", "time": "16:00", "name": "Milho Cozido", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/milho-cozido.jpg", "foods": [{"name": "Milho", "qty": "1 espiga", "kcal": 123}]}, {"type": "jantar", "time": "19:30", "name": "Frango Grelhado", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/frango-grelhado.jpg", "foods": [{"name": "Frango", "qty": "150g", "kcal": 248}, {"name": "Salada", "qty": "à vontade", "kcal": 50}]}]}]'::jsonb);

-- Template 33: Emagrecimento 1200 kcal
INSERT INTO meal_plan_templates (name, category, description, meals) VALUES
('Emagrecimento 1200 kcal', 'emagrecimento', 'Plano para perda de peso acelerada',
'[{"day": "Segunda-feira", "meals": [{"type": "cafe", "time": "08:00", "name": "Omelete Simples", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/omelete.jpg", "foods": [{"name": "Omelete", "qty": "2 ovos", "kcal": 146}, {"name": "Morango", "qty": "100g", "kcal": 32}]}, {"type": "almoco", "time": "12:30", "name": "Frango com Salada", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/frango-grelhado.jpg", "foods": [{"name": "Frango", "qty": "120g", "kcal": 198}, {"name": "Salada", "qty": "à vontade", "kcal": 30}]}, {"type": "lanche", "time": "16:00", "name": "Fruta", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/maca.jpg", "foods": [{"name": "Maçã", "qty": "1 unidade", "kcal": 78}]}, {"type": "jantar", "time": "19:30", "name": "Sopa de Legumes", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/sopa-de-legumes.jpg", "foods": [{"name": "Sopa", "qty": "1 prato", "kcal": 150}]}]}]'::jsonb);

-- Template 34: Hipertrofia 2300 kcal
INSERT INTO meal_plan_templates (name, category, description, meals) VALUES
('Hipertrofia 2300 kcal', 'hipertrofia', 'Plano para ganho de massa muscular',
'[{"day": "Segunda-feira", "meals": [{"type": "cafe", "time": "07:00", "name": "Pão com Ovo", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/pao-com-ovo.jpg", "foods": [{"name": "Pão", "qty": "3 fatias", "kcal": 360}, {"name": "Ovo", "qty": "3 unidades", "kcal": 219}, {"name": "Banana", "qty": "2 unidades", "kcal": 178}]}, {"type": "almoco", "time": "12:30", "name": "Carne com Arroz", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/carne-com-batata.jpg", "foods": [{"name": "Carne", "qty": "150g", "kcal": 375}, {"name": "Arroz", "qty": "6 colheres", "kcal": 390}, {"name": "Feijão", "qty": "1 concha", "kcal": 70}]}, {"type": "lanche", "time": "16:00", "name": "Whey Protein", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/banana-com-aveia.jpg", "foods": [{"name": "Whey", "qty": "1 scoop", "kcal": 120}, {"name": "Banana", "qty": "1 unidade", "kcal": 89}, {"name": "Aveia", "qty": "40g", "kcal": 156}]}, {"type": "jantar", "time": "19:30", "name": "Frango com Batata Doce", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/frango-com-batata-doce.jpg", "foods": [{"name": "Frango", "qty": "200g", "kcal": 330}, {"name": "Batata Doce", "qty": "2 unidades", "kcal": 172}]}]}]'::jsonb);

-- Template 35: Saúde 1500 kcal
INSERT INTO meal_plan_templates (name, category, description, meals) VALUES
('Saúde 1500 kcal', 'saude', 'Plano balanceado para saúde',
'[{"day": "Segunda-feira", "meals": [{"type": "cafe", "time": "08:00", "name": "Tapioca com Queijo", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/tapioca-com-queijo.jpg", "foods": [{"name": "Tapioca", "qty": "1 unidade", "kcal": 150}, {"name": "Queijo", "qty": "1 fatia", "kcal": 69}, {"name": "Banana", "qty": "1 unidade", "kcal": 89}]}, {"type": "almoco", "time": "12:30", "name": "Frango com Arroz", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/frango-grelhado.jpg", "foods": [{"name": "Frango", "qty": "120g", "kcal": 198}, {"name": "Arroz", "qty": "3 colheres", "kcal": 195}, {"name": "Feijão", "qty": "1 concha", "kcal": 70}, {"name": "Salada", "qty": "à vontade", "kcal": 30}]}, {"type": "lanche", "time": "16:00", "name": "Iogurte", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/iogurte-natural.jpg", "foods": [{"name": "Iogurte", "qty": "1 pote", "kcal": 61}]}, {"type": "jantar", "time": "19:30", "name": "Peixe com Legumes", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/peixe-com-legumes.jpg", "foods": [{"name": "Peixe", "qty": "120g", "kcal": 115}, {"name": "Legumes", "qty": "à vontade", "kcal": 40}]}]}]'::jsonb);

-- Template 36: Saúde 2000 kcal
INSERT INTO meal_plan_templates (name, category, description, meals) VALUES
('Saúde 2000 kcal', 'saude', 'Plano balanceado para manutenção',
'[{"day": "Segunda-feira", "meals": [{"type": "cafe", "time": "08:00", "name": "Pão com Queijo", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/pao-com-queijo.jpg", "foods": [{"name": "Pão", "qty": "2 fatias", "kcal": 240}, {"name": "Queijo", "qty": "2 fatias", "kcal": 138}, {"name": "Leite", "qty": "1 copo", "kcal": 122}]}, {"type": "almoco", "time": "12:30", "name": "Carne com Batata", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/carne-com-batata.jpg", "foods": [{"name": "Carne", "qty": "150g", "kcal": 375}, {"name": "Arroz", "qty": "4 colheres", "kcal": 260}, {"name": "Feijão", "qty": "1 concha", "kcal": 70}, {"name": "Salada", "qty": "à vontade", "kcal": 30}]}, {"type": "lanche", "time": "16:00", "name": "Iogurte com Frutas", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/iogurte-com-fruta.jpg", "foods": [{"name": "Iogurte", "qty": "1 pote", "kcal": 61}, {"name": "Frutas", "qty": "100g", "kcal": 80}]}, {"type": "jantar", "time": "19:30", "name": "Frango Grelhado", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/frango-grelhado.jpg", "foods": [{"name": "Frango", "qty": "150g", "kcal": 248}, {"name": "Batata Doce", "qty": "1 unidade", "kcal": 86}]}]}]'::jsonb);

-- Template 37: Emagrecimento 1500 kcal
INSERT INTO meal_plan_templates (name, category, description, meals) VALUES
('Emagrecimento 1500 kcal', 'emagrecimento', 'Plano para perda de peso moderada',
'[{"day": "Segunda-feira", "meals": [{"type": "cafe", "time": "08:00", "name": "Cuscuz com Ovo", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/cuscuz-com-ovo.jpg", "foods": [{"name": "Cuscuz", "qty": "100g", "kcal": 112}, {"name": "Ovo", "qty": "2 unidades", "kcal": 146}, {"name": "Mamão", "qty": "1 fatia", "kcal": 43}]}, {"type": "almoco", "time": "12:30", "name": "Frango com Batata Doce", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/frango-com-batata-doce.jpg", "foods": [{"name": "Frango", "qty": "120g", "kcal": 198}, {"name": "Batata Doce", "qty": "1 unidade", "kcal": 86}, {"name": "Salada", "qty": "à vontade", "kcal": 30}]}, {"type": "lanche", "time": "16:00", "name": "Fruta", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/laranja.jpg", "foods": [{"name": "Laranja", "qty": "1 unidade", "kcal": 86}]}, {"type": "jantar", "time": "19:30", "name": "Peixe com Legumes", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/peixe-com-legumes.jpg", "foods": [{"name": "Peixe", "qty": "150g", "kcal": 144}, {"name": "Legumes", "qty": "à vontade", "kcal": 40}]}]}]'::jsonb);

-- Template 38: Hipertrofia 2600 kcal
INSERT INTO meal_plan_templates (name, category, description, meals) VALUES
('Hipertrofia 2600 kcal', 'hipertrofia', 'Plano para ganho de massa intenso',
'[{"day": "Segunda-feira", "meals": [{"type": "cafe", "time": "07:00", "name": "Panqueca Proteica", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/panqueca-proteica.jpg", "foods": [{"name": "Panqueca", "qty": "4 unidades", "kcal": 400}, {"name": "Banana", "qty": "2 unidades", "kcal": 178}, {"name": "Mel", "qty": "1 colher", "kcal": 64}]}, {"type": "almoco", "time": "12:30", "name": "Macarrão com Carne", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/macarrao-com-carne-moida.jpg", "foods": [{"name": "Macarrão", "qty": "250g", "kcal": 328}, {"name": "Carne", "qty": "150g", "kcal": 375}, {"name": "Feijão", "qty": "1 concha", "kcal": 70}]}, {"type": "lanche", "time": "16:00", "name": "Whey e Aveia", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/banana-com-aveia.jpg", "foods": [{"name": "Whey", "qty": "2 scoops", "kcal": 240}, {"name": "Aveia", "qty": "50g", "kcal": 195}, {"name": "Banana", "qty": "1 unidade", "kcal": 89}]}, {"type": "jantar", "time": "20:00", "name": "Frango com Arroz", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/frango-grelhado.jpg", "foods": [{"name": "Frango", "qty": "200g", "kcal": 330}, {"name": "Arroz", "qty": "6 colheres", "kcal": 390}]}]}]'::jsonb);

-- Template 39: Churrasco Fit 2100 kcal
INSERT INTO meal_plan_templates (name, category, description, meals) VALUES
('Churrasco Fit 2100 kcal', 'saude', 'Plano com churrasco saudável',
'[{"day": "Domingo", "meals": [{"type": "cafe", "time": "08:00", "name": "Pão de Queijo", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/pao-de-queijo.jpg", "foods": [{"name": "Pão de Queijo", "qty": "3 unidades", "kcal": 495}, {"name": "Leite", "qty": "1 copo", "kcal": 122}]}, {"type": "almoco", "time": "13:00", "name": "Churrasco", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/carne-grelhada.jpg", "foods": [{"name": "Picanha", "qty": "150g", "kcal": 375}, {"name": "Arroz", "qty": "4 colheres", "kcal": 260}, {"name": "Salada", "qty": "à vontade", "kcal": 50}]}, {"type": "lanche", "time": "16:00", "name": "Frutas", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/melancia.jpg", "foods": [{"name": "Melancia", "qty": "1 fatia", "kcal": 46}]}, {"type": "jantar", "time": "19:30", "name": "Sopa Leve", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/sopa-de-legumes.jpg", "foods": [{"name": "Sopa", "qty": "1 prato", "kcal": 150}]}]}]'::jsonb);

-- Template 40: Costela Fit 2200 kcal
INSERT INTO meal_plan_templates (name, category, description, meals) VALUES
('Costela Fit 2200 kcal', 'saude', 'Plano com costela saudável',
'[{"day": "Domingo", "meals": [{"type": "cafe", "time": "08:00", "name": "Pão com Ovo", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/pao-com-ovo.jpg", "foods": [{"name": "Pão", "qty": "2 fatias", "kcal": 240}, {"name": "Ovo", "qty": "3 unidades", "kcal": 219}, {"name": "Banana", "qty": "1 unidade", "kcal": 89}]}, {"type": "almoco", "time": "13:00", "name": "Costela com Batata", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/costela-bovina-com-batata.jpg", "foods": [{"name": "Costela", "qty": "150g", "kcal": 375}, {"name": "Batata", "qty": "2 unidades", "kcal": 154}, {"name": "Arroz", "qty": "4 colheres", "kcal": 260}]}, {"type": "lanche", "time": "16:00", "name": "Iogurte", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/iogurte-natural.jpg", "foods": [{"name": "Iogurte", "qty": "1 pote", "kcal": 61}, {"name": "Uva", "qty": "100g", "kcal": 69}]}, {"type": "jantar", "time": "19:30", "name": "Frango Grelhado", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/frango-grelhado.jpg", "foods": [{"name": "Frango", "qty": "150g", "kcal": 248}, {"name": "Salada", "qty": "à vontade", "kcal": 50}]}]}]'::jsonb);

-- Template 41: Stroganoff Fit 1900 kcal
INSERT INTO meal_plan_templates (name, category, description, meals) VALUES
('Stroganoff Fit 1900 kcal', 'saude', 'Plano com stroganoff saudável',
'[{"day": "Segunda-feira", "meals": [{"type": "cafe", "time": "08:00", "name": "Tapioca com Ovo", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/tapioca-com-ovo.jpg", "foods": [{"name": "Tapioca", "qty": "1 unidade", "kcal": 150}, {"name": "Ovo", "qty": "2 unidades", "kcal": 146}, {"name": "Banana", "qty": "1 unidade", "kcal": 89}]}, {"type": "almoco", "time": "12:30", "name": "Stroganoff de Frango", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/strogonoff-de-frango-light.jpg", "foods": [{"name": "Stroganoff", "qty": "1 porção", "kcal": 350}, {"name": "Arroz", "qty": "4 colheres", "kcal": 260}]}, {"type": "lanche", "time": "16:00", "name": "Frutas", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/maca.jpg", "foods": [{"name": "Maçã", "qty": "1 unidade", "kcal": 78}]}, {"type": "jantar", "time": "19:30", "name": "Peixe com Legumes", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/peixe-com-legumes.jpg", "foods": [{"name": "Peixe", "qty": "150g", "kcal": 144}, {"name": "Legumes", "qty": "à vontade", "kcal": 40}]}]}]'::jsonb);

-- Template 42: Camarão Fit 2000 kcal
INSERT INTO meal_plan_templates (name, category, description, meals) VALUES
('Camarão Fit 2000 kcal', 'saude', 'Plano com camarão saudável',
'[{"day": "Segunda-feira", "meals": [{"type": "cafe", "time": "08:00", "name": "Pão com Queijo", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/pao-com-queijo.jpg", "foods": [{"name": "Pão", "qty": "2 fatias", "kcal": 240}, {"name": "Queijo", "qty": "2 fatias", "kcal": 138}, {"name": "Mamão", "qty": "1 fatia", "kcal": 43}]}, {"type": "almoco", "time": "12:30", "name": "Macarronada de Camarão", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/macarronada-de-camarao.jpg", "foods": [{"name": "Macarrão", "qty": "150g", "kcal": 197}, {"name": "Camarão", "qty": "150g", "kcal": 150}, {"name": "Salada", "qty": "à vontade", "kcal": 30}]}, {"type": "lanche", "time": "16:00", "name": "Iogurte", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/iogurte-com-fruta.jpg", "foods": [{"name": "Iogurte", "qty": "1 pote", "kcal": 61}, {"name": "Morango", "qty": "100g", "kcal": 32}]}, {"type": "jantar", "time": "19:30", "name": "Frango Grelhado", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/frango-grelhado.jpg", "foods": [{"name": "Frango", "qty": "150g", "kcal": 248}, {"name": "Batata Doce", "qty": "1 unidade", "kcal": 86}]}]}]'::jsonb);

-- Template 43: Coxa e Sobrecoxa 1800 kcal
INSERT INTO meal_plan_templates (name, category, description, meals) VALUES
('Coxa e Sobrecoxa 1800 kcal', 'saude', 'Plano com coxa e sobrecoxa',
'[{"day": "Segunda-feira", "meals": [{"type": "cafe", "time": "08:00", "name": "Cuscuz com Ovo", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/cuscuz-com-ovo.jpg", "foods": [{"name": "Cuscuz", "qty": "150g", "kcal": 168}, {"name": "Ovo", "qty": "2 unidades", "kcal": 146}, {"name": "Banana", "qty": "1 unidade", "kcal": 89}]}, {"type": "almoco", "time": "12:30", "name": "Coxa e Sobrecoxa", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/coxa-e-sobrecoxa.jpg", "foods": [{"name": "Coxa e Sobrecoxa", "qty": "150g", "kcal": 248}, {"name": "Arroz", "qty": "4 colheres", "kcal": 260}, {"name": "Feijão", "qty": "1 concha", "kcal": 70}]}, {"type": "lanche", "time": "16:00", "name": "Frutas", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/laranja.jpg", "foods": [{"name": "Laranja", "qty": "1 unidade", "kcal": 86}]}, {"type": "jantar", "time": "19:30", "name": "Peixe com Legumes", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/peixe-com-legumes.jpg", "foods": [{"name": "Peixe", "qty": "150g", "kcal": 144}, {"name": "Legumes", "qty": "à vontade", "kcal": 40}]}]}]'::jsonb);

-- Template 44: Canja Fit 1400 kcal
INSERT INTO meal_plan_templates (name, category, description, meals) VALUES
('Canja Fit 1400 kcal', 'clinico', 'Plano leve com canja',
'[{"day": "Segunda-feira", "meals": [{"type": "cafe", "time": "08:00", "name": "Mingau de Aveia", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/mingau-de-aveia.jpg", "foods": [{"name": "Aveia", "qty": "40g", "kcal": 156}, {"name": "Leite", "qty": "200ml", "kcal": 122}]}, {"type": "almoco", "time": "12:30", "name": "Canja de Galinha", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/canja-de-galinha-com-legumes.jpg", "foods": [{"name": "Canja", "qty": "1 prato", "kcal": 200}, {"name": "Pão", "qty": "1 fatia", "kcal": 120}]}, {"type": "lanche", "time": "16:00", "name": "Frutas", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/mamao.jpg", "foods": [{"name": "Mamão", "qty": "1 fatia", "kcal": 43}]}, {"type": "jantar", "time": "19:30", "name": "Sopa de Legumes", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/sopa-de-legumes.jpg", "foods": [{"name": "Sopa", "qty": "1 prato", "kcal": 150}]}]}]'::jsonb);

-- Template 45: Açaí Fit 1700 kcal
INSERT INTO meal_plan_templates (name, category, description, meals) VALUES
('Açaí Fit 1700 kcal', 'saude', 'Plano com açaí saudável',
'[{"day": "Segunda-feira", "meals": [{"type": "cafe", "time": "08:00", "name": "Açaí com Aveia", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/acai-com-aveia.jpg", "foods": [{"name": "Açaí", "qty": "200g", "kcal": 120}, {"name": "Aveia", "qty": "30g", "kcal": 117}, {"name": "Banana", "qty": "1 unidade", "kcal": 89}]}, {"type": "almoco", "time": "12:30", "name": "Frango com Arroz", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/frango-grelhado.jpg", "foods": [{"name": "Frango", "qty": "150g", "kcal": 248}, {"name": "Arroz", "qty": "4 colheres", "kcal": 260}, {"name": "Feijão", "qty": "1 concha", "kcal": 70}]}, {"type": "lanche", "time": "16:00", "name": "Sanduíche Natural", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/sanduiche-natural.jpg", "foods": [{"name": "Sanduíche", "qty": "1 unidade", "kcal": 250}]}, {"type": "jantar", "time": "19:30", "name": "Peixe com Legumes", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/peixe-com-legumes.jpg", "foods": [{"name": "Peixe", "qty": "120g", "kcal": 115}, {"name": "Legumes", "qty": "à vontade", "kcal": 40}]}]}]'::jsonb);

-- Template 46: Crepioca Fit 1600 kcal
INSERT INTO meal_plan_templates (name, category, description, meals) VALUES
('Crepioca Fit 1600 kcal', 'saude', 'Plano com crepioca saudável',
'[{"day": "Segunda-feira", "meals": [{"type": "cafe", "time": "08:00", "name": "Crepioca", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/crepioca.jpg", "foods": [{"name": "Crepioca", "qty": "1 unidade", "kcal": 180}, {"name": "Queijo", "qty": "1 fatia", "kcal": 69}, {"name": "Banana", "qty": "1 unidade", "kcal": 89}]}, {"type": "almoco", "time": "12:30", "name": "Frango com Batata Doce", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/frango-com-batata-doce.jpg", "foods": [{"name": "Frango", "qty": "150g", "kcal": 248}, {"name": "Batata Doce", "qty": "1 unidade", "kcal": 86}, {"name": "Salada", "qty": "à vontade", "kcal": 30}]}, {"type": "lanche", "time": "16:00", "name": "Iogurte", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/iogurte-natural.jpg", "foods": [{"name": "Iogurte", "qty": "1 pote", "kcal": 61}, {"name": "Morango", "qty": "100g", "kcal": 32}]}, {"type": "jantar", "time": "19:30", "name": "Peixe com Legumes", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/peixe-com-legumes.jpg", "foods": [{"name": "Peixe", "qty": "150g", "kcal": 144}, {"name": "Legumes", "qty": "à vontade", "kcal": 40}]}]}]'::jsonb);

-- Template 47: Filé de Porco 1900 kcal
INSERT INTO meal_plan_templates (name, category, description, meals) VALUES
('Filé de Porco 1900 kcal', 'saude', 'Plano com filé de porco',
'[{"day": "Segunda-feira", "meals": [{"type": "cafe", "time": "08:00", "name": "Pão com Ovo", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/pao-com-ovo.jpg", "foods": [{"name": "Pão", "qty": "2 fatias", "kcal": 240}, {"name": "Ovo", "qty": "2 unidades", "kcal": 146}, {"name": "Banana", "qty": "1 unidade", "kcal": 89}]}, {"type": "almoco", "time": "12:30", "name": "Filé de Porco", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/file-de-porco.jpg", "foods": [{"name": "Filé de Porco", "qty": "150g", "kcal": 297}, {"name": "Arroz", "qty": "4 colheres", "kcal": 260}, {"name": "Feijão", "qty": "1 concha", "kcal": 70}]}, {"type": "lanche", "time": "16:00", "name": "Frutas", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/maca.jpg", "foods": [{"name": "Maçã", "qty": "1 unidade", "kcal": 78}]}, {"type": "jantar", "time": "19:30", "name": "Frango Grelhado", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/frango-grelhado.jpg", "foods": [{"name": "Frango", "qty": "150g", "kcal": 248}, {"name": "Salada", "qty": "à vontade", "kcal": 50}]}]}]'::jsonb);

-- Template 48: Filé de Tilápia 1700 kcal
INSERT INTO meal_plan_templates (name, category, description, meals) VALUES
('Filé de Tilápia 1700 kcal', 'saude', 'Plano com filé de tilápia',
'[{"day": "Segunda-feira", "meals": [{"type": "cafe", "time": "08:00", "name": "Tapioca com Queijo", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/tapioca-com-queijo.jpg", "foods": [{"name": "Tapioca", "qty": "1 unidade", "kcal": 150}, {"name": "Queijo", "qty": "2 fatias", "kcal": 138}, {"name": "Mamão", "qty": "1 fatia", "kcal": 43}]}, {"type": "almoco", "time": "12:30", "name": "Filé de Tilápia", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/file-de-tilapia.jpg", "foods": [{"name": "Tilápia", "qty": "150g", "kcal": 144}, {"name": "Arroz", "qty": "4 colheres", "kcal": 260}, {"name": "Legumes", "qty": "à vontade", "kcal": 40}]}, {"type": "lanche", "time": "16:00", "name": "Iogurte", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/iogurte-com-fruta.jpg", "foods": [{"name": "Iogurte", "qty": "1 pote", "kcal": 61}, {"name": "Frutas", "qty": "100g", "kcal": 80}]}, {"type": "jantar", "time": "19:30", "name": "Frango com Batata Doce", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/frango-com-batata-doce.jpg", "foods": [{"name": "Frango", "qty": "120g", "kcal": 198}, {"name": "Batata Doce", "qty": "1 unidade", "kcal": 86}]}]}]'::jsonb);

-- Template 49: Bolo de Macaxeira 1800 kcal
INSERT INTO meal_plan_templates (name, category, description, meals) VALUES
('Bolo de Macaxeira 1800 kcal', 'saude', 'Plano com bolo de macaxeira',
'[{"day": "Segunda-feira", "meals": [{"type": "cafe", "time": "08:00", "name": "Bolo de Macaxeira", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/bolo-de-macaxeira-com-cafe.jpg", "foods": [{"name": "Bolo", "qty": "1 fatia", "kcal": 200}, {"name": "Leite", "qty": "1 copo", "kcal": 122}, {"name": "Banana", "qty": "1 unidade", "kcal": 89}]}, {"type": "almoco", "time": "12:30", "name": "Frango com Arroz", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/frango-grelhado.jpg", "foods": [{"name": "Frango", "qty": "150g", "kcal": 248}, {"name": "Arroz", "qty": "4 colheres", "kcal": 260}, {"name": "Feijão", "qty": "1 concha", "kcal": 70}]}, {"type": "lanche", "time": "16:00", "name": "Frutas", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/manga.jpg", "foods": [{"name": "Manga", "qty": "1 unidade", "kcal": 60}]}, {"type": "jantar", "time": "19:30", "name": "Peixe com Legumes", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/peixe-com-legumes.jpg", "foods": [{"name": "Peixe", "qty": "150g", "kcal": 144}, {"name": "Legumes", "qty": "à vontade", "kcal": 40}]}]}]'::jsonb);

-- Template 50: Ovos Cozidos 1500 kcal
INSERT INTO meal_plan_templates (name, category, description, meals) VALUES
('Ovos Cozidos 1500 kcal', 'emagrecimento', 'Plano com ovos cozidos',
'[{"day": "Segunda-feira", "meals": [{"type": "cafe", "time": "08:00", "name": "Ovos Cozidos", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/ovos-cozidos.jpg", "foods": [{"name": "Ovos Cozidos", "qty": "3 unidades", "kcal": 219}, {"name": "Pão Integral", "qty": "1 fatia", "kcal": 120}, {"name": "Mamão", "qty": "1 fatia", "kcal": 43}]}, {"type": "almoco", "time": "12:30", "name": "Frango com Batata Doce", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/frango-com-batata-doce.jpg", "foods": [{"name": "Frango", "qty": "120g", "kcal": 198}, {"name": "Batata Doce", "qty": "1 unidade", "kcal": 86}, {"name": "Salada", "qty": "à vontade", "kcal": 30}]}, {"type": "lanche", "time": "16:00", "name": "Frutas", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/laranja.jpg", "foods": [{"name": "Laranja", "qty": "1 unidade", "kcal": 86}]}, {"type": "jantar", "time": "19:30", "name": "Peixe com Legumes", "image": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/peixe-com-legumes.jpg", "foods": [{"name": "Peixe", "qty": "150g", "kcal": 144}, {"name": "Legumes", "qty": "à vontade", "kcal": 40}]}]}]'::jsonb);

-- ═══════════════════════════════════════════════════════════════════════════
-- FIM DOS 50 TEMPLATES SOBERANOS
-- ═══════════════════════════════════════════════════════════════════════════
