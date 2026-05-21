-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- TEMPLATES PARA RESTRIÇÕES ALIMENTARES
-- Zero Glúten | Zero Lactose | Low FODMAP | Combinações
-- Com variações calóricas e substituições inteligentes
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- ═══════════════════════════════════════════════════════════════════════════
-- TABELA: food_restrictions
-- Marca alimentos com suas restrições
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS food_restrictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  food_name TEXT NOT NULL UNIQUE,
  
  -- RESTRIÇÕES
  has_gluten BOOLEAN DEFAULT false,
  has_lactose BOOLEAN DEFAULT false,
  is_high_fodmap BOOLEAN DEFAULT false,
  
  -- ALTERNATIVAS SEM RESTRIÇÃO
  gluten_free_alternatives TEXT[] DEFAULT '{}',
  lactose_free_alternatives TEXT[] DEFAULT '{}',
  low_fodmap_alternatives TEXT[] DEFAULT '{}',
  
  -- METADADOS
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_food_restrictions_gluten ON food_restrictions(has_gluten);
CREATE INDEX idx_food_restrictions_lactose ON food_restrictions(has_lactose);
CREATE INDEX idx_food_restrictions_fodmap ON food_restrictions(is_high_fodmap);

-- ═══════════════════════════════════════════════════════════════════════════
-- INSERIR RESTRIÇÕES DOS ALIMENTOS
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO food_restrictions (food_name, has_gluten, has_lactose, is_high_fodmap, gluten_free_alternatives, lactose_free_alternatives, low_fodmap_alternatives) VALUES

-- CARBOIDRATOS
('Pão Integral', true, false, true, ARRAY['Pão sem Glúten', 'Tapioca', 'Batata Doce'], ARRAY['Pão Integral'], ARRAY['Arroz Branco', 'Batata Doce']),
('Pão Francês', true, false, true, ARRAY['Pão sem Glúten', 'Tapioca'], ARRAY['Pão Francês'], ARRAY['Arroz Branco', 'Batata Doce']),
('Macarrão', true, false, true, ARRAY['Macarrão sem Glúten', 'Arroz'], ARRAY['Macarrão'], ARRAY['Arroz Branco']),
('Aveia', true, false, false, ARRAY['Aveia sem Glúten', 'Quinoa'], ARRAY['Aveia'], ARRAY['Aveia']),
('Cuscuz', true, false, true, ARRAY['Tapioca', 'Batata Doce'], ARRAY['Cuscuz'], ARRAY['Arroz Branco']),

-- SEM GLÚTEN
('Arroz Branco', false, false, false, ARRAY['Arroz Branco'], ARRAY['Arroz Branco'], ARRAY['Arroz Branco']),
('Arroz Integral', false, false, false, ARRAY['Arroz Integral'], ARRAY['Arroz Integral'], ARRAY['Arroz Integral']),
('Batata Doce', false, false, false, ARRAY['Batata Doce'], ARRAY['Batata Doce'], ARRAY['Batata Doce']),
('Batata Branca', false, false, false, ARRAY['Batata Branca'], ARRAY['Batata Branca'], ARRAY['Batata Branca']),
('Tapioca', false, false, false, ARRAY['Tapioca'], ARRAY['Tapioca'], ARRAY['Tapioca']),
('Mandioca', false, false, false, ARRAY['Mandioca'], ARRAY['Mandioca'], ARRAY['Mandioca']),
('Macaxeira', false, false, false, ARRAY['Macaxeira'], ARRAY['Macaxeira'], ARRAY['Macaxeira']),
('Inhame', false, false, false, ARRAY['Inhame'], ARRAY['Inhame'], ARRAY['Inhame']),
('Milho', false, false, false, ARRAY['Milho'], ARRAY['Milho'], ARRAY['Milho']),

-- LATICÍNIOS (TÊM LACTOSE)
('Iogurte Natural', false, true, false, ARRAY['Iogurte Natural'], ARRAY['Iogurte sem Lactose', 'Iogurte de Coco'], ARRAY['Iogurte sem Lactose']),
('Queijo Branco', false, true, false, ARRAY['Queijo Branco'], ARRAY['Queijo sem Lactose'], ARRAY['Queijo sem Lactose']),
('Leite Integral', false, true, true, ARRAY['Leite Integral'], ARRAY['Leite sem Lactose', 'Leite de Amêndoas', 'Leite de Coco'], ARRAY['Leite sem Lactose']),

