-- ============================================================
-- FITJOURNEY 2.0 — SCHEMA COMPLETO COM TODOS OS ALIMENTOS
-- ============================================================
-- Data: 29 de Maio de 2026
-- Objetivo: Schema limpo com banco de alimentos completo

-- ============================================================
-- 1. TABELA: PATIENTS (Pacientes)
-- ============================================================

CREATE TABLE IF NOT EXISTS patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  date_of_birth DATE,
  gender TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, email)
);

-- ============================================================
-- 2. TABELA: FOODS (Alimentos)
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
-- 3. TABELA: FOOD_SUBSTITUTIONS (Substituições de Alimentos)
-- ============================================================

CREATE TABLE IF NOT EXISTS food_substitutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  food_id UUID NOT NULL REFERENCES foods(id) ON DELETE CASCADE,
  substitute_food_id UUID NOT NULL REFERENCES foods(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(food_id, substitute_food_id)
);

-- ============================================================
-- 4. TABELA: V3_DIET_TEMPLATES (Templates de Dieta)
-- ============================================================

CREATE TABLE IF NOT EXISTS v3_diet_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  kcal_target NUMERIC(10, 2) NOT NULL,
  plan_snapshot JSONB NOT NULL,
  tags JSONB DEFAULT '[]'::jsonb,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 5. TABELA: MEAL_PLANS (Planos de Refeições)
-- ============================================================

