-- 1. Create System Tenant if not exists (using a valid owner)
INSERT INTO public.tenants (id, name, slug, owner_user_id, plan_type, is_active)
VALUES (
    '00000000-0000-0000-0000-000000000000', 
    'FitJourney System', 
    'system', 
    '38b17a2b-2ac0-4df0-8d12-ec602e3ab704', -- Nutricionista Thaiane
    'professional', 
    true
)
ON CONFLICT (id) DO NOTHING;

-- 2. Grant permissions
GRANT EXECUTE ON FUNCTION public.log_audit(text, text, text, jsonb) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_user_tenant() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_user_tenant(uuid) TO authenticated, anon;
