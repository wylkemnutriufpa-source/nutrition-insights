-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- MEDIDAS CASEIRAS + CÁLCULO PROPORCIONAL EM TEMPO REAL
-- Sistema tipo Excel: muda gramas → recalcula TUDO automaticamente
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- ═══════════════════════════════════════════════════════════════════════════
-- TABELA: meal_household_measures
-- Armazena conversões de medidas caseiras (unidades, colheres, xícaras, etc)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS meal_household_measures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  food_name TEXT NOT NULL,
  
  -- MEDIDA PADRÃO (base para cálculos)
  standard_mass_g DECIMAL(10,2) NOT NULL, -- Ex: 50g (1 ovo)
  standard_unit TEXT NOT NULL,            -- Ex: "unidade", "fatia", "colher sopa"
  
  -- NUTRIÇÃO POR MEDIDA PADRÃO
  kcal_per_unit DECIMAL(10,2) NOT NULL,
  protein_g_per_unit DECIMAL(10,2) NOT NULL,
  carbs_g_per_unit DECIMAL(10,2) NOT NULL,
  fat_g_per_unit DECIMAL(10,2) NOT NULL,
  
  -- CONVERSÕES ALTERNATIVAS (opcional)
  alternative_measures JSONB DEFAULT '[]'::jsonb,
  -- Ex: [{"unit": "colher sopa", "mass_g": 15}, {"unit": "xícara", "mass_g": 240}]
  
  -- METADADOS
  image_url TEXT,
  category TEXT, -- "proteina", "carboidrato", "fruta", etc
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_household_measures_food ON meal_household_measures(food_name);
CREATE INDEX idx_household_measures_category ON meal_household_measures(category);

-- ═══════════════════════════════════════════════════════════════════════════
-- FUNÇÃO: calculate_nutrition_proportional
-- Recalcula nutrição proporcionalmente baseado na massa
-- FÓRMULA: Proteína = 4kcal/g | Carboidrato = 4kcal/g | Lipídeo = 9kcal/g
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION calculate_nutrition_proportional(
  p_food_name TEXT,
  p_target_mass_g DECIMAL
)
RETURNS TABLE (
  mass_g DECIMAL,
  units DECIMAL,
  unit_name TEXT,
  kcal DECIMAL,
  protein_g DECIMAL,
  carbs_g DECIMAL,
  fat_g DECIMAL,
  kcal_from_protein DECIMAL,
  kcal_from_carbs DECIMAL,
  kcal_from_fat DECIMAL
) AS $$
DECLARE
  v_measure RECORD;
  v_ratio DECIMAL;
BEGIN
  -- Busca medida padrão do alimento
  SELECT * INTO v_measure
  FROM meal_household_measures
  WHERE food_name = p_food_name
  LIMIT 1;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Alimento "%" não encontrado em meal_household_measures', p_food_name;
  END IF;
  
  -- Calcula proporção (ex: 100g / 50g = 2x)
  v_ratio := p_target_mass_g / v_measure.standard_mass_g;
  
  -- Retorna valores proporcionais
  RETURN QUERY SELECT
    p_target_mass_g AS mass_g,
    v_ratio AS units,
    v_measure.standard_unit AS unit_name,
    ROUND(v_measure.kcal_per_unit * v_ratio, 2) AS kcal,
    ROUND(v_measure.protein_g_per_unit * v_ratio, 2) AS protein_g,
    ROUND(v_measure.carbs_g_per_unit * v_ratio, 2) AS carbs_g,
    ROUND(v_measure.fat_g_per_unit * v_ratio, 2) AS fat_g,
    ROUND(v_measure.protein_g_per_unit * v_ratio * 4, 2) AS kcal_from_protein,
    ROUND(v_measure.carbs_g_per_unit * v_ratio * 4, 2) AS kcal_from_carbs,
    ROUND(v_measure.fat_g_per_unit * v_ratio * 9, 2) AS kcal_from_fat;
END;
$$ LANGUAGE plpgsql STABLE;

-- ═══════════════════════════════════════════════════════════════════════════
-- INSERIR MEDIDAS CASEIRAS PADRÃO
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO meal_household_measures (food_name, standard_mass_g, standard_unit, kcal_per_unit, protein_g_per_unit, carbs_g_per_unit, fat_g_per_unit, category, image_url) VALUES
-- OVOS
('Ovo', 50, 'unidade', 73, 6.3, 0.3, 5.0, 'proteina', 'https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/ovos-cozidos.jpg'),
('Ovo Mexido', 50, 'unidade', 73, 6.0, 0.3, 5.0, 'proteina', 'https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/ovos-mexidos.jpg'),
('Ovo Cozido', 50, 'unidade', 78, 6.5, 0.5, 5.5, 'proteina', 'https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/ovos-cozidos.jpg'),

-- PÃES
('Pão Integral', 50, 'fatia', 120, 4, 24, 1, 'carboidrato', 'https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/torrada-integral.jpg'),
('Pão Francês', 50, 'unidade', 135, 4, 28, 1, 'carboidrato', 'https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/pao-com-ovo.jpg'),
('Pão de Queijo', 50, 'unidade', 165, 4, 20, 8, 'carboidrato', 'https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/pao-de-queijo.jpg'),