CREATE TABLE IF NOT EXISTS meal_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  template_id UUID REFERENCES v3_diet_templates(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  kcal_target NUMERIC(10, 2) NOT NULL,
  status TEXT DEFAULT 'draft',
  plan_snapshot JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 6. TABELA: MEAL_PLAN_ITEMS (Itens do Plano de Refeições)
-- ============================================================

CREATE TABLE IF NOT EXISTS meal_plan_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_plan_id UUID NOT NULL REFERENCES meal_plans(id) ON DELETE CASCADE,
  food_id UUID REFERENCES foods(id) ON DELETE SET NULL,
  day_number INTEGER NOT NULL,
  meal_time TEXT NOT NULL,
  quantity NUMERIC(10, 2) NOT NULL,
  display_quantity NUMERIC(10, 2),
  display_unit TEXT,
  description TEXT,
  kcal NUMERIC(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 7. ÍNDICES (Performance)
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_patients_user_id ON patients(user_id);
CREATE INDEX IF NOT EXISTS idx_meal_plans_patient_id ON meal_plans(patient_id);
CREATE INDEX IF NOT EXISTS idx_meal_plan_items_meal_plan_id ON meal_plan_items(meal_plan_id);
CREATE INDEX IF NOT EXISTS idx_v3_diet_templates_slug ON v3_diet_templates(slug);
CREATE INDEX IF NOT EXISTS idx_foods_name ON foods(name);

-- ============================================================
-- 8. RLS POLICIES (Row Level Security)
-- ============================================================

ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_plan_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE foods ENABLE ROW LEVEL SECURITY;
ALTER TABLE v3_diet_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients: Users can view their own patients"
  ON patients FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Patients: Users can insert their own patients"
  ON patients FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Patients: Users can update their own patients"
  ON patients FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Meal Plans: Users can view their own meal plans"
  ON meal_plans FOR SELECT
  USING (
    patient_id IN (
      SELECT id FROM patients WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Meal Plans: Users can insert meal plans for their patients"
  ON meal_plans FOR INSERT
  WITH CHECK (
    patient_id IN (
      SELECT id FROM patients WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Meal Plans: Users can update their own meal plans"
  ON meal_plans FOR UPDATE
  USING (
    patient_id IN (
      SELECT id FROM patients WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Meal Plan Items: Users can view their own items"
  ON meal_plan_items FOR SELECT
  USING (
    meal_plan_id IN (
      SELECT id FROM meal_plans WHERE patient_id IN (
        SELECT id FROM patients WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Meal Plan Items: Users can insert items for their plans"
  ON meal_plan_items FOR INSERT
  WITH CHECK (
    meal_plan_id IN (
      SELECT id FROM meal_plans WHERE patient_id IN (
        SELECT id FROM patients WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Meal Plan Items: Users can update their own items"
  ON meal_plan_items FOR UPDATE
  USING (
    meal_plan_id IN (
      SELECT id FROM meal_plans WHERE patient_id IN (
        SELECT id FROM patients WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Foods: Everyone can view foods"
  ON foods FOR SELECT
  USING (true);

CREATE POLICY "Templates: Everyone can view active templates"
  ON v3_diet_templates FOR SELECT
  USING (active = true);


-- ============================================================
-- 9. DADOS INICIAIS — ALIMENTOS (Banco Completo)
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
  ('Salada de Frutas', 55, 0.7, 13, 0.2, 1.5, 'g', '1 porção (150g)', 'salada-de-frutas.jpg'),
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
  ('Macarro com Carne Moída', 240, 18, 32, 6, 2, 'g', '1 porção (150g)', 'macarrao-com-carne-moida.jpg'),
  ('Bife Acebolado', 220, 24, 8, 10, 1, 'g', '1 bife (150g)', 'bife-acebolado.jpg'),
  ('Coxá e Sobrecoxa', 215, 20, 0, 15, 0, 'g', '100g', 'coxa-e-sobrecoxa.jpg')
ON CONFLICT (name) DO NOTHING;


-- ============================================================
-- 10. TEMPLATE EXEMPLO: Prático Café da Manhã (1200 kcal)
-- ============================================================

INSERT INTO v3_diet_templates (title, slug, description, kcal_target, plan_snapshot, tags, active)
VALUES (
  'Prático Café da Manhã',
  'pratico-cafe-manha-1200',
  'Template prático com 6 opções de café da manhã',
  1200,
  '{
    "days": [
      {
        "day": 1,
        "meals": [
          {
            "name": "Café da Manhã",
            "time": "08:00",
            "items": [
              {
                "id": "cafe-pao-ovo-1200",
                "title": "Pão integral + Ovo",
                "quantity_display": "1 fatia + 1 unidade",
                "quantity": 80,
                "clinical_mass_g": 80,
                "kcal": 280,
                "macros": {"kcal": 280, "protein_g": 14, "carbs_g": 30, "fat_g": 10},
                "visual": {"image_url": "pao-com-frango-desfiado.jpg"},
                "is_primary": true
              }
            ],
            "substitutions": [
              {
                "id": "cafe-pao-queijo-1200",
                "title": "Pão integral + Queijo",
                "quantity_display": "1 fatia + 1 fatia",
                "quantity": 60,
                "clinical_mass_g": 60,
                "kcal": 290,
                "macros": {"kcal": 290, "protein_g": 15, "carbs_g": 28, "fat_g": 12}
              },
              {
                "id": "cafe-tapioca-ovo-1200",
                "title": "Tapioca + Ovo",
                "quantity_display": "1 colher + 1 unidade",
                "quantity": 80,
                "clinical_mass_g": 80,
                "kcal": 275,
                "macros": {"kcal": 275, "protein_g": 13, "carbs_g": 32, "fat_g": 9}
              },
              {
                "id": "cafe-tapioca-queijo-1200",
                "title": "Tapioca + Queijo",
                "quantity_display": "1 colher + 1 fatia",
                "quantity": 60,
                "clinical_mass_g": 60,
                "kcal": 285,
                "macros": {"kcal": 285, "protein_g": 14, "carbs_g": 30, "fat_g": 11}
              },
              {
                "id": "cafe-cuscuz-ovo-1200",
                "title": "Cuscuz + Ovo",
                "quantity_display": "1 colher + 1 unidade",
                "quantity": 80,
                "clinical_mass_g": 80,
                "kcal": 280,
                "macros": {"kcal": 280, "protein_g": 13, "carbs_g": 31, "fat_g": 10}
              },
              {
                "id": "cafe-cuscuz-queijo-1200",
                "title": "Cuscuz + Queijo",
                "quantity_display": "1 colher + 1 fatia",
                "quantity": 60,
                "clinical_mass_g": 60,
                "kcal": 290,
                "macros": {"kcal": 290, "protein_g": 14, "carbs_g": 29, "fat_g": 12}
              }
            ]
          },
          {
            "name": "Lanche da Manhã",
            "time": "10:00",
            "items": [
              {
                "id": "lanche-fruta-1200",
                "title": "Maçã",
                "quantity_display": "1 unidade",
                "quantity": 150,
                "clinical_mass_g": 150,
                "kcal": 78,
                "macros": {"kcal": 78, "protein_g": 0.5, "carbs_g": 21, "fat_g": 0.3},
                "visual": {"image_url": "maca.jpg"},
                "is_primary": true
              }
            ]
          },
          {
            "name": "Almoço",
            "time": "12:00",
            "items": [
              {
                "id": "almoco-frango-1200",
                "title": "Frango + Arroz + Feijão",
                "quantity_display": "100g + 1 colher + 1 colher",
                "quantity": 160,
                "clinical_mass_g": 160,
                "kcal": 450,
                "macros": {"kcal": 450, "protein_g": 35, "carbs_g": 45, "fat_g": 8},
                "visual": {"image_url": "frango-grelhado.jpg"},
                "is_primary": true
              }
            ]
          },
          {
            "name": "Lanche da Tarde",
            "time": "15:00",
            "items": [
              {
                "id": "lanche-tarde-iogurte-1200",
                "title": "Iogurte Natural",
                "quantity_display": "200ml",
                "quantity": 200,
                "clinical_mass_g": 200,
                "kcal": 118,
                "macros": {"kcal": 118, "protein_g": 7, "carbs_g": 9.4, "fat_g": 0.8},
                "visual": {"image_url": "iogurte-com-fruta.jpg"},
                "is_primary": true
              }
            ]
          },
          {
            "name": "Jantar",
            "time": "19:00",
            "items": [
              {
                "id": "jantar-frango-1200",
                "title": "Frango + Arroz",
                "quantity_display": "100g + 1 colher",
                "quantity": 130,
                "clinical_mass_g": 130,
                "kcal": 380,
                "macros": {"kcal": 380, "protein_g": 33, "carbs_g": 40, "fat_g": 6},
                "visual": {"image_url": "frango-grelhado.jpg"},
                "is_primary": true
              }
            ]
          }
        ]
      }
    ]
  }'::jsonb,
  '["pratico", "cafe", "emagrecimento", "1200kcal"]'::jsonb,
  true
)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- 11. VERIFICAÇÃO FINAL
-- ============================================================

SELECT 
  'patients' as table_name, COUNT(*) as row_count FROM patients
UNION ALL
SELECT 'foods', COUNT(*) FROM foods
UNION ALL
SELECT 'v3_diet_templates', COUNT(*) FROM v3_diet_templates;