-- PROTEÍNAS (SEM GLÚTEN E LACTOSE)
('Ovo', false, false, false, ARRAY['Ovo'], ARRAY['Ovo'], ARRAY['Ovo']),
('Ovo Mexido', false, false, false, ARRAY['Ovo Mexido'], ARRAY['Ovo Mexido'], ARRAY['Ovo Mexido']),
('Ovo Cozido', false, false, false, ARRAY['Ovo Cozido'], ARRAY['Ovo Cozido'], ARRAY['Ovo Cozido']),
('Frango Grelhado', false, false, false, ARRAY['Frango Grelhado'], ARRAY['Frango Grelhado'], ARRAY['Frango Grelhado']),
('Peito de Frango', false, false, false, ARRAY['Peito de Frango'], ARRAY['Peito de Frango'], ARRAY['Peito de Frango']),
('Filé de Tilápia', false, false, false, ARRAY['Filé de Tilápia'], ARRAY['Filé de Tilápia'], ARRAY['Filé de Tilápia']),
('Carne Vermelha', false, false, false, ARRAY['Carne Vermelha'], ARRAY['Carne Vermelha'], ARRAY['Carne Vermelha']),

-- FRUTAS (LOW FODMAP depende da quantidade)
('Banana', false, false, false, ARRAY['Banana'], ARRAY['Banana'], ARRAY['Banana']),
('Maçã', false, false, true, ARRAY['Maçã'], ARRAY['Maçã'], ARRAY['Banana', 'Morango', 'Laranja']),
('Laranja', false, false, false, ARRAY['Laranja'], ARRAY['Laranja'], ARRAY['Laranja']),
('Pera', false, false, true, ARRAY['Pera'], ARRAY['Pera'], ARRAY['Banana', 'Morango']),
('Mamão', false, false, false, ARRAY['Mamão'], ARRAY['Mamão'], ARRAY['Mamão']),
('Manga', false, false, true, ARRAY['Manga'], ARRAY['Manga'], ARRAY['Banana', 'Morango']),
('Morango', false, false, false, ARRAY['Morango'], ARRAY['Morango'], ARRAY['Morango']),
('Melancia', false, false, true, ARRAY['Melancia'], ARRAY['Melancia'], ARRAY['Morango', 'Banana']),
('Abacaxi', false, false, false, ARRAY['Abacaxi'], ARRAY['Abacaxi'], ARRAY['Abacaxi']),
('Uva', false, false, false, ARRAY['Uva'], ARRAY['Uva'], ARRAY['Uva'])

ON CONFLICT (food_name) DO UPDATE SET
  has_gluten = EXCLUDED.has_gluten,
  has_lactose = EXCLUDED.has_lactose,
  is_high_fodmap = EXCLUDED.is_high_fodmap,
  gluten_free_alternatives = EXCLUDED.gluten_free_alternatives,
  lactose_free_alternatives = EXCLUDED.lactose_free_alternatives,
  low_fodmap_alternatives = EXCLUDED.low_fodmap_alternatives,
  updated_at = NOW();

-- ═══════════════════════════════════════════════════════════════════════════
-- FUNÇÃO: get_safe_alternatives
-- Retorna alternativas seguras baseado nas restrições do paciente
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_safe_alternatives(
  p_food_name TEXT,
  p_avoid_gluten BOOLEAN DEFAULT false,
  p_avoid_lactose BOOLEAN DEFAULT false,
  p_avoid_high_fodmap BOOLEAN DEFAULT false
)
RETURNS TEXT[] AS $$
DECLARE
  v_alternatives TEXT[];
  v_restriction RECORD;
