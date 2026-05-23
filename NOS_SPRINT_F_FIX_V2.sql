-- ============================================================
-- NOS SPRINT F — FIX V2: habilita unaccent + schema completo
-- Cole este SQL no Supabase SQL Editor
-- ============================================================

-- Habilitar extensão unaccent (necessária para normalização de texto)
CREATE EXTENSION IF NOT EXISTS unaccent;

-- ────────────────────────────────────────────────────────────
-- TABELAS (idempotente)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.nos_foods (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid,
  nutritionist_id   uuid,
  source            text NOT NULL CHECK (source IN ('TACO','USDA','IBGE','custom','brand','supplement')),
  source_id         text,
  source_priority   int NOT NULL DEFAULT 99,
  name              text NOT NULL,
  name_normalized   text,
  brand             text,
  category          text,
  subcategory       text,
  barcode           text,
  kcal_100g         numeric(8,2) NOT NULL DEFAULT 0,
  protein_100g      numeric(8,2) NOT NULL DEFAULT 0,
  carbs_100g        numeric(8,2) NOT NULL DEFAULT 0,
  fat_100g          numeric(8,2) NOT NULL DEFAULT 0,
  fiber_100g        numeric(8,2) DEFAULT 0,
  sodium_100g       numeric(8,2) DEFAULT 0,
  portion_g         numeric(8,2) DEFAULT 100,
  portion_label     text,
  canonical_hash    text,
  canonical_food_id uuid REFERENCES public.nos_foods(id),
  is_canonical      boolean DEFAULT true,
  image_url         text,
  tags              text[],
  is_active         boolean DEFAULT true,
  verified          boolean DEFAULT false,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS nos_foods_name_search_idx
  ON public.nos_foods USING GIN (to_tsvector('portuguese', name));
CREATE INDEX IF NOT EXISTS nos_foods_tenant_idx
  ON public.nos_foods (tenant_id, nutritionist_id, source_priority);
CREATE INDEX IF NOT EXISTS nos_foods_source_idx
  ON public.nos_foods (source, is_active);
CREATE INDEX IF NOT EXISTS nos_foods_canonical_hash_idx
  ON public.nos_foods (canonical_hash) WHERE canonical_hash IS NOT NULL;

ALTER TABLE public.nos_foods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "nos_foods select" ON public.nos_foods;
CREATE POLICY "nos_foods select" ON public.nos_foods
  FOR SELECT USING (tenant_id IS NULL OR tenant_id = get_user_tenant());

DROP POLICY IF EXISTS "nos_foods insert own" ON public.nos_foods;
CREATE POLICY "nos_foods insert own" ON public.nos_foods
  FOR INSERT WITH CHECK (
    tenant_id = get_user_tenant()
    AND nutritionist_id = auth.uid()
    AND source IN ('custom', 'brand', 'supplement')
  );

DROP POLICY IF EXISTS "nos_foods update own" ON public.nos_foods;
CREATE POLICY "nos_foods update own" ON public.nos_foods
  FOR UPDATE USING (
    tenant_id = get_user_tenant() AND nutritionist_id = auth.uid()
  );

CREATE TABLE IF NOT EXISTS public.nos_recipes (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nutritionist_id     uuid NOT NULL,
  tenant_id           uuid,
  name                text NOT NULL,
  description         text,
  version             int NOT NULL DEFAULT 1,
  previous_version_id uuid REFERENCES public.nos_recipes(id),
  yield_g             numeric(8,2) NOT NULL DEFAULT 100,
  portion_g           numeric(8,2) NOT NULL DEFAULT 100,
  portion_label       text,
  servings            int DEFAULT 1,
  kcal_portion        numeric(8,2) NOT NULL DEFAULT 0,
  protein_portion     numeric(8,2) NOT NULL DEFAULT 0,
  carbs_portion       numeric(8,2) NOT NULL DEFAULT 0,
  fat_portion         numeric(8,2) NOT NULL DEFAULT 0,
  fiber_portion       numeric(8,2) DEFAULT 0,
  sodium_portion      numeric(8,2) DEFAULT 0,
  ingredients         jsonb NOT NULL DEFAULT '[]',
  instructions        text,
  prep_time_min       int,
  cook_time_min       int,
  image_url           text,
  tags                text[],
  is_public           boolean DEFAULT false,
  is_active           boolean DEFAULT true,
  created_at          timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS nos_recipes_nutritionist_idx
  ON public.nos_recipes (nutritionist_id, is_active, created_at DESC);

ALTER TABLE public.nos_recipes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "nos_recipes own" ON public.nos_recipes;
CREATE POLICY "nos_recipes own" ON public.nos_recipes
  FOR ALL USING (
    nutritionist_id = auth.uid()
    OR (is_public = true AND tenant_id = get_user_tenant())
  )
  WITH CHECK (nutritionist_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.nos_meal_combos (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nutritionist_id   uuid NOT NULL,
  tenant_id         uuid,
  name              text NOT NULL,
  combo_type        text NOT NULL CHECK (combo_type IN ('meal','marmita','snack','combo','supplement_stack')),
  meal_slot         text,
  kcal_total        numeric(8,2) NOT NULL DEFAULT 0,
  protein_total     numeric(8,2) NOT NULL DEFAULT 0,
  carbs_total       numeric(8,2) NOT NULL DEFAULT 0,
  fat_total         numeric(8,2) NOT NULL DEFAULT 0,
  fiber_total       numeric(8,2) DEFAULT 0,
  items             jsonb NOT NULL DEFAULT '[]',
  substitutions     jsonb DEFAULT '[]',
  image_url         text,
  tags              text[],
  use_count         int DEFAULT 0,
  is_active         boolean DEFAULT true,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS nos_meal_combos_nutritionist_idx
  ON public.nos_meal_combos (nutritionist_id, combo_type, use_count DESC);

ALTER TABLE public.nos_meal_combos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "nos_meal_combos own" ON public.nos_meal_combos;
CREATE POLICY "nos_meal_combos own" ON public.nos_meal_combos
  FOR ALL USING (nutritionist_id = auth.uid() AND tenant_id = get_user_tenant())
  WITH CHECK (nutritionist_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.nos_nutritionist_library (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nutritionist_id   uuid NOT NULL,
  item_type         text NOT NULL CHECK (item_type IN ('food','recipe','combo','supplement')),
  item_id           uuid NOT NULL,
  item_snapshot     jsonb NOT NULL,
  nickname          text,
  pinned            boolean DEFAULT false,
  use_count         int DEFAULT 0,
  last_used_at      timestamptz,
  created_at        timestamptz DEFAULT now(),
  UNIQUE (nutritionist_id, item_type, item_id)
);

CREATE INDEX IF NOT EXISTS nos_library_nutri_idx
  ON public.nos_nutritionist_library (nutritionist_id, item_type, pinned DESC, use_count DESC);

ALTER TABLE public.nos_nutritionist_library ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "nos_library own" ON public.nos_nutritionist_library;
CREATE POLICY "nos_library own" ON public.nos_nutritionist_library
  FOR ALL USING (nutritionist_id = auth.uid())
  WITH CHECK (nutritionist_id = auth.uid());

-- ────────────────────────────────────────────────────────────
-- FUNÇÕES (agora com unaccent disponível)
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.nos_canonical_hash(
  p_name text, p_kcal numeric, p_protein numeric, p_carbs numeric, p_fat numeric
) RETURNS text LANGUAGE sql IMMUTABLE STRICT AS $$
  SELECT md5(
    lower(regexp_replace(unaccent(p_name), '[^a-z0-9]', '', 'g'))
    || ':' || round(p_kcal)::text
    || ':' || round(p_protein)::text
    || ':' || round(p_carbs)::text
    || ':' || round(p_fat)::text
  );
$$;

CREATE OR REPLACE FUNCTION public.nos_search_foods(
  p_query text, p_limit int DEFAULT 20
)
RETURNS TABLE (
  id uuid, name text, source text, source_priority int,
  kcal_100g numeric, protein_100g numeric, carbs_100g numeric,
  fat_100g numeric, fiber_100g numeric, portion_g numeric,
  portion_label text, image_url text, category text,
  verified boolean, canonical_food_id uuid
)
LANGUAGE sql STABLE AS $$
  SELECT
    f.id, f.name, f.source, f.source_priority,
    f.kcal_100g, f.protein_100g, f.carbs_100g,
    f.fat_100g, f.fiber_100g, f.portion_g,
    f.portion_label, f.image_url, f.category,
    f.verified, f.canonical_food_id
  FROM public.nos_foods f
  WHERE f.is_active = true AND f.is_canonical = true AND (
    to_tsvector('portuguese', f.name) @@ plainto_tsquery('portuguese', p_query)
    OR f.name_normalized ILIKE '%' || lower(p_query) || '%'
  )
  ORDER BY f.source_priority ASC,
    ts_rank(to_tsvector('portuguese', f.name), plainto_tsquery('portuguese', p_query)) DESC
  LIMIT p_limit;
$$;

-- ────────────────────────────────────────────────────────────
-- SEED 60 alimentos TACO (idempotente)
-- ────────────────────────────────────────────────────────────
INSERT INTO public.nos_foods (
  source, source_id, source_priority, name, name_normalized, category,
  kcal_100g, protein_100g, carbs_100g, fat_100g, fiber_100g, sodium_100g,
  portion_g, portion_label, verified, is_canonical
) VALUES
('TACO','TACO_001',1,'Arroz branco cozido','arroz branco cozido','Cereais e derivados',128,2.5,28.1,0.2,1.6,1.0,150,'1 xícara (150g)',true,true),
('TACO','TACO_002',1,'Arroz integral cozido','arroz integral cozido','Cereais e derivados',124,2.6,25.8,1.0,2.7,1.0,150,'1 xícara (150g)',true,true),
('TACO','TACO_003',1,'Macarrão cozido','macarrao cozido','Cereais e derivados',150,5.0,30.0,0.9,1.4,1.0,100,'1 porção (100g)',true,true),
('TACO','TACO_004',1,'Pão francês','pao frances','Cereais e derivados',300,9.4,57.9,3.1,2.3,500,50,'1 unidade (50g)',true,true),
('TACO','TACO_005',1,'Aveia em flocos','aveia em flocos','Cereais e derivados',394,13.9,66.6,8.5,9.1,4.0,40,'4 colheres de sopa (40g)',true,true),
('TACO','TACO_006',1,'Tapioca hidratada','tapioca hidratada','Cereais e derivados',140,0.4,34.5,0.1,0.2,1.0,60,'2 colheres de sopa (60g)',true,true),
('TACO','TACO_007',1,'Batata-doce cozida','batata-doce cozida','Hortaliças e derivados',77,1.0,18.4,0.1,2.2,10.0,150,'1 unidade média (150g)',true,true),
('TACO','TACO_008',1,'Cuscuz de milho cozido','cuscuz de milho cozido','Cereais e derivados',139,2.6,29.5,1.2,2.0,2.0,100,'1 porção (100g)',true,true),
('TACO','TACO_009',1,'Pão integral','pao integral','Cereais e derivados',253,8.1,43.9,4.5,6.9,460,50,'1 fatia (50g)',true,true),
('TACO','TACO_010',1,'Mandioca cozida','mandioca cozida','Hortaliças e derivados',125,0.8,30.1,0.3,1.9,5.0,100,'1 porção (100g)',true,true),
('TACO','TACO_011',1,'Feijão carioca cozido','feijao carioca cozido','Leguminosas e derivados',76,4.8,13.6,0.5,8.4,2.0,100,'1 concha (100g)',true,true),
('TACO','TACO_012',1,'Feijão preto cozido','feijao preto cozido','Leguminosas e derivados',77,4.5,14.0,0.5,8.4,2.0,100,'1 concha (100g)',true,true),
('TACO','TACO_013',1,'Lentilha cozida','lentilha cozida','Leguminosas e derivados',93,7.0,17.0,0.5,5.0,2.0,100,'1 porção (100g)',true,true),
('TACO','TACO_014',1,'Grão-de-bico cozido','grao-de-bico cozido','Leguminosas e derivados',164,8.9,27.4,2.6,7.6,7.0,100,'1 porção (100g)',true,true),
('TACO','TACO_015',1,'Ervilha cozida','ervilha cozida','Leguminosas e derivados',70,5.4,11.0,0.6,5.7,2.0,100,'1 porção (100g)',true,true),
('TACO','TACO_016',1,'Frango peito grelhado','frango peito grelhado','Carnes e derivados',159,32.0,0.0,3.2,0.0,61.0,120,'1 filé médio (120g)',true,true),
('TACO','TACO_017',1,'Tilápia grelhada','tilapia grelhada','Peixes e frutos do mar',96,19.5,0.0,2.1,0.0,56.0,150,'1 filé (150g)',true,true),
('TACO','TACO_018',1,'Carne bovina patinho cozido','carne bovina patinho cozido','Carnes e derivados',219,29.1,0.0,11.3,0.0,77.0,100,'1 porção (100g)',true,true),
('TACO','TACO_019',1,'Ovo de galinha cozido','ovo de galinha cozido','Ovos e derivados',146,13.3,0.6,9.5,0.0,151,50,'1 unidade (50g)',true,true),
('TACO','TACO_020',1,'Atum em lata','atum em lata','Peixes e frutos do mar',119,26.0,0.0,1.6,0.0,368,80,'1 lata pequena (80g)',true,true),
('TACO','TACO_021',1,'Salmão grelhado','salmao grelhado','Peixes e frutos do mar',183,27.3,0.0,8.1,0.0,59.0,150,'1 filé (150g)',true,true),
('TACO','TACO_022',1,'Ovo mexido','ovo mexido','Ovos e derivados',140,12.0,1.0,10.0,0.0,120,100,'2 ovos (100g)',true,true),
('TACO','TACO_023',1,'Carne moída grelhada','carne moida grelhada','Carnes e derivados',200,28.0,0.0,9.0,0.0,80.0,100,'1 porção (100g)',true,true),
('TACO','TACO_024',1,'Sardinha em lata','sardinha em lata','Peixes e frutos do mar',208,23.0,0.0,12.5,0.0,430,90,'1 lata (90g)',true,true),
('TACO','TACO_025',1,'Leite integral','leite integral','Leites e derivados',61,3.2,4.7,3.3,0.0,46.0,200,'1 copo (200ml)',true,true),
('TACO','TACO_026',1,'Iogurte natural integral','iogurte natural integral','Leites e derivados',62,3.5,4.9,3.3,0.0,47.0,150,'1 pote (150g)',true,true),
('TACO','TACO_027',1,'Queijo minas frescal','queijo minas frescal','Leites e derivados',264,17.4,3.2,20.7,0.0,420,50,'1 fatia (50g)',true,true),
('TACO','TACO_028',1,'Iogurte grego integral','iogurte grego integral','Leites e derivados',100,6.6,4.0,6.5,0.0,36.0,150,'1 pote (150g)',true,true),
('TACO','TACO_029',1,'Queijo cottage','queijo cottage','Leites e derivados',100,11.1,2.7,4.3,0.0,364,100,'1 porção (100g)',true,true),
('TACO','TACO_030',1,'Banana nanica','banana nanica','Frutas e derivados',92,1.4,23.8,0.1,1.9,1.0,100,'1 unidade média (100g)',true,true),
('TACO','TACO_031',1,'Maçã fuji','maca fuji','Frutas e derivados',56,0.3,15.2,0.1,1.5,1.0,150,'1 unidade (150g)',true,true),
('TACO','TACO_032',1,'Mamão formosa','mamao formosa','Frutas e derivados',40,0.5,10.4,0.1,1.8,2.0,150,'1 porção (150g)',true,true),
('TACO','TACO_033',1,'Morango','morango','Frutas e derivados',30,0.8,7.1,0.3,2.0,1.0,100,'1 xícara (100g)',true,true),
('TACO','TACO_034',1,'Abacate','abacate','Frutas e derivados',96,1.2,6.0,8.4,6.3,2.0,80,'½ unidade (80g)',true,true),
('TACO','TACO_035',1,'Brócolis cozido','brocolis cozido','Hortaliças e derivados',25,2.9,4.4,0.3,2.7,9.0,100,'1 porção (100g)',true,true),
('TACO','TACO_036',1,'Cenoura cozida','cenoura cozida','Hortaliças e derivados',36,0.9,8.3,0.2,3.2,73.0,100,'1 porção (100g)',true,true),
('TACO','TACO_037',1,'Alface','alface','Hortaliças e derivados',11,1.3,1.7,0.2,1.8,8.0,50,'½ prato (50g)',true,true),
('TACO','TACO_038',1,'Tomate','tomate','Hortaliças e derivados',18,1.1,3.9,0.2,1.2,10.0,100,'1 unidade (100g)',true,true),
('TACO','TACO_039',1,'Espinafre cozido','espinafre cozido','Hortaliças e derivados',23,2.3,3.5,0.3,2.4,56.0,100,'1 porção (100g)',true,true),
('TACO','TACO_040',1,'Azeite de oliva','azeite de oliva','Óleos e gorduras',884,0.0,0.0,100.0,0.0,0.0,10,'1 colher de sobremesa (10g)',true,true),
('TACO','TACO_041',1,'Castanha do Pará','castanha do para','Nozes e sementes',656,14.5,15.1,63.5,7.9,1.0,10,'1 unidade (10g)',true,true),
('TACO','TACO_042',1,'Amendoim torrado sem sal','amendoim torrado sem sal','Nozes e sementes',581,26.5,20.8,44.4,8.0,3.0,30,'1 porção (30g)',true,true),
('supplement','SUPP_001',6,'Whey protein concentrado 80%','whey protein concentrado 80','Suplementos',380,80.0,6.0,4.0,0.0,120,30,'1 scoop (30g)',false,true),
('supplement','SUPP_002',6,'Creatina monohidratada','creatina monohidratada','Suplementos',0,0.0,0.0,0.0,0.0,0.0,5,'1 colher de chá (5g)',false,true),
('supplement','SUPP_003',6,'Whey protein isolado 90%','whey protein isolado 90','Suplementos',360,90.0,3.0,1.0,0.0,70.0,30,'1 scoop (30g)',false,true),
('TACO','TACO_050',1,'Mel','mel','Açúcares e derivados',309,0.3,84.0,0.0,0.2,6.0,20,'1 colher de sopa (20g)',true,true),
('TACO','TACO_051',1,'Café coado sem açúcar','cafe coado sem acucar','Bebidas',2,0.3,0.0,0.0,0.0,1.0,200,'1 xícara (200ml)',true,true),
('TACO','TACO_052',1,'Feijão verde cozido','feijao verde cozido','Leguminosas e derivados',29,2.0,5.7,0.1,2.5,1.0,100,'1 porção (100g)',true,true),
('TACO','TACO_053',1,'Quinoa cozida','quinoa cozida','Cereais e derivados',120,4.4,21.3,1.9,2.8,7.0,100,'1 porção (100g)',true,true),
('TACO','TACO_054',1,'Batata inglesa cozida','batata inglesa cozida','Hortaliças e derivados',87,1.9,20.1,0.1,1.7,2.0,150,'1 unidade média (150g)',true,true),
('TACO','TACO_055',1,'Cará cozido','cara cozido','Hortaliças e derivados',110,1.5,26.8,0.1,1.5,3.0,100,'1 porção (100g)',true,true),
('TACO','TACO_056',1,'Milho cozido','milho cozido','Cereais e derivados',86,3.2,18.7,1.3,2.0,1.0,100,'1 porção (100g)',true,true),
('TACO','TACO_057',1,'Aipim cozido','aipim cozido','Hortaliças e derivados',149,0.7,36.4,0.3,1.8,8.0,100,'1 porção (100g)',true,true),
('TACO','TACO_058',1,'Frango coxa grelhada','frango coxa grelhada','Carnes e derivados',181,24.2,0.0,9.0,0.0,77.0,120,'1 coxa (120g)',true,true),
('TACO','TACO_059',1,'Linguiça de frango grelhada','linguica de frango grelhada','Carnes e derivados',210,16.0,2.0,15.0,0.0,620,80,'1 unidade (80g)',true,true),
('TACO','TACO_060',1,'Cream cheese','cream cheese','Leites e derivados',350,6.2,3.8,35.2,0.0,310,30,'1 porção (30g)',true,true)
ON CONFLICT DO NOTHING;

-- Atualizar hash e name_normalized (agora com unaccent disponível)
UPDATE public.nos_foods
SET
  canonical_hash  = public.nos_canonical_hash(name, kcal_100g, protein_100g, carbs_100g, fat_100g),
  name_normalized = lower(unaccent(name))
WHERE canonical_hash IS NULL;

-- Verificação final
DO $$
DECLARE v_count int;
BEGIN
  SELECT COUNT(*) INTO v_count FROM public.nos_foods;
  RAISE NOTICE 'NOS Sprint F OK: % alimentos em nos_foods', v_count;
END;
$$;
