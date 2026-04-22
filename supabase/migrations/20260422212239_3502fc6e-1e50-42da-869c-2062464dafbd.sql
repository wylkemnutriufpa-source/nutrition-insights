-- Add columns to meal_recipes
ALTER TABLE public.meal_recipes ADD COLUMN IF NOT EXISTS instructions TEXT;
ALTER TABLE public.meal_recipes ADD COLUMN IF NOT EXISTS base_recipe JSONB;

-- Update the 10 marmita recipes
UPDATE public.meal_recipes SET 
  instructions = 'Cozinhe o patinho moído com cebola e alho. Asse os legumes com azeite e ervas. Prepare o arroz à grega com cenoura e vagem.',
  base_recipe = '{"title":"Carne com legumes","ingredients":["100g patinho moído","100g legumes variados","100g arroz branco à grega","Azeite, alho, cebola e ervas"],"steps":["Refogue a carne com temperos até dourar","Asse os legumes picados no forno por 20min","Cozinhe o arroz com vegetais picados","Monte a marmita em 3 divisões"],"tips":"Pode congelar por até 3 meses"}'
WHERE name = 'Carne com legumes';

UPDATE public.meal_recipes SET 
  instructions = 'Prepare o estrogonofe com cubos de patinho, molho de tomate e creme de leite leve. Sirva com arroz integral e cenoura no vapor.',
  base_recipe = '{"title":"Estrogonofe de carne","ingredients":["120g patinho em cubos","100g arroz integral","80g cenoura","Creme de leite leve, molho de tomate"],"steps":["Sele a carne na panela quente","Adicione molho e creme de leite, cozinhe em fogo baixo","Cozinhe a cenoura no vapor","Sirva com arroz integral"],"tips":"Use biomassa de banana verde para um molho mais funcional"}'
WHERE name = 'Estrogonofe de carne';

UPDATE public.meal_recipes SET 
  instructions = 'Modele bolinhas de patinho temperadas. Cozinhe as lentilhas. Prepare o purê de batata cremoso.',
  base_recipe = '{"title":"Bolinhas de carne artesanal","ingredients":["120g bolinhas de patinho","80g lentilhas","100g creme de batata"],"steps":["Modele as almôndegas e assse por 15min","Cozinhe a lentilha com louro","Bata as batatas cozidas com um pouco de leite desnatado","Combine as partes na marmita"],"tips":"Adicione chia à carne para mais fibras"}'
WHERE name = 'Bolinhas de carne artesanal';

UPDATE public.meal_recipes SET 
  instructions = 'Cozinhe o patinho moído. Prepare o arroz com cúrcuma. Cozinhe o feijão carioquinha com temperos naturais.',
  base_recipe = '{"title":"Brasileirinho de patinho","ingredients":["100g patinho moído","100g arroz com cúrcuma","100g feijão carioquinha"],"steps":["Refogue o patinho com alho e cebola","Cozinhe o arroz com uma colher de chá de cúrcuma","Prepare o feijão com temperos caseiros","Monte o prato clássico brasileiro"],"tips":"Prato completo em ferro e aminoácidos"}'
WHERE name = 'Brasileirinho de patinho';

UPDATE public.meal_recipes SET 
  instructions = 'Faça camadas de patinho moído e purê de abóbora. Finalize com gergelim preto e leve ao forno.',
  base_recipe = '{"title":"Escondidinho de carne com abóbora","ingredients":["120g patinho moído","180g creme de abóbora","10g gergelim preto"],"steps":["Cozinhe e amasse a abóbora até virar purê","Refogue a carne moída","Monte camadas: carne embaixo, purê em cima","Salpique gergelim e doure no forno"],"tips":"Ótima opção low-carb e rica em vitamina A"}'
WHERE name = 'Escondidinho de carne com abóbora';

UPDATE public.meal_recipes SET 
  instructions = 'Refogue o frango desfiado com tomate cereja. Cubra com purê de macaxeira cremoso.',
  base_recipe = '{"title":"Escondidinho de frango com macaxeira","ingredients":["150g frango desfiado","150g purê de macaxeira","20g tomate cereja"],"steps":["Cozinhe a macaxeira e bata com um pouco da água do cozimento","Refogue o frango desfiado com os tomates","Monte o escondidinho em um refratário","Leve ao forno para gratinar"],"tips":"A macaxeira é uma excelente fonte de energia de baixo IG"}'
WHERE name = 'Escondidinho de frango com macaxeira';

UPDATE public.meal_recipes SET 
  instructions = 'Modele almôndegas de patinho e asse com molho de tomate. Sirva sobre purê de macaxeira e salpique queijo.',
  base_recipe = '{"title":"Almôndegas com purê de macaxeira","ingredients":["120g patinho moído","180g purê de macaxeira","40g molho de tomate","20g queijo ralado"],"steps":["Prepare as almôndegas e asse com o molho","Faça o purê de macaxeira liso","Coloque o purê na base e as almôndegas por cima","Finalize com queijo ralado"],"tips":"Use queijo parmesão de boa qualidade"}'
WHERE name = 'Almôndegas com purê de macaxeira';

UPDATE public.meal_recipes SET 
  instructions = 'Cozinhe o frango com creme de macaxeira e um toque de azeite de dendê. Acompanhe com arroz à grega.',
  base_recipe = '{"title":"Bobó de frango","ingredients":["200g bobó de frango (macaxeira com dendê)","100g arroz à grega","20g tomate cereja"],"steps":["Bata a macaxeira cozida com leite de coco","Refogue o frango e misture ao creme com dendê","Prepare o arroz colorido","Decore com tomates frescos"],"tips":"Use pouco dendê para manter o perfil saudável"}'
WHERE name = 'Bobó de frango';

UPDATE public.meal_recipes SET 
  instructions = 'Prepare o hambúrguer de frango artesanal. Sirva com arroz integral e feijão manteiguinha.',
  base_recipe = '{"title":"Brasileirinho de hambúrguer de frango","ingredients":["100g hambúrguer de frango","100g arroz integral","100g feijão manteiguinha"],"steps":["Grelhe o hambúrguer de frango na chapa","Cozinhe o arroz integral al dente","Prepare o feijão manteiguinha com coentro e cebolinha","Monte a refeição equilibrada"],"tips":"Hambúrguer feito com peito de frango moído na hora"}'
WHERE name = 'Brasileirinho de hambúrguer de frango';

UPDATE public.meal_recipes SET 
  instructions = 'Grelhe a sobrecoxa e finalize com molho de mostarda dijon. Sirva com arroz à grega.',
  base_recipe = '{"title":"Filé de sobrecoxa ao molho de mostarda","ingredients":["150g sobrecoxa de frango","150g arroz branco à grega","Mostarda, mel e ervas"],"steps":["Retire a pele da sobrecoxa e grelhe bem","Misture mostarda com um pouco de água e mel","Cubra o frango com o molho","Sirva acompanhado do arroz colorido"],"tips":"A sobrecoxa é mais suculenta que o peito"}'
WHERE name = 'Filé de sobrecoxa ao molho de mostarda';
