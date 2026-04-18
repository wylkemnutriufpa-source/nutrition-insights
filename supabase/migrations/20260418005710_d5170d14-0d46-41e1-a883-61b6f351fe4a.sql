-- Inserir templates práticos, rápidos e baratos (Geração v3 - Práticos)
-- Estrutura modular com foco em alimentos acessíveis e ampla substituição

INSERT INTO public.diet_templates (
  slug, name, description, icon, category, goal_category, diet_style,
  complexity_level, food_access_level, clinical_tags, conditions,
  base_calories, macro_ratio, meals, tags, template_generation, is_active
) VALUES
-- 1. Prático Manutenção (Base universal)
(
  'pratico-manutencao-v1',
  'Prático Manutenção',
  'Cardápio simples, rápido e barato com alimentos do dia a dia. Totalmente editável — ajuste quantidades e substitua livremente.',
  '🍳',
  'pratico',
  'manutencao',
  'tradicional',
  'simples',
  'básico',
  ARRAY['pratico','barato','rapido','editavel']::text[],
  ARRAY[]::text[],
  2000,
  '{"protein": 25, "carbs": 50, "fat": 25}'::jsonb,
  '[
    {
      "meal_type": "breakfast",
      "title": "Café da Manhã",
      "foods": [
        {"name":"Pão francês com ovo","portion":"1 pão + 1 ovo","calories":210,"protein":11,"carbs":24,"fat":8,"substitutions":["Tapioca com ovo","Cuscuz com ovo","Pão com queijo","Tapioca com queijo","Cuscuz com queijo"]},
        {"name":"Café com leite","portion":"1 xícara (200ml)","calories":80,"protein":4,"carbs":8,"fat":3,"substitutions":["Café preto","Chá","Café com leite vegetal"]},
        {"name":"Fruta da estação","portion":"1 unidade ou fatia","calories":70,"protein":1,"carbs":18,"fat":0,"substitutions":["Banana","Maçã","Mamão","Melão","Laranja"]}
      ]
    },
    {
      "meal_type": "morning_snack",
      "title": "Lanche da Manhã",
      "foods": [
        {"name":"Fruta livre","portion":"1 unidade ou fatia","calories":80,"protein":1,"carbs":20,"fat":0,"substitutions":["Banana","Maçã","Mamão","Melão","Pera","Laranja","Abacaxi"]}
      ]
    },
    {
      "meal_type": "lunch",
      "title": "Almoço",
      "foods": [
        {"name":"Proteína (frango grelhado)","portion":"120g","calories":200,"protein":32,"carbs":0,"fat":7,"substitutions":["Carne bovina magra","Peixe assado","Carne de porco magra","Ovos mexidos"]},
        {"name":"Carboidrato (arroz branco)","portion":"4 colheres de sopa","calories":160,"protein":3,"carbs":34,"fat":1,"substitutions":["Macarrão cozido","Purê de batata","Batata cozida","Batata doce","Arroz integral"]},
        {"name":"Leguminosa (feijão)","portion":"1 concha","calories":110,"protein":7,"carbs":18,"fat":1,"substitutions":["Grão de bico","Lentilha","Feijão verde","Feijão preto"]},
        {"name":"Salada livre","portion":"à vontade","calories":50,"protein":2,"carbs":8,"fat":1,"substitutions":["Salada crua mista","Legumes cozidos","Refogado de folhas"]},
        {"name":"Fruta sobremesa (opcional)","portion":"1 unidade pequena","calories":60,"protein":1,"carbs":15,"fat":0,"substitutions":["Maçã","Pera","Laranja","Mexerica"]}
      ]
    },
    {
      "meal_type": "afternoon_snack",
      "title": "Lanche da Tarde",
      "foods": [
        {"name":"Fruta ou opção do café","portion":"1 unidade","calories":120,"protein":3,"carbs":22,"fat":2,"substitutions":["Fruta da estação","Pão com queijo","Tapioca com queijo","Cuscuz com ovo","Iogurte"]}
      ]
    },
    {
      "meal_type": "dinner",
      "title": "Jantar",
      "foods": [
        {"name":"Proteína (peixe ou frango)","portion":"120g","calories":190,"protein":30,"carbs":0,"fat":7,"substitutions":["Frango grelhado","Carne bovina magra","Peixe assado","Carne de porco magra","Omelete (2 ovos)"]},
        {"name":"Carboidrato","portion":"3 colheres de sopa","calories":120,"protein":2,"carbs":26,"fat":1,"substitutions":["Arroz","Macarrão","Purê de batata","Batata cozida","Batata doce"]},
        {"name":"Leguminosa","portion":"1 concha pequena","calories":80,"protein":5,"carbs":13,"fat":1,"substitutions":["Feijão","Grão de bico","Lentilha","Feijão verde"]},
        {"name":"Salada livre","portion":"à vontade","calories":50,"protein":2,"carbs":8,"fat":1,"substitutions":["Salada crua","Legumes cozidos"]}
      ]
    },
    {
      "meal_type": "evening_snack",
      "title": "Ceia (opcional)",
      "foods": [
        {"name":"Fruta ou chá","portion":"1 unidade ou 1 xícara","calories":70,"protein":1,"carbs":15,"fat":0,"substitutions":["Fruta","Chá","Iogurte","Leite morno"]}
      ]
    }
  ]'::jsonb,
  ARRAY['pratico','barato','editavel','base']::text[],
  'official_v2',
  true
),
-- 2. Prático Emagrecimento
(
  'pratico-emagrecimento-v1',
  'Prático Emagrecimento',
  'Cardápio prático com porções reduzidas e foco em frutas nos lanches. Editável e barato.',
  '🥗',
  'pratico',
  'emagrecimento',
  'tradicional',
  'simples',
  'básico',
  ARRAY['pratico','barato','emagrecimento','editavel']::text[],
  ARRAY[]::text[],
  1500,
  '{"protein": 30, "carbs": 45, "fat": 25}'::jsonb,
  '[
    {
      "meal_type":"breakfast","title":"Café da Manhã",
      "foods":[
        {"name":"Tapioca com ovo","portion":"1 unidade pequena + 1 ovo","calories":180,"protein":10,"carbs":22,"fat":6,"substitutions":["Pão francês com ovo","Cuscuz com ovo","Pão com queijo","Tapioca com queijo"]},
        {"name":"Café preto","portion":"1 xícara","calories":5,"protein":0,"carbs":1,"fat":0,"substitutions":["Café com leite","Chá"]},
        {"name":"Fruta","portion":"1 fatia","calories":60,"protein":1,"carbs":15,"fat":0,"substitutions":["Mamão","Melão","Maçã","Laranja"]}
      ]
    },
    {
      "meal_type":"morning_snack","title":"Lanche da Manhã",
      "foods":[{"name":"Fruta","portion":"1 unidade","calories":70,"protein":1,"carbs":18,"fat":0,"substitutions":["Maçã","Pera","Laranja","Mexerica","Banana"]}]
    },
    {
      "meal_type":"lunch","title":"Almoço",
      "foods":[
        {"name":"Proteína magra","portion":"120g","calories":180,"protein":32,"carbs":0,"fat":5,"substitutions":["Frango grelhado","Peixe","Carne magra","Ovos"]},
        {"name":"Carboidrato","portion":"2 colheres de sopa","calories":80,"protein":2,"carbs":17,"fat":0,"substitutions":["Arroz","Batata doce","Batata cozida","Macarrão","Purê"]},
        {"name":"Feijão","portion":"1/2 concha","calories":55,"protein":4,"carbs":9,"fat":0,"substitutions":["Lentilha","Grão de bico","Feijão verde"]},
        {"name":"Salada livre","portion":"à vontade","calories":50,"protein":2,"carbs":8,"fat":1,"substitutions":["Salada crua","Legumes cozidos"]}
      ]
    },
    {
      "meal_type":"afternoon_snack","title":"Lanche da Tarde",
      "foods":[{"name":"Fruta","portion":"1 unidade","calories":80,"protein":1,"carbs":20,"fat":0,"substitutions":["Maçã","Pera","Mamão","Melão","Laranja"]}]
    },
    {
      "meal_type":"dinner","title":"Jantar",
      "foods":[
        {"name":"Proteína magra","portion":"120g","calories":180,"protein":32,"carbs":0,"fat":5,"substitutions":["Frango","Peixe","Carne magra","Ovos","Carne de porco magra"]},
        {"name":"Carboidrato","portion":"2 colheres de sopa","calories":80,"protein":2,"carbs":17,"fat":0,"substitutions":["Arroz","Batata doce","Batata cozida","Macarrão","Purê"]},
        {"name":"Salada livre","portion":"à vontade","calories":60,"protein":3,"carbs":10,"fat":1,"substitutions":["Salada crua","Legumes cozidos"]}
      ]
    }
  ]'::jsonb,
  ARRAY['pratico','barato','emagrecimento','editavel']::text[],
  'official_v2',
  true
),
-- 3. Prático Hipertrofia
(
  'pratico-hipertrofia-v1',
  'Prático Hipertrofia',
  'Cardápio prático com porções aumentadas para ganho de massa. Alimentos comuns e baratos.',
  '💪',
  'pratico',
  'hipertrofia',
  'tradicional',
  'simples',
  'básico',
  ARRAY['pratico','barato','hipertrofia','editavel']::text[],
  ARRAY[]::text[],
  2800,
  '{"protein": 30, "carbs": 50, "fat": 20}'::jsonb,
  '[
    {
      "meal_type":"breakfast","title":"Café da Manhã",
      "foods":[
        {"name":"Pão com ovo (reforçado)","portion":"2 pães + 2 ovos","calories":420,"protein":22,"carbs":48,"fat":16,"substitutions":["Tapioca grande com 2 ovos","Cuscuz com 2 ovos","Pão com queijo (2)","Tapioca com queijo (2)"]},
        {"name":"Café com leite","portion":"1 xícara grande","calories":120,"protein":6,"carbs":12,"fat":4,"substitutions":["Café preto","Vitamina de banana","Leite com aveia"]},
        {"name":"Fruta","portion":"1 unidade média","calories":100,"protein":1,"carbs":25,"fat":0,"substitutions":["Banana","Mamão","Maçã","Manga"]}
      ]
    },
    {
      "meal_type":"morning_snack","title":"Lanche da Manhã",
      "foods":[
        {"name":"Fruta + carboidrato","portion":"1 fruta + 1 fatia pão/tapioca","calories":200,"protein":5,"carbs":42,"fat":2,"substitutions":["Banana com pão","Vitamina","Tapioca com queijo","Cuscuz"]}
      ]
    },
    {
      "meal_type":"lunch","title":"Almoço (reforçado)",
      "foods":[
        {"name":"Proteína (frango/carne)","portion":"180g","calories":300,"protein":48,"carbs":0,"fat":11,"substitutions":["Frango grelhado","Carne bovina","Peixe","Carne de porco"]},
        {"name":"Carboidrato","portion":"6 colheres de sopa","calories":240,"protein":4,"carbs":52,"fat":1,"substitutions":["Arroz","Macarrão","Purê","Batata doce","Batata cozida"]},
        {"name":"Feijão (concha cheia)","portion":"1 concha grande","calories":160,"protein":10,"carbs":26,"fat":1,"substitutions":["Grão de bico","Lentilha","Feijão verde"]},
        {"name":"Salada livre","portion":"à vontade","calories":60,"protein":3,"carbs":10,"fat":1,"substitutions":["Salada crua","Legumes cozidos"]},
        {"name":"Fruta sobremesa","portion":"1 unidade","calories":90,"protein":1,"carbs":22,"fat":0,"substitutions":["Banana","Maçã","Laranja"]}
      ]
    },
    {
      "meal_type":"afternoon_snack","title":"Lanche da Tarde",
      "foods":[
        {"name":"Pão/Tapioca com queijo + fruta","portion":"2 unidades + 1 fruta","calories":350,"protein":15,"carbs":50,"fat":10,"substitutions":["Pão com queijo (2)","Tapioca com queijo (2)","Cuscuz com ovo","Vitamina"]}
      ]
    },
    {
      "meal_type":"dinner","title":"Jantar (reforçado)",
      "foods":[
        {"name":"Proteína","portion":"180g","calories":280,"protein":45,"carbs":0,"fat":10,"substitutions":["Frango","Carne","Peixe","Carne de porco","Omelete (3 ovos)"]},
        {"name":"Carboidrato","portion":"5 colheres de sopa","calories":200,"protein":4,"carbs":42,"fat":1,"substitutions":["Arroz","Macarrão","Purê","Batata doce","Batata"]},
        {"name":"Feijão","portion":"1 concha","calories":110,"protein":7,"carbs":18,"fat":1,"substitutions":["Grão de bico","Lentilha","Feijão verde"]},
        {"name":"Salada","portion":"à vontade","calories":50,"protein":2,"carbs":8,"fat":1,"substitutions":["Salada crua","Legumes cozidos"]}
      ]
    },
    {
      "meal_type":"evening_snack","title":"Ceia",
      "foods":[
        {"name":"Vitamina ou leite","portion":"1 copo grande","calories":220,"protein":10,"carbs":30,"fat":6,"substitutions":["Vitamina de banana","Leite com aveia","Iogurte com fruta","Pão com queijo"]}
      ]
    }
  ]'::jsonb,
  ARRAY['pratico','barato','hipertrofia','editavel']::text[],
  'official_v2',
  true
),
-- 4. Prático Sem Lactose
(
  'pratico-sem-lactose-v1',
  'Prático Sem Lactose',
  'Versão sem lactose do cardápio prático. Substitui leite e queijo por equivalentes seguros.',
  '🥥',
  'pratico',
  'manutencao',
  'sem_lactose',
  'simples',
  'básico',
  ARRAY['pratico','barato','sem_lactose','editavel']::text[],
  ARRAY['intolerancia_lactose']::text[],
  2000,
  '{"protein": 25, "carbs": 50, "fat": 25}'::jsonb,
  '[
    {
      "meal_type":"breakfast","title":"Café da Manhã",
      "foods":[
        {"name":"Tapioca com ovo","portion":"1 unidade + 1 ovo","calories":190,"protein":10,"carbs":24,"fat":6,"substitutions":["Pão francês com ovo","Cuscuz com ovo","Pão com pasta de amendoim"]},
        {"name":"Café preto ou com leite vegetal","portion":"1 xícara","calories":40,"protein":1,"carbs":4,"fat":2,"substitutions":["Café preto","Chá","Leite de coco","Leite de amêndoas"]},
        {"name":"Fruta","portion":"1 unidade","calories":80,"protein":1,"carbs":20,"fat":0,"substitutions":["Banana","Mamão","Maçã","Laranja"]}
      ]
    },
    {
      "meal_type":"morning_snack","title":"Lanche da Manhã",
      "foods":[{"name":"Fruta","portion":"1 unidade","calories":80,"protein":1,"carbs":20,"fat":0,"substitutions":["Banana","Maçã","Pera","Mamão"]}]
    },
    {
      "meal_type":"lunch","title":"Almoço",
      "foods":[
        {"name":"Proteína","portion":"120g","calories":200,"protein":32,"carbs":0,"fat":7,"substitutions":["Frango","Carne","Peixe","Porco"]},
        {"name":"Carboidrato","portion":"4 colheres de sopa","calories":160,"protein":3,"carbs":34,"fat":1,"substitutions":["Arroz","Macarrão sem leite","Batata doce","Batata cozida","Purê com leite vegetal"]},
        {"name":"Feijão","portion":"1 concha","calories":110,"protein":7,"carbs":18,"fat":1,"substitutions":["Grão de bico","Lentilha","Feijão verde"]},
        {"name":"Salada","portion":"à vontade","calories":50,"protein":2,"carbs":8,"fat":1,"substitutions":["Salada crua","Legumes cozidos"]}
      ]
    },
    {
      "meal_type":"afternoon_snack","title":"Lanche da Tarde",
      "foods":[
        {"name":"Fruta ou tapioca","portion":"1 unidade","calories":120,"protein":2,"carbs":25,"fat":1,"substitutions":["Fruta","Tapioca pura","Cuscuz","Pão com pasta de amendoim"]}
      ]
    },
    {
      "meal_type":"dinner","title":"Jantar",
      "foods":[
        {"name":"Proteína","portion":"120g","calories":190,"protein":30,"carbs":0,"fat":7,"substitutions":["Frango","Peixe","Carne","Porco","Ovos"]},
        {"name":"Carboidrato","portion":"3 colheres de sopa","calories":120,"protein":2,"carbs":26,"fat":1,"substitutions":["Arroz","Batata","Batata doce","Macarrão sem leite"]},
        {"name":"Feijão","portion":"1 concha pequena","calories":80,"protein":5,"carbs":13,"fat":1,"substitutions":["Grão de bico","Lentilha"]},
        {"name":"Salada","portion":"à vontade","calories":50,"protein":2,"carbs":8,"fat":1,"substitutions":["Salada crua","Legumes cozidos"]}
      ]
    }
  ]'::jsonb,
  ARRAY['pratico','barato','sem_lactose','editavel']::text[],
  'official_v2',
  true
),
-- 5. Prático Sem Glúten
(
  'pratico-sem-gluten-v1',
  'Prático Sem Glúten',
  'Versão sem glúten do cardápio prático. Prioriza tapioca, cuscuz e arroz.',
  '🌾',
  'pratico',
  'manutencao',
  'sem_gluten',
  'simples',
  'básico',
  ARRAY['pratico','barato','sem_gluten','editavel']::text[],
  ARRAY['doenca_celiaca','sensibilidade_gluten']::text[],
  2000,
  '{"protein": 25, "carbs": 50, "fat": 25}'::jsonb,
  '[
    {
      "meal_type":"breakfast","title":"Café da Manhã",
      "foods":[
        {"name":"Tapioca com ovo","portion":"1 unidade + 1 ovo","calories":190,"protein":10,"carbs":24,"fat":6,"substitutions":["Cuscuz com ovo","Tapioca com queijo","Cuscuz com queijo","Ovos mexidos com fruta"]},
        {"name":"Café com leite","portion":"1 xícara","calories":80,"protein":4,"carbs":8,"fat":3,"substitutions":["Café preto","Chá","Leite com cacau"]},
        {"name":"Fruta","portion":"1 unidade","calories":80,"protein":1,"carbs":20,"fat":0,"substitutions":["Banana","Mamão","Maçã","Laranja"]}
      ]
    },
    {
      "meal_type":"morning_snack","title":"Lanche da Manhã",
      "foods":[{"name":"Fruta","portion":"1 unidade","calories":80,"protein":1,"carbs":20,"fat":0,"substitutions":["Banana","Maçã","Pera","Mamão","Melão"]}]
    },
    {
      "meal_type":"lunch","title":"Almoço",
      "foods":[
        {"name":"Proteína","portion":"120g","calories":200,"protein":32,"carbs":0,"fat":7,"substitutions":["Frango","Carne","Peixe","Porco"]},
        {"name":"Arroz ou batata","portion":"4 colheres de sopa","calories":160,"protein":3,"carbs":34,"fat":1,"substitutions":["Arroz","Batata doce","Batata cozida","Purê de batata","Mandioca cozida"]},
        {"name":"Feijão","portion":"1 concha","calories":110,"protein":7,"carbs":18,"fat":1,"substitutions":["Grão de bico","Lentilha","Feijão verde"]},
        {"name":"Salada","portion":"à vontade","calories":50,"protein":2,"carbs":8,"fat":1,"substitutions":["Salada crua","Legumes cozidos"]}
      ]
    },
    {
      "meal_type":"afternoon_snack","title":"Lanche da Tarde",
      "foods":[
        {"name":"Fruta ou tapioca","portion":"1 unidade","calories":140,"protein":3,"carbs":28,"fat":2,"substitutions":["Fruta","Tapioca com queijo","Cuscuz com ovo","Iogurte"]}
      ]
    },
    {
      "meal_type":"dinner","title":"Jantar",
      "foods":[
        {"name":"Proteína","portion":"120g","calories":190,"protein":30,"carbs":0,"fat":7,"substitutions":["Frango","Peixe","Carne","Porco","Ovos"]},
        {"name":"Arroz ou batata","portion":"3 colheres de sopa","calories":120,"protein":2,"carbs":26,"fat":1,"substitutions":["Arroz","Batata","Batata doce","Mandioca","Purê"]},
        {"name":"Feijão","portion":"1 concha pequena","calories":80,"protein":5,"carbs":13,"fat":1,"substitutions":["Grão de bico","Lentilha","Feijão verde"]},
        {"name":"Salada","portion":"à vontade","calories":50,"protein":2,"carbs":8,"fat":1,"substitutions":["Salada crua","Legumes cozidos"]}
      ]
    }
  ]'::jsonb,
  ARRAY['pratico','barato','sem_gluten','editavel']::text[],
  'official_v2',
  true
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  meals = EXCLUDED.meals,
  macro_ratio = EXCLUDED.macro_ratio,
  base_calories = EXCLUDED.base_calories,
  goal_category = EXCLUDED.goal_category,
  diet_style = EXCLUDED.diet_style,
  clinical_tags = EXCLUDED.clinical_tags,
  conditions = EXCLUDED.conditions,
  tags = EXCLUDED.tags,
  template_generation = EXCLUDED.template_generation,
  is_active = true,
  updated_at = now();