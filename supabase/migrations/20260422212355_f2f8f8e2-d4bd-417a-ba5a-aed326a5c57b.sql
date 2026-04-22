-- Update all 19 recipes
UPDATE public.meal_recipes SET 
  instructions = 'Cozinhe o peito de frango e prepare o creme de abóbora. Sirva em camadas ou misturado.',
  base_recipe = '{"title":"Frango com abóbora","ingredients":["150g filé de frango","150g creme de abóbora","Temperos a gosto"],"steps":["Grelhe o frango em cubos","Cozinhe a abóbora e bata no liquidificador","Misture e tempere","Divida nas marmitas"],"tips":"Rico em betacaroteno"}'
WHERE name = 'Frango com abóbora';

UPDATE public.meal_recipes SET 
  instructions = 'Prepare o risoto de abóbora com arroz integral. Refogue o frango desfiado. Asse os legumes.',
  base_recipe = '{"title":"Frango desfiado com risoto de abóbora","ingredients":["100g frango desfiado","120g risoto de abóbora integral","80g legumes assados"],"steps":["Cozinhe o arroz integral com purê de abóbora","Refogue o frango com cebola e alho","Asse legumes variados","Monte a marmita"],"tips":"Opção de baixo índice glicêmico"}'
WHERE name = 'Frango desfiado com risoto de abóbora';

UPDATE public.meal_recipes SET 
  instructions = 'Cozinhe o arroz com frango desfiado, milho e cenoura em uma única panela.',
  base_recipe = '{"title":"Galinhada FIT","ingredients":["200g arroz 7 grãos","100g frango desfiado","50g milho e cenoura"],"steps":["Refogue o frango","Adicione o arroz e os vegetais","Cozinha com caldo de legumes natural","Finalize com cheiro verde"],"tips":"Prato único e muito prático"}'
WHERE name = 'Galinhada FIT';

UPDATE public.meal_recipes SET 
  instructions = 'Cozinhe o macarrão integral. Misture com frango desfiado, molho de tomate, muçarela e manjericão.',
  base_recipe = '{"title":"Massa com frango à marguerita","ingredients":["120g frango desfiado","100g macarrão integral","80g molho de tomate","20g muçarela","Manjericão"],"steps":["Cozinhe a massa al dente","Misture o frango ao molho","Combine massa e molho","Finalize com queijo e manjericão"],"tips":"Use massa sem glúten se preferir"}'
WHERE name = 'Massa com frango à marguerita';

UPDATE public.meal_recipes SET 
  instructions = 'Prepare o molho à bolonhesa com patinho moído. Sirva sobre a massa integral e finalize com muçarela.',
  base_recipe = '{"title":"Massa integral à bolonhesa","ingredients":["150g massa integral","180g patinho à bolonhesa","20g muçarela"],"steps":["Cozinhe a massa","Refogue a carne com molho de tomate natural","Cubra a massa com o molho","Adicione queijo ralado"],"tips":"A bolonhesa pode ser feita em grande quantidade e congelada"}'
WHERE name = 'Massa integral à bolonhesa';

UPDATE public.meal_recipes SET 
  instructions = 'Prepare a massa de crepioca. Recheie com frango desfiado cremoso e molho de tomate.',
  base_recipe = '{"title":"Panqueca de frango","ingredients":["120g massa de crepioca","120g frango desfiado","40g molho de tomate","20g parmesão"],"steps":["Faça os discos de crepioca","Refogue o frango com requeijão light","Recheie as panquecas","Cubra com molho e queijo"],"tips":"Pode ser feita com farinha de aveia"}'
WHERE name = 'Panqueca de frango';

UPDATE public.meal_recipes SET 
  instructions = 'Prepare a massa de crepioca. Recheie com patinho moído temperado e molho de tomate.',
  base_recipe = '{"title":"Panqueca de carne","ingredients":["120g massa de crepioca","120g patinho moído","40g molho de tomate","20g parmesão"],"steps":["Faça os discos de crepioca","Refogue a carne com temperos","Recheie e enrole","Cubra com molho e queijo"],"tips":"Proteica e saciante"}'
WHERE name = 'Panqueca de carne';

UPDATE public.meal_recipes SET 
  instructions = 'Prepare o pernil suíno em cubos. Sirva com arroz à grega e feijão preto.',
  base_recipe = '{"title":"Pernil suíno","ingredients":["100g pernil suíno","100g arroz à grega","100g feijão preto"],"steps":["Grelhe o pernil até dourar","Cozinhe o arroz com vegetais","Prepare o feijão com louro","Monte o prato"],"tips":"A carne suína é uma excelente fonte de vitamina B12"}'
WHERE name = 'Pernil suíno';

UPDATE public.meal_recipes SET 
  instructions = 'Cozinhe a carne de panela com macaxeira até ficar bem macia. Sirva com arroz carreteiro.',
  base_recipe = '{"title":"Vaca atolada","ingredients":["100g carne de panela","50g macaxeira","150g arroz carreteiro"],"steps":["Cozinhe a carne com a macaxeira na pressão","Prepare o arroz carreteiro com temperos","Combine as partes","Finalize com cebolinha"],"tips":"Prato reconfortante e energético"}'
WHERE name = 'Vaca atolada';

-- (The other 10 were updated in the previous migration, but I'll ensure they are all set)
