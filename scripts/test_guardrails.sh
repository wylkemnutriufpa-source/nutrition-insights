#!/bin/bash
set -e

echo "Starting Trigger Guardrail Integration Tests..."

# Get dummy IDs
USER_ID="67f47696-a778-4ada-9ff9-9615fb7a7c48"
PATIENT_ID="b4696594-8e41-4521-a23b-e9e77c6538b4"
TENANT_ID="20081963-8db9-4a6c-8181-6a820b86e12f"

if [ -z "$USER_ID" ] || [ -z "$TENANT_ID" ]; then
  echo "Error: Could not find user or tenant for testing."
  exit 1
fi

# 1. Insert a dummy meal plan
PLAN_ID=$(psql -t -c "INSERT INTO meal_plans (nutritionist_id, patient_id, title, start_date, tenant_id, is_active) 
VALUES ('$USER_ID', '$PATIENT_ID', 'Test Guardrail Plan', '2024-01-01', '$TENANT_ID', false) 
RETURNING id" | grep -E '[0-9a-f]{8}-' | head -n1 | xargs)

echo "Created test meal plan: $PLAN_ID"

# 2. Insert a meal plan item
ITEM_ID=$(psql -t -c "INSERT INTO meal_plan_items (meal_plan_id, meal_type, title, calories_target, protein_target, carbs_target, fat_target, tenant_id) 
VALUES ('$PLAN_ID', 'lunch', 'Test Guardrail Item', 500, 20, 50, 10, '$TENANT_ID') 
RETURNING id" | grep -E '[0-9a-f]{8}-' | head -n1 | xargs)

echo "Created test item: $ITEM_ID"

echo "Running legitimate update..."
psql -c "UPDATE meal_plan_items SET calories_target = 600 WHERE id = '$ITEM_ID'"

# 4. Check if audit logs exist
LOG_COUNT=$(psql -t -c "SELECT count(*) FROM trigger_audit_logs WHERE record_id = '$ITEM_ID'" | grep -E '[0-9]+' | xargs)
if [ "$LOG_COUNT" -gt 0 ]; then
  echo "✅ SUCCESS: Audit logs were recorded ($LOG_COUNT entries)."
else
  echo "❌ FAILURE: No audit logs found for the test record."
  exit 1
fi

# Clean up
psql -c "DELETE FROM meal_plans WHERE id = '$PLAN_ID';"

echo "All Trigger Guardrail tests passed!"
