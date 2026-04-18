-- Padronização v2: estrutura modular por blocos + multiplicadores + variação semanal
-- Mantém slugs existentes e atualiza meals + weekly_variation_strategy + macro_ratio

-- ============ 1. MANUTENÇÃO ============
UPDATE public.diet_templates SET
  meals = '[
    {
      "meal_type":"breakfast","title":"Café da Manhã","image_hint":"cafe_manha",
      "blocks":[
        {"block_type":"base","required":true,"base_quantity":"1 unidade","options":[
          {"name":"Pão francês","portion":"1 unidade"},
          {"name":"Tapioca","portion":"1 unidade média"},
          {"name":"Cuscuz","portion":"1 fatia média"}
        ]},
        {"block_type":"protein","required":true,"base_quantity":"1 unidade","options":[
          {"name":"Ovo","portion":"1 unidade"},
          {"name":"Queijo branco","portion":"1 fatia"}
        ]},
        {"block_type":"drink","required":false,"base_quantity":"1 xícara","options":[
          {"name":"Café com leite","portion":"200ml"},
          {"name":"Café preto","portion":"200ml"},
          {"name":"Chá","portion":"200ml"}
        ]},
        {"block_type":"extra","required":false,"base_quantity":"1 unidade","options":[
          {"name":"Fruta da estação","portion":"1 unidade","substitutions":["Banana","Maçã","Mamão","Melão","Laranja"]}
        ]}
      ]
    },
    {
      "meal_type":"morning_snack","title":"Lanche da Manhã","image_hint":"lanche_fruta",
      "blocks":[
        {"block_type":"extra","required":true,"base_quantity":"1 unidade","options":[
          {"name":"Fruta livre","portion":"1 unidade","substitutions":["Banana","Maçã","Mamão","Pera","Laranja","Abacaxi"]}
        ]}
      ]
    },
    {
      "meal_type":"lunch","title":"Almoço","image_hint":"prato_almoco",
      "blocks":[
        {"block_type":"protein","required":true,"base_quantity":"120g","options":[
          {"name":"Frango grelhado","portion":"120g"},
          {"name":"Carne bovina magra","portion":"120g"},
          {"name":"Peixe assado","portion":"120g"},
          {"name":"Carne de porco magra","portion":"120g"}
        ]},
        {"block_type":"carb","required":true,"base_quantity":"4 colheres sopa","options":[
          {"name":"Arroz branco","portion":"4 colh sopa"},
          {"name":"Macarrão","portion":"4 colh sopa"},
          {"name":"Purê de batata","portion":"4 colh sopa"},
          {"name":"Batata cozida","portion":"1 unidade média"},
          {"name":"Batata doce","portion":"1 unidade média"}
        ]},
        {"block_type":"legume","required":false,"base_quantity":"1 concha","options":[
          {"name":"Feijão","portion":"1 concha"},
          {"name":"Grão de bico","portion":"1 concha"},
          {"name":"Lentilha","portion":"1 concha"},
          {"name":"Feijão verde","portion":"1 concha"}
        ]},
        {"block_type":"salad","required":false,"base_quantity":"à vontade","options":[
          {"name":"Salada livre","portion":"à vontade","substitutions":["Crua","Cozida","Refogada"]}
        ]},
        {"block_type":"dessert","required":false,"base_quantity":"1 unidade","options":[
          {"name":"Fruta sobremesa","portion":"1 unidade pequena","substitutions":["Maçã","Pera","Laranja","Mexerica"]}
        ]}
      ]
    },
    {
      "meal_type":"afternoon_snack","title":"Lanche da Tarde","image_hint":"lanche_tarde",
      "blocks":[
        {"block_type":"extra","required":true,"base_quantity":"1 unidade","options":[
          {"name":"Fruta ou opção do café","portion":"1 unidade","substitutions":["Fruta","Pão com queijo","Tapioca com queijo","Cuscuz com ovo","Iogurte"]}
        ]}
      ]
    },
    {
      "meal_type":"dinner","title":"Jantar","image_hint":"prato_jantar",
      "blocks":[
        {"block_type":"protein","required":true,"base_quantity":"120g","options":[
          {"name":"Frango grelhado","portion":"120g"},
          {"name":"Peixe assado","portion":"120g"},
          {"name":"Carne bovina magra","portion":"120g"},
          {"name":"Omelete","portion":"2 ovos"}
        ]},
        {"block_type":"carb","required":true,"base_quantity":"3 colheres sopa","options":[
          {"name":"Arroz","portion":"3 colh sopa"},
          {"name":"Macarrão","portion":"3 colh sopa"},
          {"name":"Purê","portion":"3 colh sopa"},
          {"name":"Batata cozida","portion":"1 unidade"},
          {"name":"Batata doce","portion":"1 unidade"}
        ]},
        {"block_type":"legume","required":false,"base_quantity":"1 concha pequena","options":[
          {"name":"Feijão","portion":"1 concha pequena"},
          {"name":"Grão de bico","portion":"1 concha pequena"},
          {"name":"Lentilha","portion":"1 concha pequena"}
        ]},
        {"block_type":"salad","required":false,"base_quantity":"à vontade","options":[
          {"name":"Salada livre","portion":"à vontade"}
        ]}
      ]
    },
    {
      "meal_type":"evening_snack","title":"Ceia (opcional)","image_hint":"ceia",
      "blocks":[
        {"block_type":"extra","required":false,"base_quantity":"1 unidade","options":[
          {"name":"Fruta ou chá","portion":"1 unidade","substitutions":["Fruta","Chá","Iogurte","Leite morno"]}
        ]}
      ]
    }
  ]'::jsonb,
  weekly_variation_strategy = '{
    "version":"v2",
    "multipliers":{"emagrecimento":0.7,"manutencao":1.0,"hipertrofia":1.7},
    "rotation":{
      "protein":["Frango grelhado","Carne bovina magra","Peixe assado","Carne de porco magra"],
      "carb":["Arroz branco","Macarrão","Batata doce","Purê de batata","Batata cozida"],
      "legume":["Feijão","Grão de bico","Lentilha","Feijão verde"]
    },
    "anti_repeat_window_days":2
  }'::jsonb,
  updated_at = now()
