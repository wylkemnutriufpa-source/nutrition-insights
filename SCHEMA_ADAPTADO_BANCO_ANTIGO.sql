-- ============================================================
-- SCHEMA ADAPTADO PARA BANCO ANTIGO
-- ============================================================
-- Este SQL cria apenas as tabelas que NÃO existem
-- e popula dados sem conflitar com a estrutura existente

-- ============================================================
-- 1. CRIAR TABELA FOODS (se não existir)
-- ============================================================

CREATE TABLE IF NOT EXISTS foods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  kcal_100g NUMERIC(10, 2) NOT NULL,
  protein_g NUMERIC(10, 2),
  carbs_g NUMERIC(10, 2),
  fat_g NUMERIC(10, 2),
  fiber_g NUMERIC(10, 2),
  unit TEXT DEFAULT 'g',
  portion_label TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 2. CRIAR TABELA FOOD_SUBSTITUTIONS (se não existir)
-- ============================================================

CREATE TABLE IF NOT EXISTS food_substitutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  food_id UUID NOT NULL REFERENCES foods(id) ON DELETE CASCADE,
  substitute_food_id UUID NOT NULL REFERENCES foods(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(food_id, substitute_food_id)
);

-- ============================================================
-- 3. POPULAR ALIMENTOS
-- ============================================================

