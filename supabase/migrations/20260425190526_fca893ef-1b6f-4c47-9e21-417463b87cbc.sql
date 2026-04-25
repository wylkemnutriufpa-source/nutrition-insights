-- Cleanup meal_plan_items triggers
DROP TRIGGER IF EXISTS tr_force_day_zero_simple ON public.meal_plan_items;
DROP TRIGGER IF EXISTS auto_resolve_visual_library_item ON public.meal_plan_items;
DROP TRIGGER IF EXISTS trg_auto_visual_meal_plan_items ON public.meal_plan_items;
DROP TRIGGER IF EXISTS trg_recalculate_meal_plan_totals ON public.meal_plan_items;

-- Cleanup meal_plans triggers
DROP TRIGGER IF EXISTS audit_meal_plan_changes ON public.meal_plans;
DROP TRIGGER IF EXISTS on_plan_quality_update ON public.meal_plans;
DROP TRIGGER IF EXISTS tr_invalidate_audit_cache ON public.meal_plans;
DROP TRIGGER IF EXISTS trg_auto_publish_on_approve ON public.meal_plans;
DROP TRIGGER IF EXISTS trg_auto_resolve_onboarding_on_insert_publish ON public.meal_plans;
DROP TRIGGER IF EXISTS trg_generate_plan_milestones ON public.meal_plans;
DROP TRIGGER IF EXISTS trg_seed_milestones_on_insert ON public.meal_plans;
DROP TRIGGER IF EXISTS trg_seed_milestones_on_publish ON public.meal_plans;
DROP TRIGGER IF EXISTS trg_notify_meal_plan_change ON public.meal_plans;
DROP TRIGGER IF EXISTS trg_notify_plan_publish ON public.meal_plans;
DROP TRIGGER IF EXISTS trg_protect_protocol_on_plan_edit ON public.meal_plans;
DROP TRIGGER IF EXISTS trg_sync_shopping_list_on_publish ON public.meal_plans;

-- Final list of ACTIVE triggers:
-- meal_plan_items: sync_meal_plan_totals_trigger (calculation), trg_auto_tenant_meal_plan_items (infrastructure)
-- meal_plans: update_meal_plans_updated_at (timestamp), trg_auto_tenant_meal_plans (infrastructure)