WHERE slug = 'pratico-manutencao-v1';

-- ============ 2. EMAGRECIMENTO ============
UPDATE public.diet_templates SET
  meals = '[
    {
      "meal_type":"breakfast","title":"Café da Manhã","image_hint":"cafe_manha",
      "blocks":[
        {"block_type":"base","required":true,"base_quantity":"1 unidade pequena","options":[
          {"name":"Tapioca","portion":"1 unidade pequena"},
          {"name":"Pão francês","portion":"1 unidade"},
          {"name":"Cuscuz","portion":"1 fatia pequena"}
        ]},
        {"block_type":"protein","required":true,"base_quantity":"1 unidade","options":[
          {"name":"Ovo","portion":"1 unidade"},
          {"name":"Queijo branco","portion":"1 fatia fina"}
        ]},
        {"block_type":"drink","required":false,"base_quantity":"1 xícara","options":[
          {"name":"Café preto","portion":"200ml"},
          {"name":"Café com leite","portion":"200ml"},
          {"name":"Chá","portion":"200ml"}
        ]},
        {"block_type":"extra","required":false,"base_quantity":"1 fatia","options":[
          {"name":"Fruta","portion":"1 fatia","substitutions":["Mamão","Melão","Maçã","Laranja"]}
        ]}
      ]
    },
    {
      "meal_type":"morning_snack","title":"Lanche da Manhã","image_hint":"lanche_fruta",
      "blocks":[
        {"block_type":"extra","required":true,"base_quantity":"1 unidade","options":[
          {"name":"Fruta","portion":"1 unidade","substitutions":["Maçã","Pera","Laranja","Mexerica","Banana"]}
        ]}
      ]
    },
    {
      "meal_type":"lunch","title":"Almoço","image_hint":"prato_almoco",
      "blocks":[
        {"block_type":"protein","required":true,"base_quantity":"120g","options":[
          {"name":"Frango grelhado","portion":"120g"},
          {"name":"Peixe","portion":"120g"},
          {"name":"Carne magra","portion":"120g"},
          {"name":"Ovos","portion":"2 unidades"}
        ]},
        {"block_type":"carb","required":true,"base_quantity":"2 colheres sopa","options":[
          {"name":"Arroz","portion":"2 colh sopa"},
          {"name":"Batata doce","portion":"1 unidade pequena"},
          {"name":"Batata cozida","portion":"1 unidade pequena"},
          {"name":"Macarrão","portion":"2 colh sopa"},
          {"name":"Purê","portion":"2 colh sopa"}
        ]},
        {"block_type":"legume","required":false,"base_quantity":"1/2 concha","options":[
          {"name":"Feijão","portion":"1/2 concha"},
          {"name":"Lentilha","portion":"1/2 concha"},
          {"name":"Grão de bico","portion":"1/2 concha"}
        ]},
        {"block_type":"salad","required":true,"base_quantity":"à vontade","options":[
          {"name":"Salada livre","portion":"à vontade"}
        ]}
      ]
    },
    {
      "meal_type":"afternoon_snack","title":"Lanche da Tarde","image_hint":"lanche_fruta",
      "blocks":[
        {"block_type":"extra","required":true,"base_quantity":"1 unidade","options":[
          {"name":"Fruta","portion":"1 unidade","substitutions":["Maçã","Pera","Mamão","Melão","Laranja"]}
        ]}
      ]
    },
    {
      "meal_type":"dinner","title":"Jantar","image_hint":"prato_jantar",
      "blocks":[
        {"block_type":"protein","required":true,"base_quantity":"120g","options":[
          {"name":"Frango","portion":"120g"},
          {"name":"Peixe","portion":"120g"},
          {"name":"Carne magra","portion":"120g"},
          {"name":"Ovos","portion":"2 unidades"}
        ]},
        {"block_type":"carb","required":true,"base_quantity":"2 colheres sopa","options":[
          {"name":"Arroz","portion":"2 colh sopa"},
          {"name":"Batata doce","portion":"1 unidade pequena"},
          {"name":"Batata cozida","portion":"1 unidade pequena"}
        ]},
        {"block_type":"salad","required":true,"base_quantity":"à vontade","options":[
          {"name":"Salada livre","portion":"à vontade"}
        ]}
      ]
    }
  ]'::jsonb,
  weekly_variation_strategy = '{
    "version":"v2",
    "multipliers":{"emagrecimento":0.7,"manutencao":1.0,"hipertrofia":1.7},
    "default_multiplier":0.7,
    "rotation":{
      "protein":["Frango grelhado","Peixe","Carne magra","Ovos"],
      "carb":["Arroz","Batata doce","Batata cozida","Macarrão"],
      "legume":["Feijão","Lentilha","Grão de bico"]
    },
    "anti_repeat_window_days":2
  }'::jsonb,
  updated_at = now()