BEGIN
  -- Busca restrições do alimento
  SELECT * INTO v_restriction
  FROM food_restrictions
  WHERE food_name = p_food_name;
  
  IF NOT FOUND THEN
    -- Se não tem restrição cadastrada, retorna o próprio alimento
    RETURN ARRAY[p_food_name];
  END IF;
  
  -- Inicializa com todas as alternativas possíveis
  v_alternatives := ARRAY[p_food_name];
  
  -- Se precisa evitar glúten E o alimento tem glúten
  IF p_avoid_gluten AND v_restriction.has_gluten THEN
    v_alternatives := v_restriction.gluten_free_alternatives;
  END IF;
  
  -- Se precisa evitar lactose E o alimento tem lactose
  IF p_avoid_lactose AND v_restriction.has_lactose THEN
    v_alternatives := v_restriction.lactose_free_alternatives;
  END IF;
  
  -- Se precisa evitar FODMAP E o alimento é high FODMAP
  IF p_avoid_high_fodmap AND v_restriction.is_high_fodmap THEN
    v_alternatives := v_restriction.low_fodmap_alternatives;
  END IF;
  
  RETURN v_alternatives;
END;
$$ LANGUAGE plpgsql STABLE;

-- ═══════════════════════════════════════════════════════════════════════════
-- TEMPLATES ESPECIALIZADOS
-- ═══════════════════════════════════════════════════════════════════════════

-- Adicionar coluna de restrições na tabela de templates
ALTER TABLE meal_plan_templates ADD COLUMN IF NOT EXISTS dietary_restrictions JSONB DEFAULT '{
  "gluten_free": false,
  "lactose_free": false,
  "low_fodmap": false
}'::jsonb;

-- ═══════════════════════════════════════════════════════════════════════════
-- INSERIR TEMPLATES COM RESTRIÇÕES
-- ═══════════════════════════════════════════════════════════════════════════

-- Template: ZERO GLÚTEN - 1400 kcal
INSERT INTO meal_plan_templates (
  slug,
  title,
  description,
  objective,
  kcal_target,
  dietary_restrictions
) VALUES (
  'zero-gluten-1400',
  'Zero Glúten 1400 kcal',
  'Plano sem glúten para emagrecimento',
  'emagrecimento',
  1400,
  '{"gluten_free": true, "lactose_free": false, "low_fodmap": false}'::jsonb
),
(
  'zero-gluten-1800',
  'Zero Glúten 1800 kcal',
  'Plano sem glúten para manutenção',
  'saude',
  1800,
  '{"gluten_free": true, "lactose_free": false, "low_fodmap": false}'::jsonb
),
(
  'zero-gluten-2200',
  'Zero Glúten 2200 kcal',
  'Plano sem glúten para hipertrofia',
  'hipertrofia',
  2200,
  '{"gluten_free": true, "lactose_free": false, "low_fodmap": false}'::jsonb
),

-- Template: ZERO LACTOSE - 1400 kcal
(
  'zero-lactose-1400',
  'Zero Lactose 1400 kcal',
  'Plano sem lactose para emagrecimento',
  'emagrecimento',
  1400,
  '{"gluten_free": false, "lactose_free": true, "low_fodmap": false}'::jsonb
),
(
  'zero-lactose-1800',
  'Zero Lactose 1800 kcal',
  'Plano sem lactose para manutenção',
  'saude',
  1800,
  '{"gluten_free": false, "lactose_free": true, "low_fodmap": false}'::jsonb
),
(
  'zero-lactose-2200',
  'Zero Lactose 2200 kcal',
  'Plano sem lactose para hipertrofia',
  'hipertrofia',
  2200,
  '{"gluten_free": false, "lactose_free": true, "low_fodmap": false}'::jsonb
),

-- Template: LOW FODMAP - 1400 kcal
(
  'low-fodmap-1400',
  'Low FODMAP 1400 kcal',
  'Plano low FODMAP para emagrecimento',
  'emagrecimento',
  1400,
  '{"gluten_free": false, "lactose_free": false, "low_fodmap": true}'::jsonb
),
(
  'low-fodmap-1800',
  'Low FODMAP 1800 kcal',
  'Plano low FODMAP para manutenção',
  'saude',
  1800,
  '{"gluten_free": false, "lactose_free": false, "low_fodmap": true}'::jsonb
),

