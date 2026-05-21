-- 🛡️ DEFENSE IN DEPTH - CAMADA 1: Database Contracts
-- Migração para adicionar constraints formais e auditoria
-- Data: 2026-05-20

-- ============================================================================
-- 1. CRIAR TABELA DE AUDITORIA
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
  record_id UUID NOT NULL,
  user_id UUID,
  old_values JSONB,
  new_values JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT
);

CREATE INDEX idx_audit_log_table_name ON audit_log(table_name);
CREATE INDEX idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at);
CREATE INDEX idx_audit_log_record_id ON audit_log(record_id);

-- ============================================================================
-- 2. ADICIONAR CONSTRAINTS EM MEAL_PLANS
-- ============================================================================

-- Garantir que meal_plans tem status válido
ALTER TABLE meal_plans 
ADD CONSTRAINT check_meal_plan_status 
CHECK (status IN ('draft', 'active', 'completed', 'archived'));

-- Garantir que meal_plans tem version >= 1
ALTER TABLE meal_plans 
ADD CONSTRAINT check_meal_plan_version 
CHECK (version >= 1);

-- Garantir que patient_id não é null
ALTER TABLE meal_plans 
ALTER COLUMN patient_id SET NOT NULL;

-- Criar índices para queries comuns
CREATE INDEX IF NOT EXISTS idx_meal_plans_patient_id ON meal_plans(patient_id);
CREATE INDEX IF NOT EXISTS idx_meal_plans_status ON meal_plans(status);
CREATE INDEX IF NOT EXISTS idx_meal_plans_created_at ON meal_plans(created_at);

-- ============================================================================
-- 3. ADICIONAR CONSTRAINTS EM MEALS
-- ============================================================================

-- Garantir que meals tem meal_plan_id válido
ALTER TABLE meals 
ADD CONSTRAINT fk_meals_meal_plan_id 
FOREIGN KEY (meal_plan_id) REFERENCES meal_plans(id) ON DELETE CASCADE;

-- Garantir que meals tem day_of_week válido (0-6)
ALTER TABLE meals 
ADD CONSTRAINT check_meal_day_of_week 
CHECK (day_of_week >= 0 AND day_of_week <= 6);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_meals_meal_plan_id ON meals(meal_plan_id);
CREATE INDEX IF NOT EXISTS idx_meals_day_of_week ON meals(day_of_week);

-- ============================================================================
-- 4. ADICIONAR CONSTRAINTS EM MEAL_ITEMS
-- ============================================================================

-- Garantir que meal_items tem meal_id válido
ALTER TABLE meal_items 
ADD CONSTRAINT fk_meal_items_meal_id 
FOREIGN KEY (meal_id) REFERENCES meals(id) ON DELETE CASCADE;

-- Garantir que clinical_mass_g está entre 5g e 1000g
ALTER TABLE meal_items 
ADD CONSTRAINT check_meal_item_mass 
CHECK (clinical_mass_g >= 5 AND clinical_mass_g <= 1000);

-- Garantir que macros não são negativos
ALTER TABLE meal_items 
ADD CONSTRAINT check_meal_item_macros 
CHECK (kcal >= 0 AND protein_g >= 0 AND carbs_g >= 0 AND fat_g >= 0);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_meal_items_meal_id ON meal_items(meal_id);

-- ============================================================================
-- 5. ADICIONAR CONSTRAINTS EM MEAL_ITEM_COMPLETIONS
-- ============================================================================

-- Garantir que completions tem status válido
ALTER TABLE meal_item_completions 
ADD CONSTRAINT check_completion_status 
CHECK (adherence_status IN ('followed', 'partial', 'not_followed'));

-- Garantir que date não é no futuro
ALTER TABLE meal_item_completions 
ADD CONSTRAINT check_completion_date 
CHECK (date <= CURRENT_DATE);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_completions_patient_id ON meal_item_completions(patient_id);
CREATE INDEX IF NOT EXISTS idx_completions_meal_plan_id ON meal_item_completions(meal_plan_id);
CREATE INDEX IF NOT EXISTS idx_completions_date ON meal_item_completions(date);

