-- ============================================================================
-- RESET LÓGICO FITJOURNEY — REMOÇÃO DE TODAS AS TRAVAS BLOQUEADORAS
-- ============================================================================
-- Princípio: o sistema apenas persiste. Não decide, não bloqueia, não corrige.
-- Mantemos apenas: sync de totais, auto-tenant, audit, notify, recalc.
-- Removemos: todos os triggers/functions que fazem RAISE EXCEPTION.
-- ============================================================================

-- 1) Triggers de validação/bloqueio em meal_plan_items
DROP TRIGGER IF EXISTS tr_validate_meal_image ON public.meal_plan_items;
DROP TRIGGER IF EXISTS tr_validate_meal_item ON public.meal_plan_items;
DROP TRIGGER IF EXISTS trg_enforce_macro_constancy ON public.meal_plan_items;
DROP TRIGGER IF EXISTS trg_guard_published_plan_items_immutable ON public.meal_plan_items;
DROP TRIGGER IF EXISTS trg_validate_meal_plan_item_integrity ON public.meal_plan_items;
DROP TRIGGER IF EXISTS zzz_protect_macros_before ON public.meal_plan_items;

-- 2) Triggers de validação/bloqueio em meal_plans
DROP TRIGGER IF EXISTS tr_block_invalid_publication ON public.meal_plans;
DROP TRIGGER IF EXISTS trg_assert_publication_contract ON public.meal_plans;
DROP TRIGGER IF EXISTS trg_guard_plan_nutritionist_binding ON public.meal_plans;
DROP TRIGGER IF EXISTS trg_guard_plan_publish_requires_items ON public.meal_plans;
DROP TRIGGER IF EXISTS trg_guard_plan_status_consistency ON public.meal_plans;
DROP TRIGGER IF EXISTS trg_validate_meal_plan_status ON public.meal_plans;
DROP TRIGGER IF EXISTS trg_protect_approved_meal_plans ON public.meal_plans;
DROP TRIGGER IF EXISTS trg_ensure_meal_candidates ON public.meal_plans;

-- 3) Funções bloqueadoras (com CASCADE para limpar dependências)
DROP FUNCTION IF EXISTS public.fn_validate_meal_image() CASCADE;
DROP FUNCTION IF EXISTS public.fn_validate_meal_item() CASCADE;
DROP FUNCTION IF EXISTS public.fn_enforce_macro_constancy() CASCADE;
DROP FUNCTION IF EXISTS public.fn_guard_published_plan_items_immutable() CASCADE;
DROP FUNCTION IF EXISTS public.fn_validate_meal_plan_item_integrity() CASCADE;
DROP FUNCTION IF EXISTS public.fn_protect_macros_before() CASCADE;
DROP FUNCTION IF EXISTS public.fn_block_invalid_publication() CASCADE;
DROP FUNCTION IF EXISTS public.fn_assert_publication_contract() CASCADE;
DROP FUNCTION IF EXISTS public.fn_guard_plan_nutritionist_binding() CASCADE;
DROP FUNCTION IF EXISTS public.fn_guard_plan_publish_requires_items() CASCADE;
DROP FUNCTION IF EXISTS public.fn_guard_plan_status_consistency() CASCADE;
DROP FUNCTION IF EXISTS public.fn_validate_meal_plan_status() CASCADE;
DROP FUNCTION IF EXISTS public.fn_protect_approved_meal_plans() CASCADE;
DROP FUNCTION IF EXISTS public.fn_ensure_meal_candidates() CASCADE;

-- 4) Check constraints rígidas (mantém apenas FKs e PKs)
ALTER TABLE public.meal_plans DROP CONSTRAINT IF EXISTS meal_plans_plan_type_check;
ALTER TABLE public.meal_plan_items DROP CONSTRAINT IF EXISTS meal_plan_items_target_percentage_check;
-- day_of_week_check (0..6) mantido pois é um range físico válido