-- FRUTAS
('Banana', 100, 'unidade', 89, 1.1, 22.8, 0.3, 'fruta', 'https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/banana-com-aveia.jpg'),
('Maçã', 150, 'unidade', 78, 0.4, 20.7, 0.3, 'fruta', 'https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/maca.jpg'),
('Laranja', 180, 'unidade', 86, 1.7, 21.6, 0.2, 'fruta', 'https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/laranja.jpg'),
('Pera', 150, 'unidade', 86, 0.5, 23.0, 0.2, 'fruta', 'https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/pera.jpg'),
('Mamão', 100, 'fatia', 43, 0.5, 11.0, 0.1, 'fruta', 'https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/mamao-com-aveia.jpg'),
('Manga', 100, 'unidade', 60, 0.8, 15.0, 0.4, 'fruta', 'https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/manga.jpg'),
('Morango', 100, 'porção', 32, 0.7, 7.7, 0.3, 'fruta', 'https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/morango.jpg'),
('Melancia', 150, 'fatia', 45, 0.9, 11.5, 0.2, 'fruta', 'https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/melancia.jpg'),
('Abacaxi', 100, 'fatia', 50, 0.5, 13.1, 0.1, 'fruta', 'https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/abacaxi.jpg'),
('Uva', 100, 'cacho', 69, 0.7, 18.1, 0.2, 'fruta', 'https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/uva.jpg'),

-- PROTEÍNAS
('Frango Grelhado', 100, 'porção', 165, 31, 0, 3.6, 'proteina', 'https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/frango-grelhado.jpg'),
('Peito de Frango', 100, 'porção', 165, 31, 0, 3.6, 'proteina', 'https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/frango-grelhado-1.jpg'),
('Filé de Tilápia', 100, 'porção', 96, 20, 0, 1.7, 'proteina', 'https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/file-de-tilapia.jpg'),
('Carne Vermelha', 100, 'porção', 250, 26, 0, 15, 'proteina', 'https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/carne-grelhada.jpg'),

-- CARBOIDRATOS
('Arroz Branco', 100, 'colher sopa', 130, 2.7, 28.2, 0.3, 'carboidrato', 'https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/carne-com-batata.jpg'),
('Arroz Integral', 100, 'colher sopa', 123, 2.6, 25.8, 1.0, 'carboidrato', 'https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/carne-com-batata.jpg'),
('Batata Doce', 100, 'unidade', 86, 1.6, 20.1, 0.1, 'carboidrato', 'https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/frango-com-batata-doce.jpg'),
('Batata Branca', 100, 'unidade', 77, 2.0, 17.5, 0.1, 'carboidrato', 'https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/carne-com-batata.jpg'),
('Macarrão', 100, 'porção', 131, 5.0, 25.0, 1.1, 'carboidrato', 'https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/macarrao-com-carne-moida.jpg'),
('Tapioca', 50, 'unidade', 150, 0.2, 37.0, 0.1, 'carboidrato', 'https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/tapioca-com-ovo.jpg'),
('Cuscuz', 100, 'porção', 112, 3.8, 23.0, 0.2, 'carboidrato', 'https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/cuscuz-com-ovo.jpg'),
('Aveia', 30, 'colher sopa', 117, 4.1, 20.6, 2.3, 'carboidrato', 'https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/banana-com-aveia.jpg'),

-- LATICÍNIOS
('Iogurte Natural', 170, 'pote', 61, 5.7, 6.8, 1.5, 'laticinios', 'https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/iogurte-natural.jpg'),
('Queijo Branco', 30, 'fatia', 69, 5.4, 1.2, 4.5, 'laticinios', 'https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/pao-com-queijo.jpg'),
('Leite Integral', 200, 'copo', 122, 6.4, 9.0, 6.7, 'laticinios', 'https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/copo-de-leite-morno.jpg')

ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- COMENTÁRIOS E DOCUMENTAÇÃO
-- ═══════════════════════════════════════════════════════════════════════════

COMMENT ON TABLE meal_household_measures IS 'Medidas caseiras para cálculo proporcional em tempo real';
COMMENT ON FUNCTION calculate_nutrition_proportional IS 'Recalcula nutrição proporcionalmente: Proteína=4kcal/g, Carbo=4kcal/g, Lipídeo=9kcal/g';

-- ═══════════════════════════════════════════════════════════════════════════
-- EXEMPLO DE USO
-- ═══════════════════════════════════════════════════════════════════════════

-- Calcular 3 ovos (150g):
-- SELECT * FROM calculate_nutrition_proportional('Ovo', 150);
-- Resultado: 3 unidades, 219 kcal, 18.9g proteína

-- Calcular 2 fatias de pão (100g):
-- SELECT * FROM calculate_nutrition_proportional('Pão Integral', 100);
-- Resultado: 2 fatias, 240 kcal, 8g proteína

-- Calcular 1.5 bananas (150g):
-- SELECT * FROM calculate_nutrition_proportional('Banana', 150);
-- Resultado: 1.5 unidades, 133.5 kcal, 1.65g proteína