-- ============================================================================
-- 6. ADICIONAR CONSTRAINTS EM PATIENT_MEAL_SUBSTITUTIONS
-- ============================================================================

-- Garantir que substitutions tem meal_plan_id válido
ALTER TABLE patient_meal_substitutions 
ADD CONSTRAINT fk_substitutions_meal_plan_id 
FOREIGN KEY (meal_plan_id) REFERENCES meal_plans(id) ON DELETE CASCADE;

-- Garantir que substitutions tem patient_id válido
ALTER TABLE patient_meal_substitutions 
ADD CONSTRAINT fk_substitutions_patient_id 
FOREIGN KEY (patient_id) REFERENCES profiles(user_id) ON DELETE CASCADE;

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_substitutions_meal_plan_id ON patient_meal_substitutions(meal_plan_id);
CREATE INDEX IF NOT EXISTS idx_substitutions_patient_id ON patient_meal_substitutions(patient_id);

-- ============================================================================
-- 7. CRIAR FUNÇÃO DE AUDITORIA
-- ============================================================================

CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_log (
    table_name,
    operation,
    record_id,
    user_id,
    old_values,
    new_values,
    created_at
  ) VALUES (
    TG_TABLE_NAME,
    TG_OP,
    COALESCE(NEW.id, OLD.id),
    auth.uid(),
    CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW) ELSE NULL END,
    NOW()
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 8. CRIAR TRIGGERS DE AUDITORIA
-- ============================================================================

-- Auditoria em meal_plans
DROP TRIGGER IF EXISTS audit_meal_plans ON meal_plans;
CREATE TRIGGER audit_meal_plans
AFTER INSERT OR UPDATE OR DELETE ON meal_plans
FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Auditoria em meals
DROP TRIGGER IF EXISTS audit_meals ON meals;
CREATE TRIGGER audit_meals
AFTER INSERT OR UPDATE OR DELETE ON meals
FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Auditoria em meal_items
DROP TRIGGER IF EXISTS audit_meal_items ON meal_items;
CREATE TRIGGER audit_meal_items
AFTER INSERT OR UPDATE OR DELETE ON meal_items
FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Auditoria em meal_item_completions
DROP TRIGGER IF EXISTS audit_meal_item_completions ON meal_item_completions;
CREATE TRIGGER audit_meal_item_completions
AFTER INSERT OR UPDATE OR DELETE ON meal_item_completions
FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- ============================================================================
-- 9. CRIAR FUNÇÃO DE VALIDAÇÃO DE TRANSAÇÃO
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_meal_plan_integrity()
RETURNS TRIGGER AS $$
BEGIN
  -- Validar que patient_id existe
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE user_id = NEW.patient_id) THEN
    RAISE EXCEPTION 'Patient not found: %', NEW.patient_id;
  END IF;
  
  -- Validar que status é válido
  IF NEW.status NOT IN ('draft', 'active', 'completed', 'archived') THEN
    RAISE EXCEPTION 'Invalid meal plan status: %', NEW.status;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar validação em INSERT/UPDATE
DROP TRIGGER IF EXISTS validate_meal_plan_before_insert ON meal_plans;
CREATE TRIGGER validate_meal_plan_before_insert
BEFORE INSERT ON meal_plans
FOR EACH ROW EXECUTE FUNCTION validate_meal_plan_integrity();

DROP TRIGGER IF EXISTS validate_meal_plan_before_update ON meal_plans;
CREATE TRIGGER validate_meal_plan_before_update
BEFORE UPDATE ON meal_plans
FOR EACH ROW EXECUTE FUNCTION validate_meal_plan_integrity();

-- ============================================================================
-- 10. CRIAR VIEW PARA AUDITORIA
-- ============================================================================