WHERE slug = 'pratico-emagrecimento-v1';

-- ============ 3. HIPERTROFIA ============
UPDATE public.diet_templates SET
  meals = '[
    {
      "meal_type":"breakfast","title":"Café da Manhã","image_hint":"cafe_manha",
      "blocks":[
        {"block_type":"base","required":true,"base_quantity":"2 unidades","options":[
          {"name":"Pão francês","portion":"2 unidades"},
          {"name":"Tapioca grande","portion":"1 unidade grande"},
          {"name":"Cuscuz","portion":"2 fatias"}
        ]},
        {"block_type":"protein","required":true,"base_quantity":"2 unidades","options":[
          {"name":"Ovo","portion":"2 unidades"},
          {"name":"Queijo branco","portion":"2 fatias"}
        ]},
        {"block_type":"drink","required":true,"base_quantity":"1 xícara grande","options":[
          {"name":"Café com leite","portion":"300ml"},
          {"name":"Vitamina de banana","portion":"300ml"},
          {"name":"Leite com aveia","portion":"300ml"}
        ]},
        {"block_type":"extra","required":true,"base_quantity":"1 unidade","options":[
          {"name":"Fruta","portion":"1 unidade média","substitutions":["Banana","Mamão","Maçã","Manga"]}
        ]}
      ]
    },
    {
      "meal_type":"morning_snack","title":"Lanche da Manhã","image_hint":"lanche_reforcado",
      "blocks":[
        {"block_type":"extra","required":true,"base_quantity":"1 fruta + 1 carbo","options":[
          {"name":"Fruta + pão/tapioca","portion":"1 fruta + 1 unid","substitutions":["Banana com pão","Vitamina","Tapioca com queijo","Cuscuz"]}
        ]}
      ]
    },
    {
      "meal_type":"lunch","title":"Almoço (reforçado)","image_hint":"prato_almoco_reforcado",
      "blocks":[
        {"block_type":"protein","required":true,"base_quantity":"180g","options":[
          {"name":"Frango grelhado","portion":"180g"},
          {"name":"Carne bovina","portion":"180g"},
          {"name":"Peixe","portion":"180g"},
          {"name":"Carne de porco","portion":"180g"}
        ]},
        {"block_type":"carb","required":true,"base_quantity":"6 colheres sopa","options":[
          {"name":"Arroz","portion":"6 colh sopa"},
          {"name":"Macarrão","portion":"6 colh sopa"},
          {"name":"Purê","portion":"6 colh sopa"},
          {"name":"Batata doce","portion":"2 unidades"},
          {"name":"Batata cozida","portion":"2 unidades"}
        ]},
        {"block_type":"legume","required":true,"base_quantity":"1 concha grande","options":[
          {"name":"Feijão","portion":"1 concha grande"},
          {"name":"Grão de bico","portion":"1 concha grande"},
          {"name":"Lentilha","portion":"1 concha grande"}
        ]},
        {"block_type":"salad","required":false,"base_quantity":"à vontade","options":[
          {"name":"Salada livre","portion":"à vontade"}
        ]},
        {"block_type":"dessert","required":false,"base_quantity":"1 unidade","options":[
          {"name":"Fruta sobremesa","portion":"1 unidade","substitutions":["Banana","Maçã","Laranja"]}
        ]}
      ]
    },
    {
      "meal_type":"afternoon_snack","title":"Lanche da Tarde","image_hint":"lanche_reforcado",
      "blocks":[
        {"block_type":"base","required":true,"base_quantity":"2 unidades","options":[
          {"name":"Pão com queijo","portion":"2 unidades"},
          {"name":"Tapioca com queijo","portion":"2 unidades"},
          {"name":"Cuscuz com ovo","portion":"2 fatias"}
        ]},
        {"block_type":"extra","required":true,"base_quantity":"1 unidade","options":[
          {"name":"Fruta ou vitamina","portion":"1 unidade","substitutions":["Vitamina de banana","Fruta da estação"]}
        ]}
      ]
    },
    {
      "meal_type":"dinner","title":"Jantar (reforçado)","image_hint":"prato_jantar_reforcado",
      "blocks":[
        {"block_type":"protein","required":true,"base_quantity":"180g","options":[
          {"name":"Frango","portion":"180g"},
          {"name":"Carne","portion":"180g"},
          {"name":"Peixe","portion":"180g"},
          {"name":"Omelete","portion":"3 ovos"}
        ]},
        {"block_type":"carb","required":true,"base_quantity":"5 colheres sopa","options":[
          {"name":"Arroz","portion":"5 colh sopa"},
          {"name":"Macarrão","portion":"5 colh sopa"},
          {"name":"Batata doce","portion":"2 unidades"},
          {"name":"Purê","portion":"5 colh sopa"}
        ]},
        {"block_type":"legume","required":true,"base_quantity":"1 concha","options":[
          {"name":"Feijão","portion":"1 concha"},
          {"name":"Lentilha","portion":"1 concha"}
        ]}
      ]
    },
    {
      "meal_type":"evening_snack","title":"Ceia","image_hint":"ceia_reforcada",
      "blocks":[
        {"block_type":"drink","required":true,"base_quantity":"1 copo grande","options":[
          {"name":"Vitamina de banana","portion":"300ml"},
          {"name":"Leite com aveia","portion":"300ml"},
          {"name":"Iogurte com fruta","portion":"200ml"}
        ]}
      ]
    }
  ]'::jsonb,
  weekly_variation_strategy = '{
    "version":"v2",
    "multipliers":{"emagrecimento":0.7,"manutencao":1.0,"hipertrofia":1.7},
    "default_multiplier":1.7,
    "rotation":{
      "protein":["Frango grelhado","Carne bovina","Peixe","Carne de porco"],
      "carb":["Arroz","Macarrão","Batata doce","Purê"],
      "legume":["Feijão","Grão de bico","Lentilha"]
    },
    "anti_repeat_window_days":2
  }'::jsonb,
  updated_at = now()
