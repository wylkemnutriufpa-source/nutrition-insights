
-- Temporarily disable blocking triggers to fix invalid data
ALTER TABLE meal_plans DISABLE TRIGGER trg_protect_approved_meal_plans;
ALTER TABLE meal_plans DISABLE TRIGGER trg_validate_meal_plan_status;

-- Fix published plan with 0 items
UPDATE meal_plans 
SET plan_status = 'draft', is_active = false, updated_at = now()
WHERE id = '9b24cd97-04cf-4764-8d66-fab9d0091612';

-- Fix approved plan with 0 items  
UPDATE meal_plans
SET plan_status = 'draft', is_active = false, updated_at = now()
WHERE id = '4776f122-a343-420f-9ba8-5fbde5a97388'
  AND NOT EXISTS (SELECT 1 FROM meal_plan_items WHERE meal_plan_id = '4776f122-a343-420f-9ba8-5fbde5a97388');

-- Re-enable triggers
ALTER TABLE meal_plans ENABLE TRIGGER trg_protect_approved_meal_plans;
ALTER TABLE meal_plans ENABLE TRIGGER trg_validate_meal_plan_status;