CREATE OR REPLACE VIEW audit_log_view AS
SELECT 
  al.id,
  al.table_name,
  al.operation,
  al.record_id,
  p.full_name as user_name,
  al.old_values,
  al.new_values,
  al.created_at,
  EXTRACT(EPOCH FROM (NOW() - al.created_at)) as seconds_ago
FROM audit_log al
LEFT JOIN profiles p ON al.user_id = p.user_id
ORDER BY al.created_at DESC;

-- ============================================================================
-- 11. CRIAR FUNÇÃO DE ROLLBACK
-- ============================================================================

CREATE OR REPLACE FUNCTION rollback_to_audit_state(
  p_audit_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_audit RECORD;
BEGIN
  SELECT * INTO v_audit FROM audit_log WHERE id = p_audit_id;
  
  IF v_audit IS NULL THEN
    RAISE EXCEPTION 'Audit log not found: %', p_audit_id;
  END IF;
  
  -- Se foi DELETE, reinsert
  IF v_audit.operation = 'DELETE' THEN
    EXECUTE format('INSERT INTO %I VALUES ($1.*)', v_audit.table_name)
    USING v_audit.old_values;
  END IF;
  
  -- Se foi INSERT, delete
  IF v_audit.operation = 'INSERT' THEN
    EXECUTE format('DELETE FROM %I WHERE id = $1', v_audit.table_name)
    USING v_audit.record_id;
  END IF;
  
  -- Se foi UPDATE, restore old values
  IF v_audit.operation = 'UPDATE' THEN
    EXECUTE format('UPDATE %I SET %s WHERE id = $1', 
      v_audit.table_name,
      (SELECT string_agg(key || ' = ' || quote_literal(value), ', ')
       FROM jsonb_each_text(v_audit.old_values))
    ) USING v_audit.record_id;
  END IF;
  
  RETURN TRUE;
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Rollback failed: %', SQLERRM;
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 12. CRIAR FUNÇÃO DE VALIDAÇÃO DE INTEGRIDADE
-- ============================================================================

CREATE OR REPLACE FUNCTION check_data_integrity()
RETURNS TABLE(
  issue_type TEXT,
  table_name TEXT,
  record_id UUID,
  description TEXT
) AS $$
BEGIN
  -- Verificar meal_plans órfãs (sem paciente)
  RETURN QUERY
  SELECT 
    'ORPHAN_MEAL_PLAN'::TEXT,
    'meal_plans'::TEXT,
    mp.id,
    format('Meal plan %s has no patient', mp.id)
  FROM meal_plans mp
  WHERE NOT EXISTS (SELECT 1 FROM profiles WHERE user_id = mp.patient_id);
  
  -- Verificar meals órfãs (sem plano)
  RETURN QUERY
  SELECT 
    'ORPHAN_MEAL'::TEXT,
    'meals'::TEXT,
    m.id,
    format('Meal %s has no meal plan', m.id)
  FROM meals m
  WHERE NOT EXISTS (SELECT 1 FROM meal_plans WHERE id = m.meal_plan_id);
  
  -- Verificar meal_items órfãs (sem refeição)
  RETURN QUERY
  SELECT 
    'ORPHAN_MEAL_ITEM'::TEXT,
    'meal_items'::TEXT,
    mi.id,
    format('Meal item %s has no meal', mi.id)
  FROM meal_items mi
  WHERE NOT EXISTS (SELECT 1 FROM meals WHERE id = mi.meal_id);
  
  -- Verificar macros inválidas
  RETURN QUERY
  SELECT 
    'INVALID_MACROS'::TEXT,
    'meal_items'::TEXT,
    mi.id,
    format('Meal item %s has invalid macros: kcal=%s', mi.id, mi.kcal)
  FROM meal_items mi
  WHERE mi.kcal < 0 OR mi.protein_g < 0 OR mi.carbs_g < 0 OR mi.fat_g < 0;
  
  -- Verificar gramagens inválidas
  RETURN QUERY
  SELECT 
    'INVALID_MASS'::TEXT,
    'meal_items'::TEXT,
    mi.id,
    format('Meal item %s has invalid mass: %sg', mi.id, mi.clinical_mass_g)
  FROM meal_items mi
  WHERE mi.clinical_mass_g < 5 OR mi.clinical_mass_g > 1000;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 13. CRIAR FUNÇÃO DE LIMPEZA DE DADOS ÓRFÃOS
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_orphaned_data()
RETURNS TABLE(
  deleted_count INT,
  table_name TEXT
) AS $$
DECLARE
  v_deleted_meals INT;
  v_deleted_items INT;
  v_deleted_completions INT;
BEGIN
  -- Deletar meals órfãs
  DELETE FROM meals WHERE meal_plan_id NOT IN (SELECT id FROM meal_plans);
  GET DIAGNOSTICS v_deleted_meals = ROW_COUNT;
  
  -- Deletar meal_items órfãs
  DELETE FROM meal_items WHERE meal_id NOT IN (SELECT id FROM meals);
  GET DIAGNOSTICS v_deleted_items = ROW_COUNT;
  
  -- Deletar completions órfãs
  DELETE FROM meal_item_completions 
  WHERE meal_plan_item_id NOT IN (SELECT id FROM meal_items);
  GET DIAGNOSTICS v_deleted_completions = ROW_COUNT;
  
  RETURN QUERY
  SELECT v_deleted_meals, 'meals'::TEXT
  UNION ALL
  SELECT v_deleted_items, 'meal_items'::TEXT
  UNION ALL
  SELECT v_deleted_completions, 'meal_item_completions'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 14. CRIAR FUNÇÃO DE RELATÓRIO DE SAÚDE
-- ============================================================================

CREATE OR REPLACE FUNCTION health_check()
RETURNS TABLE(
  check_name TEXT,
  status TEXT,
  details TEXT
) AS $$
BEGIN
  -- Verificar integridade referencial
  RETURN QUERY
  SELECT 
    'Referential Integrity'::TEXT,
    CASE WHEN COUNT(*) = 0 THEN 'OK'::TEXT ELSE 'FAILED'::TEXT END,
    format('%s issues found', COUNT(*))
  FROM (SELECT * FROM check_data_integrity()) AS issues;
  
  -- Verificar tabelas vazias
  RETURN QUERY
  SELECT 
    'Empty Tables'::TEXT,
    'OK'::TEXT,
    format('meal_plans: %s, meals: %s, meal_items: %s',
      (SELECT COUNT(*) FROM meal_plans),
      (SELECT COUNT(*) FROM meals),
      (SELECT COUNT(*) FROM meal_items)
    );
  
  -- Verificar auditoria
  RETURN QUERY
  SELECT 
    'Audit Log'::TEXT,
    'OK'::TEXT,
    format('%s records, last: %s',
      (SELECT COUNT(*) FROM audit_log),
      (SELECT TO_CHAR(MAX(created_at), 'YYYY-MM-DD HH24:MI:SS') FROM audit_log)
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 15. EXECUTAR HEALTH CHECK INICIAL
-- ============================================================================

-- Verificar integridade dos dados existentes
SELECT * FROM check_data_integrity() LIMIT 10;

-- Executar health check
SELECT * FROM health_check();

-- ============================================================================
-- FIM DA MIGRAÇÃO
-- ============================================================================
-- 
-- Resumo do que foi implementado:
-- ✅ Tabela de auditoria com triggers
-- ✅ Constraints formais em todas as tabelas críticas
-- ✅ Foreign keys com ON DELETE CASCADE
-- ✅ Validação de integridade referencial
-- ✅ Função de rollback para recuperação
-- ✅ Função de limpeza de dados órfãos
-- ✅ Health check para monitoramento
--
-- Próximos passos:
-- 1. Executar health_check() regularmente
-- 2. Monitorar audit_log para operações suspeitas
-- 3. Usar rollback_to_audit_state() para recuperação de erros
-- 4. Executar cleanup_orphaned_data() periodicamente
