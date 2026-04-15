
-- Bypass ALL triggers for data cleanup
SET session_replication_role = 'replica';

-- FIX 1: Clean "undefinedg" from descriptions  
UPDATE meal_plan_items
SET description = REGEXP_REPLACE(description, ' — undefinedg', '', 'g')
WHERE description LIKE '%undefinedg%';

-- FIX 2: Fill missing tenant_id for orphan items
UPDATE meal_plan_items mpi
SET tenant_id = mp.tenant_id
FROM meal_plans mp
WHERE mpi.meal_plan_id = mp.id
  AND mpi.tenant_id IS NULL
  AND mp.tenant_id IS NOT NULL;

-- Restore normal trigger behavior
SET session_replication_role = 'origin';

-- FIX 3: Remove duplicate trigger
DROP TRIGGER IF EXISTS trg_guard_plan_advance_requires_items ON meal_plans;

-- FIX 4: Clean empty draft shells
DELETE FROM meal_plans
WHERE id IN ('2cad7ab0-2d2d-42a5-909a-8526df9ad8cf', '6abbd77e-ed42-404b-a31f-6dc31f4e3f74')
  AND plan_status = 'draft'
  AND NOT EXISTS (SELECT 1 FROM meal_plan_items WHERE meal_plan_id = meal_plans.id);