INSERT INTO foods (name, kcal_100g, protein_g, carbs_g, fat_g, fiber_g, unit, portion_label, image_url)
VALUES
  -- Pães e Carboidratos
  ('Pão Integral', 265, 9, 49, 3.3, 7, 'g', '1 fatia (30g)', 'pao-com-frango-desfiado.jpg'),
  ('Pão de Queijo', 402, 12, 35, 22, 0, 'g', '1 unidade (50g)', 'pao-de-queijo.jpg'),
  ('Tapioca', 360, 0.3, 88, 0.2, 0, 'g', '1 colher (30g)', 'tapioca-com-ovo.jpg'),
  ('Cuscuz', 376, 12, 67, 3, 11, 'g', '1 colher (30g)', 'cuscuz-com-ovo.jpg'),
  ('Torrada Integral', 320, 11, 55, 4, 8, 'g', '1 fatia (20g)', 'torrada-integral.jpg'),
  ('Bolo de Milho com Café', 280, 5, 45, 8, 2, 'g', '1 fatia (60g)', 'bolo-de-milho-com-cafe.jpg'),
  ('Bolo de Macaxeira com Café', 290, 4, 48, 9, 1, 'g', '1 fatia (60g)', 'bolo-de-macaxeira-com-cafe.jpg'),
  ('Farofa de Ovo com Café', 320, 8, 42, 12, 1, 'g', '1 colher (40g)', 'farofa-ovo.jpg'),
  ('Macaxeira com Café', 120, 1, 28, 0.5, 2, 'g', '1 porção (100g)', 'macaxeira-com-cafe.jpg'),
  
  -- Proteínas
  ('Frango Grelhado', 165, 31, 0, 3.6, 0, 'g', '100g', 'frango-grelhado.jpg'),
  ('Frango com Batata Doce', 180, 28, 12, 4, 2, 'g', '1 porção (150g)', 'frango-com-batata-doce.jpg'),
  ('Peixe com Legumes', 140, 25, 8, 3, 2, 'g', '1 porção (150g)', 'peixe-com-legumes.jpg'),
  ('Carne Grelhada', 250, 26, 0, 15, 0, 'g', '100g', 'carne-grelhada.jpg'),
  ('Carne com Batata', 220, 24, 15, 8, 2, 'g', '1 porção (150g)', 'carne-com-batata.jpg'),
  ('Carne Assada de Panela', 240, 25, 2, 14, 0, 'g', '100g', 'carne-assada-de-panela.jpg'),
  ('Costela Suína', 290, 22, 0, 23, 0, 'g', '100g', 'costela-suina.jpg'),
  ('Costela Bovina com Batata', 310, 24, 18, 16, 2, 'g', '1 porção (150g)', 'costela-bovina-com-batata.jpg'),
  ('Lombo Suíno', 270, 28, 0, 16, 0, 'g', '100g', 'lombo-suino.jpg'),
  ('Ovo Cozido', 155, 13, 1.1, 11, 0, 'unidade', '1 ovo (50g)', 'ovos-cozidos.jpg'),
  ('Ovo Mexido', 160, 13, 1.5, 12, 0, 'unidade', '1 ovo (50g)', 'ovos-mexidos.jpg'),
  ('Omelete', 180, 14, 2, 13, 0, 'unidade', '1 omelete (60g)', 'omelete.jpg'),
  ('Panqueca Proteica', 220, 16, 28, 6, 2, 'g', '1 panqueca (80g)', 'panqueca-proteica.jpg'),
  ('Bacon', 541, 37, 0, 45, 0, 'g', '2 fatias (20g)', 'ovos-com-bacon.jpg'),
  
  -- Acompanhamentos
  ('Arroz Branco', 130, 2.7, 28, 0.3, 0.4, 'g', '1 colher (30g)', 'arroz-branco.jpg'),
  ('Feijão Cozido', 76, 5.2, 14, 0.3, 3.7, 'g', '1 colher (30g)', 'feijao-cozido.jpg'),
  ('Batata Doce', 86, 1.6, 20, 0.1, 3, 'g', '1 porção (100g)', 'frango-com-batata-doce.jpg'),
  ('Batata Cozida', 77, 2, 17, 0.1, 2.1, 'g', '1 porção (100g)', 'carne-com-batata.jpg'),
  ('Milho Cozido', 86, 3.2, 19, 1.2, 2.7, 'g', '1 colher (50g)', 'milho-cozido.jpg'),
  
  -- Frutas
  ('Maçã', 52, 0.3, 14, 0.2, 2.4, 'unidade', '1 maçã (150g)', 'maca.jpg'),
  ('Banana', 89, 1.1, 23, 0.3, 2.6, 'unidade', '1 banana (100g)', 'banana-com-aveia.jpg'),
  ('Laranja', 47, 0.9, 12, 0.3, 2.4, 'unidade', '1 laranja (150g)', 'laranja.jpg'),
  ('Manga', 60, 0.7, 15, 0.3, 1.6, 'unidade', '1 manga (200g)', 'manga.jpg'),
  ('Melancia', 30, 0.6, 7.6, 0.2, 0.4, 'g', '1 fatia (150g)', 'melancia.jpg'),
  ('Melão', 34, 0.8, 8, 0.2, 0.9, 'g', '1 fatia (150g)', 'melao.jpg'),
  ('Morango', 32, 0.7, 7.7, 0.3, 2, 'g', '1 xícara (150g)', 'morango.jpg'),
  ('Goiaba', 68, 2.6, 14, 0.9, 5.4, 'unidade', '1 goiaba (100g)', 'goiaba.jpg'),
  ('Pera', 57, 0.4, 15, 0.1, 2.8, 'unidade', '1 pera (150g)', 'pera.jpg'),
  ('Abacaxi', 50, 0.5, 13, 0.1, 1.4, 'g', '1 fatia (100g)', 'abacaxi.jpg'),
  ('Uva', 67, 0.7, 17, 0.2, 0.9, 'g', '1 xícara (150g)', 'uva.jpg'),
  ('Frutas Vermelhas', 45, 0.8, 10, 0.3, 2, 'g', '1 xícara (150g)', 'frutas-vermelhas.jpg'),
  ('Salada de Frutas', 55, 0.7, 13, 0.2, 1.5, 'g', '1 porção (150g)', 'salada-de-frutas.jpg'),
  ('Açaí', 56, 2.2, 3, 5.9, 2.5, 'g', '100g', 'acai.jpg'),
  ('Açaí com Aveia', 120, 4, 18, 4, 4, 'g', '1 tigela (150g)', 'acai-com-aveia.jpg'),
  ('Açaí com Frango', 140, 18, 12, 3, 3, 'g', '1 tigela (150g)', 'acai-com-frango.jpg'),
  ('Açaí com Tapioca', 130, 2, 28, 2, 3, 'g', '1 tigela (150g)', 'acai-com-tapioca.jpg'),
  ('Açaí com Peixe Frito', 160, 16, 14, 6, 3, 'g', '1 tigela (150g)', 'acai-com-peixe-frito.jpg'),
  
  -- Saladas e Vegetais
  ('Salada Completa', 23, 2.2, 3.7, 0.4, 2.2, 'g', '1 porção (100g)', 'salada-completa.jpg'),
  ('Canja de Galinha com Legumes', 85, 8, 12, 1.5, 2, 'g', '1 tigela (200g)', 'canja-de-galinha-com-legumes.jpg'),
  ('Sopa de Legumes', 45, 2, 8, 0.5, 2, 'g', '1 tigela (200g)', 'sopa-de-legumes.jpg'),
  
  -- Laticínios
  ('Iogurte Natural', 59, 3.5, 4.7, 0.4, 0, 'ml', '200ml', 'iogurte-com-fruta.jpg'),
  ('Iogurte com Granola', 140, 5, 22, 3, 2, 'g', '1 pote (150g)', 'iogurte-com-granola.jpg'),
  ('Iogurte com Fruta', 95, 4, 15, 1, 1, 'g', '1 pote (150g)', 'iogurte-com-fruta.jpg'),
  ('Leite Integral', 61, 3.2, 4.8, 3.3, 0, 'ml', '200ml', 'copo-de-leite-morno.jpg'),
  ('Queijo Meia Cura', 402, 25, 1.3, 33, 0, 'g', '1 fatia (30g)', 'pao-de-queijo.jpg'),
  ('Requeijão', 290, 18, 2, 24, 0, 'g', '2 colheres (30g)', 'pao-de-queijo.jpg'),
  
  -- Bebidas e Complementos
  ('Café com Torrada e Queijo', 280, 10, 35, 10, 2, 'g', '1 xícara (150g)', 'cha-com-torrada-e-queijo.jpg'),
  ('Chá com Torrada', 180, 6, 32, 2, 2, 'g', '1 xícara (150g)', 'cha-com-torrada.jpg'),
  ('Vitamina de Fruta', 120, 4, 22, 2, 2, 'ml', '1 copo (250ml)', 'vitamina-de-fruta.jpg'),
  ('Suco Natural', 45, 0.5, 11, 0.2, 0.5, 'ml', '1 copo (200ml)', 'suco-natural.jpg'),
  
  -- Lanches
  ('Castanha do Pará', 656, 14, 12, 66, 2.1, 'g', '1 unidade (5g)', 'castanha-do-para.jpg'),
  ('Amêndoa', 579, 21, 22, 50, 12.5, 'g', '10 unidades (10g)', 'castanha-do-para.jpg'),
  ('Granola', 471, 12, 63, 20, 7, 'g', '1 colher (30g)', 'granola.jpg'),
  ('Aveia', 389, 17, 66, 7, 10.6, 'g', '2 colheres (30g)', 'banana-com-aveia.jpg'),
  ('Crepioca', 180, 8, 20, 7, 2, 'g', '1 crepioca (60g)', 'crepioca.jpg'),
  ('Picanha', 290, 26, 0, 21, 0, 'g', '100g', 'picanha.jpg'),
  ('Picanha Suína', 310, 24, 0, 24, 0, 'g', '100g', 'picanha-suina.jpg'),
  ('Coxa e Sobrecoxa', 215, 20, 0, 15, 0, 'g', '100g', 'coxa-e-sobrecoxa.jpg'),
  ('File de Porco', 242, 27, 0, 14, 0, 'g', '100g', 'file-de-porco.jpg'),
  ('File de Tilápia', 96, 20, 0, 1, 0, 'g', '100g', 'file-de-tilapia.jpg'),
  ('Mamão', 43, 0.5, 11, 0.3, 1.7, 'unidade', '1 fatia (150g)', 'mamao.jpg'),
  ('Mamão com Aveia', 95, 3, 18, 1, 3, 'g', '1 porção (150g)', 'mamao-com-aveia.jpg'),
  ('Mingau de Aveia', 140, 5, 24, 3, 4, 'ml', '1 xícara (200ml)', 'mingau-de-aveia.jpg'),
  ('Mingau de Aveia com Fruta', 160, 5, 28, 3, 4, 'ml', '1 xícara (200ml)', 'mingau-de-aveia.jpg'),
  ('Pupunha com Café', 180, 3, 28, 8, 3, 'g', '1 porção (100g)', 'pupunha-com-cafe.jpg'),
  ('Sanduíche Natural', 220, 10, 32, 6, 3, 'g', '1 sanduíche (120g)', 'sanduiche-natural.jpg'),
  ('Sanduíche Natural de Frango', 240, 18, 30, 6, 3, 'g', '1 sanduíche (140g)', 'sanduiche-natural-de-frango.jpg'),
  ('Stroganoff de Camarão', 180, 22, 8, 7, 1, 'g', '1 porção (150g)', 'stroganoff-de-camarao.jpg'),
  ('Stroganoff de Carne', 220, 24, 10, 10, 1, 'g', '1 porção (150g)', 'stroganoff-de-carne.jpg'),
  ('Stroganoff de Frango Light', 160, 26, 8, 3, 1, 'g', '1 porção (150g)', 'stroganoff-de-frango-light.jpg'),
  ('Macarrão com Carne Moída', 240, 18, 32, 6, 2, 'g', '1 porção (150g)', 'macarrao-com-carne-moida.jpg'),
  ('Macarronada de Camarão', 200, 20, 28, 4, 2, 'g', '1 porção (150g)', 'macarronada-de-camarao.jpg'),
  ('Bife Acebolado', 220, 24, 8, 10, 1, 'g', '1 bife (150g)', 'bife-acebolado.jpg')
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- 4. VERIFICAÇÃO FINAL
-- ============================================================

SELECT 
  'foods' as table_name, COUNT(*) as row_count FROM foods
UNION ALL
SELECT 'v3_diet_templates', COUNT(*) FROM v3_diet_templates;
