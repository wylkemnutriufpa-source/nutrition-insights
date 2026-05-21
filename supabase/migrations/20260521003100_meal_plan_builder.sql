-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- MEAL PLAN BUILDER - MONTAGEM RÁPIDA DE PLANOS DO ZERO
-- Interface tipo Excel: clica, adiciona, sistema calcula tudo em tempo real
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- ═══════════════════════════════════════════════════════════════════════════
-- TABELA: meal_plan_drafts
-- Planos em construção (rascunhos) antes de serem finalizados
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS meal_plan_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nutritionist_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- METADADOS DO PLANO
  plan_name TEXT NOT NULL DEFAULT 'Novo Plano',
  objective TEXT, -- "emagrecimento", "hipertrofia", "saude", etc
  target_kcal DECIMAL(10,2),
  
  -- REFEIÇÕES DO PLANO (array de dias)
  days JSONB DEFAULT '[]'::jsonb,
  -- Estrutura:
  -- [
  --   {
  --     "day": "monday",
  --     "meals": [
  --       {
  --         "meal_type": "cafe",
  --         "time": "08:00",
  --         "foods": [
  --           {"food_name": "Ovo", "mass_g": 150, "units": 3, "kcal": 219, "protein_g": 18.9, ...},
  --           {"food_name": "Pão Integral", "mass_g": 100, "units": 2, "kcal": 240, ...}
  --         ]
  --       }
  --     ]
  --   }
  -- ]
  
  -- TOTAIS CALCULADOS (atualizados em tempo real)
  total_kcal_per_day DECIMAL(10,2) DEFAULT 0,
  total_protein_g_per_day DECIMAL(10,2) DEFAULT 0,
  total_carbs_g_per_day DECIMAL(10,2) DEFAULT 0,
  total_fat_g_per_day DECIMAL(10,2) DEFAULT 0,
  
  -- STATUS
  status TEXT DEFAULT 'draft', -- "draft", "finalized", "sent"
  
  -- TIMESTAMPS
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_meal_plan_drafts_nutritionist ON meal_plan_drafts(nutritionist_id);
CREATE INDEX idx_meal_plan_drafts_patient ON meal_plan_drafts(patient_id);
CREATE INDEX idx_meal_plan_drafts_status ON meal_plan_drafts(status);

-- ═══════════════════════════════════════════════════════════════════════════
-- FUNÇÃO: add_food_to_meal
-- Adiciona alimento a uma refeição e RECALCULA TUDO automaticamente
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION add_food_to_meal(
  p_draft_id UUID,
  p_day TEXT, -- "monday", "tuesday", etc
  p_meal_type TEXT, -- "cafe", "almoco", "jantar", etc
  p_food_name TEXT,
  p_mass_g DECIMAL
)
RETURNS JSONB AS $$
DECLARE
  v_nutrition RECORD;
  v_days JSONB;
  v_day_index INT;
  v_meal_index INT;
  v_new_food JSONB;
  v_total_kcal DECIMAL := 0;
  v_total_protein DECIMAL := 0;
  v_total_carbs DECIMAL := 0;
  v_total_fat DECIMAL := 0;
