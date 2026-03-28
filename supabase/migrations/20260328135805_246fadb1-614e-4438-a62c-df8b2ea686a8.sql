
-- =============================================
-- FASE 1: Multi-Tenant Foundation (Zero Downtime)
-- =============================================

-- 1. Enum para tipos de plano do tenant
CREATE TYPE public.tenant_plan AS ENUM ('free', 'starter', 'professional', 'clinic', 'enterprise');

-- 2. Enum para roles dentro do tenant
CREATE TYPE public.tenant_role AS ENUM ('owner', 'admin', 'nutritionist', 'personal', 'staff', 'patient');

-- 3. Tabela principal de tenants
CREATE TABLE public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  owner_user_id UUID NOT NULL,
  plan_type public.tenant_plan NOT NULL DEFAULT 'professional',
  is_active BOOLEAN NOT NULL DEFAULT true,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Tabela de vínculo usuário <-> tenant
CREATE TABLE public.user_tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  role public.tenant_role NOT NULL DEFAULT 'patient',
  is_active BOOLEAN NOT NULL DEFAULT true,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, tenant_id)
);

-- 5. Índices para performance
CREATE INDEX idx_user_tenants_user_id ON public.user_tenants(user_id);
CREATE INDEX idx_user_tenants_tenant_id ON public.user_tenants(tenant_id);
CREATE INDEX idx_tenants_owner ON public.tenants(owner_user_id);
CREATE INDEX idx_tenants_slug ON public.tenants(slug);

-- 6. Enable RLS
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_tenants ENABLE ROW LEVEL SECURITY;

-- 7. Security definer function: check tenant membership
CREATE OR REPLACE FUNCTION public.is_tenant_member(_user_id UUID, _tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_tenants
    WHERE user_id = _user_id
      AND tenant_id = _tenant_id
      AND is_active = true
  )
$$;

-- 8. Security definer function: check tenant role
CREATE OR REPLACE FUNCTION public.has_tenant_role(_user_id UUID, _tenant_id UUID, _role public.tenant_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_tenants
    WHERE user_id = _user_id
      AND tenant_id = _tenant_id
      AND role = _role
      AND is_active = true
  )
$$;

-- 9. Function to get user's tenants
CREATE OR REPLACE FUNCTION public.get_user_tenant_ids(_user_id UUID)
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM public.user_tenants
  WHERE user_id = _user_id AND is_active = true
$$;

-- 10. RLS policies for tenants
CREATE POLICY "Users can view their own tenants"
  ON public.tenants FOR SELECT TO authenticated
  USING (public.is_tenant_member(auth.uid(), id));

CREATE POLICY "Owners can update their tenant"
  ON public.tenants FOR UPDATE TO authenticated
  USING (owner_user_id = auth.uid());

-- 11. RLS policies for user_tenants
CREATE POLICY "Users can view memberships of their tenants"
  ON public.user_tenants FOR SELECT TO authenticated
  USING (public.is_tenant_member(auth.uid(), tenant_id));

CREATE POLICY "Tenant owners/admins can manage memberships"
  ON public.user_tenants FOR INSERT TO authenticated
  WITH CHECK (
    public.has_tenant_role(auth.uid(), tenant_id, 'owner')
    OR public.has_tenant_role(auth.uid(), tenant_id, 'admin')
  );

CREATE POLICY "Tenant owners/admins can update memberships"
  ON public.user_tenants FOR UPDATE TO authenticated
  USING (
    public.has_tenant_role(auth.uid(), tenant_id, 'owner')
    OR public.has_tenant_role(auth.uid(), tenant_id, 'admin')
  );

-- 12. Seed: Create default tenant from first nutritionist found
-- This uses a DO block to safely handle the migration
DO $$
DECLARE
  _owner_id UUID;
  _tenant_id UUID;
  _rec RECORD;
BEGIN
  -- Find the primary owner (first nutritionist)
  SELECT ur.user_id INTO _owner_id
  FROM public.user_roles ur
  WHERE ur.role = 'nutritionist'
  ORDER BY (SELECT created_at FROM auth.users WHERE id = ur.user_id) ASC
  LIMIT 1;

  -- If no nutritionist, use first admin
  IF _owner_id IS NULL THEN
    SELECT ur.user_id INTO _owner_id
    FROM public.user_roles ur
    WHERE ur.role = 'admin'
    LIMIT 1;
  END IF;

  -- If still no owner found, skip seeding
  IF _owner_id IS NULL THEN
    RAISE NOTICE 'No users found, skipping default tenant creation';
    RETURN;
  END IF;

  -- Create the default tenant
  INSERT INTO public.tenants (name, slug, owner_user_id, plan_type)
  VALUES ('FitJourney Default', 'default', _owner_id, 'professional')
  RETURNING id INTO _tenant_id;

  -- Associate ALL existing users to this tenant with their existing roles
  FOR _rec IN
    SELECT DISTINCT ur.user_id, ur.role
    FROM public.user_roles ur
  LOOP
    INSERT INTO public.user_tenants (user_id, tenant_id, role)
    VALUES (
      _rec.user_id,
      _tenant_id,
      CASE _rec.role::text
        WHEN 'nutritionist' THEN 'nutritionist'::public.tenant_role
        WHEN 'personal' THEN 'personal'::public.tenant_role
        WHEN 'patient' THEN 'patient'::public.tenant_role
        WHEN 'admin' THEN 'admin'::public.tenant_role
        ELSE 'patient'::public.tenant_role
      END
    )
    ON CONFLICT (user_id, tenant_id) DO NOTHING;
  END LOOP;

  -- Set the owner as 'owner' role
  UPDATE public.user_tenants
  SET role = 'owner'
  WHERE user_id = _owner_id AND tenant_id = _tenant_id;

  RAISE NOTICE 'Default tenant created with id: %', _tenant_id;
END
$$;
