-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- SISTEMA DE CÓPIA DE TEMPLATE PARA PACIENTE
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- ═══════════════════════════════════════════════════════════════════════════
-- TABELA: Planos de refeição dos pacientes
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS patient_meal_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  nutritionist_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  template_id UUID REFERENCES meal_plan_templates(id) ON DELETE SET NULL,
  
  -- Dados do plano
  name TEXT NOT NULL,
  description TEXT,
  meals JSONB NOT NULL,
  
  -- Metadados
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  
  -- Observações
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_patient_meal_plans_patient ON patient_meal_plans(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_meal_plans_nutritionist ON patient_meal_plans(nutritionist_id);
CREATE INDEX IF NOT EXISTS idx_patient_meal_plans_template ON patient_meal_plans(template_id);
CREATE INDEX IF NOT EXISTS idx_patient_meal_plans_status ON patient_meal_plans(status);
CREATE INDEX IF NOT EXISTS idx_patient_meal_plans_dates ON patient_meal_plans(start_date, end_date);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_patient_meal_plans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_patient_meal_plans_updated_at
  BEFORE UPDATE ON patient_meal_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_patient_meal_plans_updated_at();

-- ═══════════════════════════════════════════════════════════════════════════
-- FUNÇÃO: Copiar template para paciente
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION copy_template_to_patient(
  p_template_id UUID,
  p_patient_id UUID,
  p_nutritionist_id UUID,
  p_start_date DATE DEFAULT CURRENT_DATE,
  p_custom_name TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_plan_id UUID;
  v_template_name TEXT;
  v_template_description TEXT;
  v_template_meals JSONB;
BEGIN
  -- Buscar dados do template
  SELECT name, description, meals
  INTO v_template_name, v_template_description, v_template_meals
  FROM meal_plan_templates
  WHERE id = p_template_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Template não encontrado: %', p_template_id;
  END IF;

  -- Criar plano para o paciente
  INSERT INTO patient_meal_plans (
    patient_id,
    nutritionist_id,
    template_id,
    name,
    description,
    meals,
    start_date,
    notes,
    status
  ) VALUES (
    p_patient_id,
    p_nutritionist_id,
    p_template_id,
    COALESCE(p_custom_name, v_template_name || ' - ' || p_patient_id::TEXT),
    v_template_description,
    v_template_meals,
    p_start_date,
    p_notes,
    'active'
  )
  RETURNING id INTO v_plan_id;

  RETURN v_plan_id;
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════════════════════
-- FUNÇÃO: Atualizar refeição do plano do paciente
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION update_patient_meal(
  p_plan_id UUID,
  p_day_index INTEGER,
  p_meal_index INTEGER,
  p_meal_data JSONB
)
RETURNS BOOLEAN AS $$
DECLARE
  v_meals JSONB;
  v_day JSONB;
  v_day_meals JSONB;
BEGIN
  -- Buscar meals atuais
  SELECT meals INTO v_meals
  FROM patient_meal_plans
  WHERE id = p_plan_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Plano não encontrado: %', p_plan_id;
  END IF;

  -- Obter o dia específico
  v_day := v_meals->p_day_index;
  v_day_meals := v_day->'meals';

  -- Atualizar a refeição específica
  v_day_meals := jsonb_set(
    v_day_meals,
    ARRAY[p_meal_index::TEXT],
    p_meal_data
  );

  -- Atualizar o dia
  v_day := jsonb_set(v_day, '{meals}', v_day_meals);

  -- Atualizar o array de meals
  v_meals := jsonb_set(
    v_meals,
    ARRAY[p_day_index::TEXT],
    v_day
  );

  -- Salvar no banco
  UPDATE patient_meal_plans
  SET meals = v_meals
  WHERE id = p_plan_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════════════════════
-- FUNÇÃO: Adicionar alimento a uma refeição do paciente
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION add_food_to_patient_meal(
  p_plan_id UUID,
  p_day_index INTEGER,
  p_meal_index INTEGER,
  p_food_name TEXT,
  p_food_qty TEXT,
  p_food_kcal NUMERIC
)
RETURNS BOOLEAN AS $$
DECLARE
  v_meals JSONB;
  v_day JSONB;
  v_meal JSONB;
  v_foods JSONB;
  v_new_food JSONB;
BEGIN
  -- Buscar meals atuais
  SELECT meals INTO v_meals
  FROM patient_meal_plans
  WHERE id = p_plan_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Plano não encontrado: %', p_plan_id;
  END IF;

  -- Obter o dia e a refeição
  v_day := v_meals->p_day_index;
  v_meal := v_day->'meals'->p_meal_index;
  v_foods := v_meal->'foods';

  -- Criar novo alimento
  v_new_food := jsonb_build_object(
    'name', p_food_name,
    'qty', p_food_qty,
    'kcal', p_food_kcal
  );

  -- Adicionar ao array de foods
  v_foods := v_foods || v_new_food;

  -- Atualizar a refeição
  v_meal := jsonb_set(v_meal, '{foods}', v_foods);

  -- Atualizar o dia
  v_day := jsonb_set(
    v_day,
    ARRAY['meals', p_meal_index::TEXT],
    v_meal
  );

  -- Atualizar o array de meals
  v_meals := jsonb_set(
    v_meals,
    ARRAY[p_day_index::TEXT],
    v_day
  );

  -- Salvar no banco
  UPDATE patient_meal_plans
  SET meals = v_meals
  WHERE id = p_plan_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════════════════════
-- FUNÇÃO: Obter planos ativos do paciente
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION get_patient_active_plans(p_patient_id UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  start_date DATE,
  end_date DATE,
  days_active INTEGER,
  template_name TEXT,
  nutritionist_name TEXT,
  total_days INTEGER,
  total_meals INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    p.description,
    p.start_date,
    p.end_date,
    (CURRENT_DATE - p.start_date)::INTEGER as days_active,
    t.name as template_name,
    n.full_name as nutritionist_name,
    jsonb_array_length(p.meals) as total_days,
    (
      SELECT SUM(jsonb_array_length(day->'meals'))
      FROM jsonb_array_elements(p.meals) as day
    )::INTEGER as total_meals
  FROM patient_meal_plans p
  LEFT JOIN meal_plan_templates t ON p.template_id = t.id
  LEFT JOIN profiles n ON p.nutritionist_id = n.id
  WHERE 
    p.patient_id = p_patient_id
    AND p.status = 'active'
  ORDER BY p.start_date DESC;
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════════════════════
-- RLS (Row Level Security)
-- ═══════════════════════════════════════════════════════════════════════════
ALTER TABLE patient_meal_plans ENABLE ROW LEVEL SECURITY;

-- Pacientes podem ver apenas seus próprios planos
CREATE POLICY "Pacientes podem ver seus planos"
  ON patient_meal_plans FOR SELECT
  USING (patient_id = auth.uid());

-- Nutricionistas podem ver planos dos seus pacientes
CREATE POLICY "Nutricionistas podem ver planos dos pacientes"
  ON patient_meal_plans FOR SELECT
  USING (nutritionist_id = auth.uid());

-- Nutricionistas podem criar planos para pacientes
CREATE POLICY "Nutricionistas podem criar planos"
  ON patient_meal_plans FOR INSERT
  WITH CHECK (nutritionist_id = auth.uid());

-- Nutricionistas podem atualizar planos dos seus pacientes
CREATE POLICY "Nutricionistas podem atualizar planos"
  ON patient_meal_plans FOR UPDATE
  USING (nutritionist_id = auth.uid());

-- Nutricionistas podem deletar planos dos seus pacientes
CREATE POLICY "Nutricionistas podem deletar planos"
  ON patient_meal_plans FOR DELETE
  USING (nutritionist_id = auth.uid());

-- ═══════════════════════════════════════════════════════════════════════════
-- COMENTÁRIOS
-- ═══════════════════════════════════════════════════════════════════════════
COMMENT ON TABLE patient_meal_plans IS 'Planos de refeição personalizados para pacientes';
COMMENT ON FUNCTION copy_template_to_patient IS 'Copia um template para um paciente específico';
COMMENT ON FUNCTION update_patient_meal IS 'Atualiza uma refeição específica do plano do paciente';
COMMENT ON FUNCTION add_food_to_patient_meal IS 'Adiciona um alimento a uma refeição do paciente';
COMMENT ON FUNCTION get_patient_active_plans IS 'Retorna planos ativos de um paciente';