BEGIN
  -- Calcula nutrição proporcional
  SELECT * INTO v_nutrition
  FROM calculate_nutrition_proportional(p_food_name, p_mass_g);
  
  -- Monta objeto do alimento
  v_new_food := jsonb_build_object(
    'food_name', p_food_name,
    'mass_g', v_nutrition.mass_g,
    'units', v_nutrition.units,
    'unit_name', v_nutrition.unit_name,
    'kcal', v_nutrition.kcal,
    'protein_g', v_nutrition.protein_g,
    'carbs_g', v_nutrition.carbs_g,
    'fat_g', v_nutrition.fat_g,
    'kcal_from_protein', v_nutrition.kcal_from_protein,
    'kcal_from_carbs', v_nutrition.kcal_from_carbs,
    'kcal_from_fat', v_nutrition.kcal_from_fat
  );
  
  -- Busca dias atuais
  SELECT days INTO v_days FROM meal_plan_drafts WHERE id = p_draft_id;
  
  -- Se não existe o dia, cria
  v_day_index := (
    SELECT idx - 1
    FROM jsonb_array_elements(v_days) WITH ORDINALITY arr(elem, idx)
    WHERE elem->>'day' = p_day
  );
  
  IF v_day_index IS NULL THEN
    v_days := v_days || jsonb_build_object(
      'day', p_day,
      'meals', jsonb_build_array()
    );
    v_day_index := jsonb_array_length(v_days) - 1;
  END IF;
  
  -- Se não existe a refeição, cria
  v_meal_index := (
    SELECT idx - 1
    FROM jsonb_array_elements(v_days->v_day_index->'meals') WITH ORDINALITY arr(elem, idx)
    WHERE elem->>'meal_type' = p_meal_type
  );
  
  IF v_meal_index IS NULL THEN
    v_days := jsonb_set(
      v_days,
      ARRAY[v_day_index::text, 'meals'],
      (v_days->v_day_index->'meals') || jsonb_build_object(
        'meal_type', p_meal_type,
        'time', CASE p_meal_type
          WHEN 'cafe' THEN '08:00'
          WHEN 'lanche_manha' THEN '10:00'
          WHEN 'almoco' THEN '12:30'
          WHEN 'lanche_tarde' THEN '16:00'
          WHEN 'jantar' THEN '19:30'
          ELSE '12:00'
        END,
        'foods', jsonb_build_array()
      )
    );
    v_meal_index := jsonb_array_length(v_days->v_day_index->'meals') - 1;
  END IF;
  
  -- Adiciona alimento à refeição
  v_days := jsonb_set(
    v_days,
    ARRAY[v_day_index::text, 'meals', v_meal_index::text, 'foods'],
    (v_days->v_day_index->'meals'->v_meal_index->'foods') || v_new_food
  );
  
  -- RECALCULA TOTAIS DO DIA
  SELECT
    SUM((food->>'kcal')::DECIMAL),
    SUM((food->>'protein_g')::DECIMAL),
    SUM((food->>'carbs_g')::DECIMAL),
    SUM((food->>'fat_g')::DECIMAL)
  INTO v_total_kcal, v_total_protein, v_total_carbs, v_total_fat
  FROM jsonb_array_elements(v_days->v_day_index->'meals') AS meal,
       jsonb_array_elements(meal->'foods') AS food;
  
  -- Atualiza banco
  UPDATE meal_plan_drafts
  SET
    days = v_days,
    total_kcal_per_day = v_total_kcal,
    total_protein_g_per_day = v_total_protein,
    total_carbs_g_per_day = v_total_carbs,
    total_fat_g_per_day = v_total_fat,
    updated_at = NOW()
  WHERE id = p_draft_id;
  
  -- Retorna totais atualizados
  RETURN jsonb_build_object(
    'success', true,
    'total_kcal', v_total_kcal,
    'total_protein_g', v_total_protein,
    'total_carbs_g', v_total_carbs,
    'total_fat_g', v_total_fat,
    'food_added', v_new_food
  );
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════════════════════
-- FUNÇÃO: update_food_mass
-- Atualiza massa de um alimento e RECALCULA TUDO automaticamente
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_food_mass(
  p_draft_id UUID,
  p_day TEXT,
  p_meal_type TEXT,
  p_food_index INT,
  p_new_mass_g DECIMAL
)
RETURNS JSONB AS $$
DECLARE
  v_days JSONB;
  v_day_index INT;
  v_meal_index INT;
  v_food_name TEXT;
  v_nutrition RECORD;
  v_updated_food JSONB;
  v_total_kcal DECIMAL := 0;
  v_total_protein DECIMAL := 0;
  v_total_carbs DECIMAL := 0;
  v_total_fat DECIMAL := 0;
