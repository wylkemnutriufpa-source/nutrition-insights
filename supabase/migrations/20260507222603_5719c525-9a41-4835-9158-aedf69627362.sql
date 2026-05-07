-- Deleting tables
DROP TABLE IF EXISTS public.timeline_reactions CASCADE;
DROP TABLE IF EXISTS public.ranking_snapshots CASCADE;
DROP TABLE IF EXISTS public.experience_mode_audit_log CASCADE;
DROP TABLE IF EXISTS public.whatsapp_inbound_messages CASCADE;
DROP TABLE IF EXISTS public.user_challenges CASCADE;
DROP TABLE IF EXISTS public.user_achievements CASCADE;
DROP TABLE IF EXISTS public.player_stats CASCADE;
DROP TABLE IF EXISTS public.feature_marketing_assets CASCADE;
DROP TABLE IF EXISTS public.engagement_signals CASCADE;

-- Deleting functions
DROP FUNCTION IF EXISTS public.activate_meal_plan_ai_guarded() CASCADE;
DROP FUNCTION IF EXISTS public.auto_resolve_visual_library() CASCADE;
DROP FUNCTION IF EXISTS public.reset_all_ranking_points() CASCADE;
DROP FUNCTION IF EXISTS public.award_points() CASCADE;
DROP FUNCTION IF EXISTS public.fn_auto_tenant_meal_plan_items() CASCADE;