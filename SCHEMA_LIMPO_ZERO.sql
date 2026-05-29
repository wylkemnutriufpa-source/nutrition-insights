-- ============================================================
-- FITJOURNEY 2.0 — SCHEMA LIMPO DO ZERO
-- ============================================================
-- Estrutura mínima e essencial para o sistema funcionar
-- Data: 29 de Maio de 2026
-- Objetivo: Banco de dados limpo, sem redundâncias

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

-- Habilitar RLS
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_plan_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE foods ENABLE ROW LEVEL SECURITY;
ALTER TABLE v3_diet_templates ENABLE ROW LEVEL SECURITY;

-- Pacientes: Usuário só vê seus próprios pacientes
CREATE POLICY "Patients: Users can view their own patients"
  ON patients FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Patients: Users can insert their own patients"
  ON patients FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Patients: Users can update their own patients"
  ON patients FOR UPDATE
  USING (auth.uid() = user_id);

-- Planos de Refeições: Usuário só vê planos de seus pacientes
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

-- Itens do Plano: Usuário só vê itens de seus planos
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

-- Alimentos: Todos podem ler, apenas admin pode escrever
CREATE POLICY "Foods: Everyone can view foods"
  ON foods FOR SELECT
  USING (true);

-- Templates: Todos podem ler, apenas admin pode escrever
CREATE POLICY "Templates: Everyone can view active templates"
  ON v3_diet_templates FOR SELECT
  USING (active = true);

-- ============================================================
-- 9. DADOS INICIAIS (Alimentos Básicos)
-- ============================================================

INSERT INTO foods (name, kcal_100g, protein_g, carbs_g, fat_g, fiber_g, unit, portion_label, image_url)
VALUES
  ('Pão Integral', 265, 9, 49, 3.3, 7, 'g', '1 fatia (30g)', 'https://images.unsplash.com/photo-1541519227354-08fa5d50c44d'),
  ('Ovo', 155, 13, 1.1, 11, 0, 'unidade', '1 ovo (50g)', 'https://images.unsplash.com/photo-1585238341710-4b4e6cefc688'),
  ('Queijo Meia Cura', 402, 25, 1.3, 33, 0, 'g', '1 fatia (30g)', 'https://images.unsplash.com/photo-1452895917121-33c76319b7fb'),
  ('Tapioca', 360, 0.3, 88, 0.2, 0, 'g', '1 colher (30g)', 'https://images.unsplash.com/photo-1585238341710-4b4e6cefc688'),
  ('Cuscuz', 376, 12, 67, 3, 11, 'g', '1 colher (30g)', 'https://images.unsplash.com/photo-1585238341710-4b4e6cefc688'),
  ('Frango Peito', 165, 31, 0, 3.6, 0, 'g', '100g', 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6'),
  ('Peixe Branco', 82, 17.4, 0, 0.7, 0, 'g', '100g', 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c'),
  ('Carne Vermelha', 250, 26, 0, 15, 0, 'g', '100g', 'https://images.unsplash.com/photo-1432139555190-58524dae6a55'),
  ('Arroz Branco', 130, 2.7, 28, 0.3, 0.4, 'g', '1 colher (30g)', 'https://images.unsplash.com/photo-1585238341710-4b4e6cefc688'),
  ('Feijão Cozido', 76, 5.2, 14, 0.3, 3.7, 'g', '1 colher (30g)', 'https://images.unsplash.com/photo-1585238341710-4b4e6cefc688'),
  ('Maçã', 52, 0.3, 14, 0.2, 2.4, 'unidade', '1 maçã (150g)', 'https://images.unsplash.com/photo-1560806674-d257a3f67b51'),
  ('Banana', 89, 1.1, 23, 0.3, 2.6, 'unidade', '1 banana (100g)', 'https://images.unsplash.com/photo-1560806674-d257a3f67b51'),
  ('Laranja', 47, 0.9, 12, 0.3, 2.4, 'unidade', '1 laranja (150g)', 'https://images.unsplash.com/photo-1560806674-d257a3f67b51'),
  ('Iogurte Natural', 59, 3.5, 4.7, 0.4, 0, 'ml', '200ml', 'https://images.unsplash.com/photo-1585238341710-4b4e6cefc688'),
  ('Leite Integral', 61, 3.2, 4.8, 3.3, 0, 'ml', '200ml', 'https://images.unsplash.com/photo-1585238341710-4b4e6cefc688'),
  ('Aveia', 389, 17, 66, 7, 10.6, 'g', '2 colheres (30g)', 'https://images.unsplash.com/photo-1585238341710-4b4e6cefc688'),
  ('Granola', 471, 12, 63, 20, 7, 'g', '1 colher (30g)', 'https://images.unsplash.com/photo-1585238341710-4b4e6cefc688'),
  ('Castanha do Pará', 656, 14, 12, 66, 2.1, 'g', '1 unidade (5g)', 'https://images.unsplash.com/photo-1585238341710-4b4e6cefc688'),
  ('Amêndoa', 579, 21, 22, 50, 12.5, 'g', '10 unidades (10g)', 'https://images.unsplash.com/photo-1585238341710-4b4e6cefc688'),
  ('Salada Verde', 23, 2.2, 3.7, 0.4, 2.2, 'g', '1 porção (100g)', 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd')
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
                "visual": {"image_url": "https://images.unsplash.com/photo-1541519227354-08fa5d50c44d"},
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
                "visual": {"image_url": "https://images.unsplash.com/photo-1560806674-d257a3f67b51"},
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
                "visual": {"image_url": "https://images.unsplash.com/photo-1598103442097-8b74394b95c6"},
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
                "visual": {"image_url": "https://images.unsplash.com/photo-1585238341710-4b4e6cefc688"},
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
                "visual": {"image_url": "https://images.unsplash.com/photo-1598103442097-8b74394b95c6"},
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
-- FIM DO SCHEMA
-- ============================================================

-- Verificação final
SELECT 
  'patients' as table_name, COUNT(*) as row_count FROM patients
UNION ALL
SELECT 'foods', COUNT(*) FROM foods
UNION ALL
SELECT 'v3_diet_templates', COUNT(*) FROM v3_diet_templates;