BEGIN
  -- Busca dias atuais
  SELECT days INTO v_days FROM meal_plan_drafts WHERE id = p_draft_id;
  
  -- Encontra índices
  v_day_index := (
    SELECT idx - 1
    FROM jsonb_array_elements(v_days) WITH ORDINALITY arr(elem, idx)
    WHERE elem->>'day' = p_day
  );
  
  v_meal_index := (
    SELECT idx - 1
    FROM jsonb_array_elements(v_days->v_day_index->'meals') WITH ORDINALITY arr(elem, idx)
    WHERE elem->>'meal_type' = p_meal_type
  );
  
  -- Pega nome do alimento
  v_food_name := v_days->v_day_index->'meals'->v_meal_index->'foods'->p_food_index->>'food_name';
  
  -- Recalcula nutrição
  SELECT * INTO v_nutrition
  FROM calculate_nutrition_proportional(v_food_name, p_new_mass_g);
  
  -- Atualiza alimento
  v_updated_food := jsonb_build_object(
    'food_name', v_food_name,
    'mass_g', v_nutrition.mass_g,
    'units', v_nutrition.units,
    'unit_name', v_nutrition.unit_name,
    'kcal', v_nutrition.kcal,
    'protein_g', v_nutrition.protein_g,
    'carbs_g', v_nutrition.carbs_g,
    'fat_g', v_nutrition.fat_g,
    'kcal_from_protein', v_nutrition.kcal_from_protein,
    'kcal_from_carbs', v_nutrition.kcal_from_carbs,
    'kcal_from_fat', v_nutrition.kcal_from_fat
  );
  
  v_days := jsonb_set(
    v_days,
    ARRAY[v_day_index::text, 'meals', v_meal_index::text, 'foods', p_food_index::text],
    v_updated_food
  );
  
  -- RECALCULA TOTAIS DO DIA
  SELECT
    SUM((food->>'kcal')::DECIMAL),
    SUM((food->>'protein_g')::DECIMAL),
    SUM((food->>'carbs_g')::DECIMAL),
    SUM((food->>'fat_g')::DECIMAL)
  INTO v_total_kcal, v_total_protein, v_total_carbs, v_total_fat
  FROM jsonb_array_elements(v_days->v_day_index->'meals') AS meal,
       jsonb_array_elements(meal->'foods') AS food;
  
  -- Atualiza banco
  UPDATE meal_plan_drafts
  SET
    days = v_days,
    total_kcal_per_day = v_total_kcal,
    total_protein_g_per_day = v_total_protein,
    total_carbs_g_per_day = v_total_carbs,
    total_fat_g_per_day = v_total_fat,
    updated_at = NOW()
  WHERE id = p_draft_id;
  
  -- Retorna totais atualizados
  RETURN jsonb_build_object(
    'success', true,
    'total_kcal', v_total_kcal,
    'total_protein_g', v_total_protein,
    'total_carbs_g', v_total_carbs,
    'total_fat_g', v_total_fat,
    'food_updated', v_updated_food
  );
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════════════════════
-- RLS (Row Level Security)
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE meal_plan_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Nutricionistas podem gerenciar seus rascunhos"
  ON meal_plan_drafts
  FOR ALL
  USING (
    auth.uid() = nutritionist_id
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'nutritionist'
    )
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- COMENTÁRIOS
-- ═══════════════════════════════════════════════════════════════════════════

COMMENT ON TABLE meal_plan_drafts IS 'Rascunhos de planos alimentares com cálculo em tempo real';
COMMENT ON FUNCTION add_food_to_meal IS 'Adiciona alimento e recalcula totais automaticamente';
COMMENT ON FUNCTION update_food_mass IS 'Atualiza massa do alimento e recalcula tudo (tipo Excel)';