-- Template: ZERO GLÚTEN + ZERO LACTOSE - 1400 kcal
(
  'zero-gluten-lactose-1400',
  'Zero Glúten e Lactose 1400 kcal',
  'Plano sem glúten e sem lactose para emagrecimento',
  'emagrecimento',
  1400,
  '{"gluten_free": true, "lactose_free": true, "low_fodmap": false}'::jsonb
),
(
  'zero-gluten-lactose-1800',
  'Zero Glúten e Lactose 1800 kcal',
  'Plano sem glúten e sem lactose para manutenção',
  'saude',
  1800,
  '{"gluten_free": true, "lactose_free": true, "low_fodmap": false}'::jsonb
),

-- Template: ZERO GLÚTEN + ZERO LACTOSE + LOW FODMAP - 1400 kcal
(
  'zero-gluten-lactose-fodmap-1400',
  'Zero Glúten, Lactose e Low FODMAP 1400 kcal',
  'Plano completo de restrições para emagrecimento',
  'emagrecimento',
  1400,
  '{"gluten_free": true, "lactose_free": true, "low_fodmap": true}'::jsonb
),
(
  'zero-gluten-lactose-fodmap-1800',
  'Zero Glúten, Lactose e Low FODMAP 1800 kcal',
  'Plano completo de restrições para manutenção',
  'saude',
  1800,
  '{"gluten_free": true, "lactose_free": true, "low_fodmap": true}'::jsonb
)

ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  dietary_restrictions = EXCLUDED.dietary_restrictions,
  updated_at = NOW();

-- ═══════════════════════════════════════════════════════════════════════════
-- FUNÇÃO: apply_dietary_restrictions_to_template
-- Aplica restrições alimentares a um template existente
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION apply_dietary_restrictions_to_template(
  p_template_slug TEXT,
  p_avoid_gluten BOOLEAN DEFAULT false,
  p_avoid_lactose BOOLEAN DEFAULT false,
  p_avoid_high_fodmap BOOLEAN DEFAULT false
)
RETURNS JSONB AS $$
DECLARE
  v_template RECORD;
  v_result JSONB;
BEGIN
  -- Busca template
  SELECT * INTO v_template
  FROM meal_plan_templates
  WHERE slug = p_template_slug;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Template "%" não encontrado', p_template_slug;
  END IF;
  
  -- Retorna informações sobre substituições necessárias
  v_result := jsonb_build_object(
    'template_slug', p_template_slug,
    'template_title', v_template.title,
    'restrictions_applied', jsonb_build_object(
      'gluten_free', p_avoid_gluten,
      'lactose_free', p_avoid_lactose,
      'low_fodmap', p_avoid_high_fodmap
    ),
    'message', 'Use get_safe_alternatives() para cada alimento do template'
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql STABLE;

-- ═══════════════════════════════════════════════════════════════════════════
-- COMENTÁRIOS
-- ═══════════════════════════════════════════════════════════════════════════

COMMENT ON TABLE food_restrictions IS 'Restrições alimentares: glúten, lactose, FODMAP';
COMMENT ON FUNCTION get_safe_alternatives IS 'Retorna alternativas seguras baseado nas restrições do paciente';
COMMENT ON FUNCTION apply_dietary_restrictions_to_template IS 'Aplica restrições alimentares a um template';

-- ═══════════════════════════════════════════════════════════════════════════
-- EXEMPLOS DE USO
-- ═══════════════════════════════════════════════════════════════════════════

-- Buscar alternativas sem glúten para "Pão Integral":
-- SELECT get_safe_alternatives('Pão Integral', p_avoid_gluten := true);
-- Resultado: ['Pão sem Glúten', 'Tapioca', 'Batata Doce']

-- Buscar alternativas sem lactose para "Iogurte Natural":
-- SELECT get_safe_alternatives('Iogurte Natural', p_avoid_lactose := true);
-- Resultado: ['Iogurte sem Lactose', 'Iogurte de Coco']

-- Buscar alternativas low FODMAP para "Maçã":
-- SELECT get_safe_alternatives('Maçã', p_avoid_high_fodmap := true);
-- Resultado: ['Banana', 'Morango', 'Laranja']

-- Buscar alternativas SEM GLÚTEN + SEM LACTOSE + LOW FODMAP:
-- SELECT get_safe_alternatives('Pão Integral', true, false, true);