WHERE slug = 'pratico-hipertrofia-v1';

-- ============ 4. SEM LACTOSE ============
UPDATE public.diet_templates SET
  meals = '[
    {
      "meal_type":"breakfast","title":"Café da Manhã","image_hint":"cafe_manha",
      "blocks":[
        {"block_type":"base","required":true,"base_quantity":"1 unidade","options":[
          {"name":"Tapioca","portion":"1 unidade"},
          {"name":"Pão francês","portion":"1 unidade"},
          {"name":"Cuscuz","portion":"1 fatia"}
        ]},
        {"block_type":"protein","required":true,"base_quantity":"1 unidade","options":[
          {"name":"Ovo","portion":"1 unidade"},
          {"name":"Pasta de amendoim","portion":"1 colh sopa"}
        ]},
        {"block_type":"drink","required":false,"base_quantity":"1 xícara","options":[
          {"name":"Café preto","portion":"200ml"},
          {"name":"Café com leite vegetal","portion":"200ml"},
          {"name":"Chá","portion":"200ml"},
          {"name":"Leite de coco","portion":"200ml"},
          {"name":"Leite de amêndoas","portion":"200ml"}
        ]},
        {"block_type":"extra","required":false,"base_quantity":"1 unidade","options":[
          {"name":"Fruta","portion":"1 unidade","substitutions":["Banana","Mamão","Maçã","Laranja"]}
        ]}
      ]
    },
    {
      "meal_type":"morning_snack","title":"Lanche da Manhã","image_hint":"lanche_fruta",
      "blocks":[
        {"block_type":"extra","required":true,"base_quantity":"1 unidade","options":[
          {"name":"Fruta","portion":"1 unidade","substitutions":["Banana","Maçã","Pera","Mamão"]}
        ]}
      ]
    },
    {
      "meal_type":"lunch","title":"Almoço","image_hint":"prato_almoco",
      "blocks":[
        {"block_type":"protein","required":true,"base_quantity":"120g","options":[
          {"name":"Frango","portion":"120g"},
          {"name":"Carne","portion":"120g"},
          {"name":"Peixe","portion":"120g"},
          {"name":"Porco","portion":"120g"}
        ]},
        {"block_type":"carb","required":true,"base_quantity":"4 colheres sopa","options":[
          {"name":"Arroz","portion":"4 colh sopa"},
          {"name":"Macarrão sem leite","portion":"4 colh sopa"},
          {"name":"Batata doce","portion":"1 unidade"},
          {"name":"Batata cozida","portion":"1 unidade"},
          {"name":"Purê com leite vegetal","portion":"4 colh sopa"}
        ]},
        {"block_type":"legume","required":false,"base_quantity":"1 concha","options":[
          {"name":"Feijão","portion":"1 concha"},
          {"name":"Grão de bico","portion":"1 concha"},
          {"name":"Lentilha","portion":"1 concha"}
        ]},
        {"block_type":"salad","required":false,"base_quantity":"à vontade","options":[
          {"name":"Salada livre","portion":"à vontade"}
        ]}
      ]
    },
    {
      "meal_type":"afternoon_snack","title":"Lanche da Tarde","image_hint":"lanche_tarde",
      "blocks":[
        {"block_type":"extra","required":true,"base_quantity":"1 unidade","options":[
          {"name":"Fruta ou tapioca","portion":"1 unidade","substitutions":["Fruta","Tapioca pura","Cuscuz","Pão com pasta de amendoim"]}
        ]}
      ]
    },
    {
      "meal_type":"dinner","title":"Jantar","image_hint":"prato_jantar",
      "blocks":[
        {"block_type":"protein","required":true,"base_quantity":"120g","options":[
          {"name":"Frango","portion":"120g"},
          {"name":"Peixe","portion":"120g"},
          {"name":"Carne","portion":"120g"},
          {"name":"Ovos","portion":"2 unidades"}
        ]},
        {"block_type":"carb","required":true,"base_quantity":"3 colheres sopa","options":[
          {"name":"Arroz","portion":"3 colh sopa"},
          {"name":"Batata","portion":"1 unidade"},
          {"name":"Batata doce","portion":"1 unidade"}
        ]},
        {"block_type":"legume","required":false,"base_quantity":"1 concha pequena","options":[
          {"name":"Feijão","portion":"1 concha pequena"},
          {"name":"Lentilha","portion":"1 concha pequena"}
        ]},
        {"block_type":"salad","required":false,"base_quantity":"à vontade","options":[
          {"name":"Salada livre","portion":"à vontade"}
        ]}
      ]
    }
  ]'::jsonb,
  weekly_variation_strategy = '{
    "version":"v2",
    "multipliers":{"emagrecimento":0.7,"manutencao":1.0,"hipertrofia":1.7},
    "rotation":{
      "protein":["Frango","Carne","Peixe","Porco","Ovos"],
      "carb":["Arroz","Batata doce","Batata cozida","Macarrão sem leite"],
      "legume":["Feijão","Grão de bico","Lentilha"]
    },
    "anti_repeat_window_days":2,
    "exclude_foods":["Leite","Queijo amarelo","Manteiga"]
  }'::jsonb,
  updated_at = now()
