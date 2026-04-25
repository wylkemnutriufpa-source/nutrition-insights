-- ════════════════════════════════════════════════════════════════════
-- MODO SIMPLES EMERGENCIAL — DESABILITAR BLOQUEIOS E AUTO-MUTAÇÕES
-- ════════════════════════════════════════════════════════════════════

-- 1. DESABILITAR TRIGGERS DE VALIDAÇÃO CLÍNICA (meal_plan_items)
ALTER TABLE public.meal_plan_items DISABLE TRIGGER tr_validate_meal_image;
ALTER TABLE public.meal_plan_items DISABLE TRIGGER tr_validate_meal_item;
ALTER TABLE public.meal_plan_items DISABLE TRIGGER trg_enforce_macro_constancy;
ALTER TABLE public.meal_plan_items DISABLE TRIGGER trg_validate_meal_plan_item_integrity;
ALTER TABLE public.meal_plan_items DISABLE TRIGGER zzz_protect_macros_before;

-- 2. DESABILITAR TRIGGERS DE PROTEÇÃO DE IMUTABILIDADE (permite editar planos publicados)
ALTER TABLE public.meal_plan_items DISABLE TRIGGER trg_guard_published_plan_items_immutable;

-- 3. DESABILITAR TRIGGERS DE RECÁLCULO AUTOMÁTICO (não recalcula após edição)
ALTER TABLE public.meal_plan_items DISABLE TRIGGER sync_meal_plan_totals_trigger;
ALTER TABLE public.meal_plan_items DISABLE TRIGGER trg_recalculate_meal_plan_totals;

-- 4. DESABILITAR TRIGGERS DE BLOQUEIO DE PUBLICAÇÃO (meal_plans)
ALTER TABLE public.meal_plans DISABLE TRIGGER tr_block_invalid_publication;
ALTER TABLE public.meal_plans DISABLE TRIGGER trg_assert_publication_contract;
ALTER TABLE public.meal_plans DISABLE TRIGGER trg_guard_plan_publish_requires_items;
ALTER TABLE public.meal_plans DISABLE TRIGGER trg_guard_plan_status_consistency;
ALTER TABLE public.meal_plans DISABLE TRIGGER trg_validate_meal_plan_status;

-- 5. DESABILITAR TRIGGERS DE PROTEÇÃO DE PLANOS APROVADOS (permite editar/excluir)
ALTER TABLE public.meal_plans DISABLE TRIGGER trg_protect_approved_meal_plans;
ALTER TABLE public.meal_plans DISABLE TRIGGER trg_protect_protocol_on_plan_edit;

-- 6. DESABILITAR TRIGGERS DE AUTO-PUBLICAÇÃO E AUTO-PROCESSAMENTO
ALTER TABLE public.meal_plans DISABLE TRIGGER trg_auto_publish_on_approve;
ALTER TABLE public.meal_plans DISABLE TRIGGER trg_ensure_meal_candidates;

-- 7. MANTER TRIGGERS ESSENCIAIS:
--    ✅ tr_force_day_zero_simple (modelo single-day)
--    ✅ trg_auto_tenant_meal_plan_items (multi-tenancy)
--    ✅ trg_auto_visual_meal_plan_items (auto-link à biblioteca visual)
--    ✅ trg_auto_tenant_meal_plans (multi-tenancy)
--    ✅ trg_guard_plan_nutritionist_binding (segurança: vincula ao nutri correto)
--    ✅ update_meal_plans_updated_at (timestamp)
--    ✅ audit_meal_plan_changes (auditoria - apenas log, não bloqueia)
--    ✅ tr_invalidate_audit_cache (cache - não bloqueia)
--    ✅ trg_notify_meal_plan_change / trg_notify_plan_publish (notificações)
--    ✅ trg_sync_shopping_list_on_publish (lista de compras)
--    ✅ trg_seed_milestones_on_insert / trg_seed_milestones_on_publish / trg_generate_plan_milestones (milestones)
--    ✅ trg_auto_resolve_onboarding_on_insert_publish (resolve onboarding)
--    ✅ on_plan_quality_update (qualidade)