WHERE slug = 'pratico-sem-lactose-v1';

-- ============ 5. SEM GLÚTEN ============
UPDATE public.diet_templates SET
  meals = '[
    {
      "meal_type":"breakfast","title":"Café da Manhã","image_hint":"cafe_manha",
      "blocks":[
        {"block_type":"base","required":true,"base_quantity":"1 unidade","options":[
          {"name":"Tapioca","portion":"1 unidade"},
          {"name":"Cuscuz","portion":"1 fatia"}
        ]},
        {"block_type":"protein","required":true,"base_quantity":"1 unidade","options":[
          {"name":"Ovo","portion":"1 unidade"},
          {"name":"Queijo branco","portion":"1 fatia"}
        ]},
        {"block_type":"drink","required":false,"base_quantity":"1 xícara","options":[
          {"name":"Café com leite","portion":"200ml"},
          {"name":"Café preto","portion":"200ml"},
          {"name":"Chá","portion":"200ml"}
        ]},
        {"block_type":"extra","required":false,"base_quantity":"1 unidade","options":[
          {"name":"Fruta","portion":"1 unidade","substitutions":["Banana","Mamão","Maçã","Laranja"]}
        ]}
      ]
    },
    {
      "meal_type":"morning_snack","title":"Lanche da Manhã","image_hint":"lanche_fruta",
      "blocks":[
        {"block_type":"extra","required":true,"base_quantity":"1 unidade","options":[
          {"name":"Fruta","portion":"1 unidade","substitutions":["Banana","Maçã","Pera","Mamão","Melão"]}
        ]}
      ]
    },
    {
      "meal_type":"lunch","title":"Almoço","image_hint":"prato_almoco",
      "blocks":[
        {"block_type":"protein","required":true,"base_quantity":"120g","options":[
          {"name":"Frango","portion":"120g"},
          {"name":"Carne","portion":"120g"},
          {"name":"Peixe","portion":"120g"},
          {"name":"Porco","portion":"120g"}
        ]},
        {"block_type":"carb","required":true,"base_quantity":"4 colheres sopa","options":[
          {"name":"Arroz","portion":"4 colh sopa"},
          {"name":"Batata doce","portion":"1 unidade"},
          {"name":"Batata cozida","portion":"1 unidade"},
          {"name":"Purê de batata","portion":"4 colh sopa"},
          {"name":"Mandioca cozida","portion":"1 pedaço"}
        ]},
        {"block_type":"legume","required":false,"base_quantity":"1 concha","options":[
          {"name":"Feijão","portion":"1 concha"},
          {"name":"Grão de bico","portion":"1 concha"},
          {"name":"Lentilha","portion":"1 concha"}
        ]},
        {"block_type":"salad","required":false,"base_quantity":"à vontade","options":[
          {"name":"Salada livre","portion":"à vontade"}
        ]}
      ]
    },
    {
      "meal_type":"afternoon_snack","title":"Lanche da Tarde","image_hint":"lanche_tarde",
      "blocks":[
        {"block_type":"extra","required":true,"base_quantity":"1 unidade","options":[
          {"name":"Fruta ou tapioca","portion":"1 unidade","substitutions":["Fruta","Tapioca com queijo","Cuscuz com ovo","Iogurte"]}
        ]}
      ]
    },
    {
      "meal_type":"dinner","title":"Jantar","image_hint":"prato_jantar",
      "blocks":[
        {"block_type":"protein","required":true,"base_quantity":"120g","options":[
          {"name":"Frango","portion":"120g"},
          {"name":"Peixe","portion":"120g"},
          {"name":"Carne","portion":"120g"},
          {"name":"Ovos","portion":"2 unidades"}
        ]},
        {"block_type":"carb","required":true,"base_quantity":"3 colheres sopa","options":[
          {"name":"Arroz","portion":"3 colh sopa"},
          {"name":"Batata","portion":"1 unidade"},
          {"name":"Batata doce","portion":"1 unidade"},
          {"name":"Mandioca","portion":"1 pedaço"}
        ]},
        {"block_type":"legume","required":false,"base_quantity":"1 concha pequena","options":[
          {"name":"Feijão","portion":"1 concha pequena"},
          {"name":"Lentilha","portion":"1 concha pequena"}
        ]}
      ]
    }
  ]'::jsonb,
  weekly_variation_strategy = '{
    "version":"v2",
    "multipliers":{"emagrecimento":0.7,"manutencao":1.0,"hipertrofia":1.7},
    "rotation":{
      "protein":["Frango","Carne","Peixe","Porco","Ovos"],
      "carb":["Arroz","Batata doce","Batata cozida","Mandioca"],
      "legume":["Feijão","Grão de bico","Lentilha"]
    },
    "anti_repeat_window_days":2,
    "exclude_foods":["Pão francês","Macarrão tradicional","Trigo","Cevada","Aveia comum"]
  }'::jsonb,
  updated_at = now()
WHERE slug = 'pratico-sem-gluten-v1';

-- ============ Validação automática + função helper ============
-- Função para validar estrutura de um template (proteína + base/carbo nas refeições principais)
CREATE OR REPLACE FUNCTION public.validate_practical_template(_meals jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_meal jsonb;
  v_block jsonb;
  v_has_protein boolean;
  v_has_base boolean;
  v_errors text[] := ARRAY[]::text[];
  v_meal_type text;
BEGIN
  IF jsonb_typeof(_meals) <> 'array' OR jsonb_array_length(_meals) = 0 THEN
    RETURN jsonb_build_object('valid', false, 'errors', ARRAY['meals deve ser array não vazio']);
  END IF;

  FOR v_meal IN SELECT * FROM jsonb_array_elements(_meals)
  LOOP
    v_meal_type := v_meal->>'meal_type';
    v_has_protein := false;
    v_has_base := false;

    IF v_meal_type IN ('breakfast','lunch','dinner') THEN
      FOR v_block IN SELECT * FROM jsonb_array_elements(COALESCE(v_meal->'blocks','[]'::jsonb))
      LOOP
        IF v_block->>'block_type' = 'protein' THEN v_has_protein := true; END IF;
        IF v_block->>'block_type' IN ('base','carb') THEN v_has_base := true; END IF;
      END LOOP;

      IF NOT v_has_protein THEN
        v_errors := array_append(v_errors, format('Refeição %s sem bloco protein', v_meal_type));
      END IF;
      IF NOT v_has_base THEN
        v_errors := array_append(v_errors, format('Refeição %s sem bloco base/carb', v_meal_type));
      END IF;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'valid', cardinality(v_errors) = 0,
    'errors', v_errors
  );
END;
$$;

-- Trigger de validação para templates práticos
CREATE OR REPLACE FUNCTION public.tg_validate_practical_template()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  -- Apenas valida se for template prático (categoria = 'pratico')
  IF NEW.category = 'pratico' THEN
    v_result := public.validate_practical_template(NEW.meals);
    IF NOT (v_result->>'valid')::boolean THEN
      RAISE EXCEPTION 'Template prático inválido: %', v_result->'errors';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_practical_template ON public.diet_templates;
CREATE TRIGGER trg_validate_practical_template
  BEFORE INSERT OR UPDATE ON public.diet_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_validate_practical_template();