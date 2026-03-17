
-- ======================================================
-- CLINIC TEAM HIERARCHY — Tables, RLS, Functions
-- ======================================================

-- 1) team_members table
CREATE TABLE public.team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  head_professional_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'employee_clinical',
  status text NOT NULL DEFAULT 'active',
  display_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(head_professional_id, user_id)
);

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- Head can manage own team
CREATE POLICY "Head manages own team" ON public.team_members
  FOR ALL TO authenticated
  USING (head_professional_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (head_professional_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Employee can see own membership
CREATE POLICY "Employee sees own membership" ON public.team_members
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- 2) team_member_permissions table
CREATE TABLE public.team_member_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_member_id uuid NOT NULL REFERENCES public.team_members(id) ON DELETE CASCADE,
  head_professional_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  can_view_patients boolean NOT NULL DEFAULT true,
  can_view_patient_details boolean NOT NULL DEFAULT true,
  can_view_meal_plans boolean NOT NULL DEFAULT true,
  can_edit_meal_plans boolean NOT NULL DEFAULT true,
  can_view_pending_plans boolean NOT NULL DEFAULT true,
  can_approve_plans boolean NOT NULL DEFAULT false,
  can_view_checkins boolean NOT NULL DEFAULT true,
  can_respond_feedback boolean NOT NULL DEFAULT true,
  can_view_timeline boolean NOT NULL DEFAULT true,
  can_view_projection boolean NOT NULL DEFAULT true,
  can_view_clinical_risk boolean NOT NULL DEFAULT false,
  can_access_ranking boolean NOT NULL DEFAULT false,
  can_access_reports boolean NOT NULL DEFAULT false,
  can_access_financial boolean NOT NULL DEFAULT false,
  can_manage_automation boolean NOT NULL DEFAULT false,
  can_manage_team boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(team_member_id)
);

ALTER TABLE public.team_member_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Head manages team permissions" ON public.team_member_permissions
  FOR ALL TO authenticated
  USING (head_professional_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (head_professional_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Employee sees own permissions" ON public.team_member_permissions
  FOR SELECT TO authenticated
  USING (team_member_id IN (SELECT id FROM public.team_members WHERE user_id = auth.uid()));

-- 3) team_member_patient_assignments
CREATE TABLE public.team_member_patient_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  head_professional_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_member_id uuid NOT NULL REFERENCES public.team_members(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(team_member_id, patient_id)
);

ALTER TABLE public.team_member_patient_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Head manages patient assignments" ON public.team_member_patient_assignments
  FOR ALL TO authenticated
  USING (head_professional_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (head_professional_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Employee sees own assignments" ON public.team_member_patient_assignments
  FOR SELECT TO authenticated
  USING (team_member_id IN (SELECT id FROM public.team_members WHERE user_id = auth.uid()));

-- 4) team_member_activity_logs
CREATE TABLE public.team_member_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  head_professional_id uuid NOT NULL,
  team_member_id uuid NOT NULL REFERENCES public.team_members(id) ON DELETE CASCADE,
  action text NOT NULL,
  resource_type text,
  resource_id uuid,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.team_member_activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Head sees team activity" ON public.team_member_activity_logs
  FOR SELECT TO authenticated
  USING (head_professional_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System inserts activity" ON public.team_member_activity_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    head_professional_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR team_member_id IN (SELECT id FROM public.team_members WHERE user_id = auth.uid())
  );

-- 5) Indexes
CREATE INDEX idx_team_members_head ON public.team_members(head_professional_id);
CREATE INDEX idx_team_members_user ON public.team_members(user_id);
CREATE INDEX idx_team_member_permissions_member ON public.team_member_permissions(team_member_id);
CREATE INDEX idx_team_member_assignments_member ON public.team_member_patient_assignments(team_member_id);
CREATE INDEX idx_team_member_assignments_patient ON public.team_member_patient_assignments(patient_id);
CREATE INDEX idx_team_activity_head ON public.team_member_activity_logs(head_professional_id, created_at DESC);
CREATE INDEX idx_team_activity_member ON public.team_member_activity_logs(team_member_id, created_at DESC);

-- 6) Helper function: get team member permissions
CREATE OR REPLACE FUNCTION public.get_team_permissions(_user_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT row_to_json(p.*)::jsonb
     FROM public.team_member_permissions p
     JOIN public.team_members tm ON tm.id = p.team_member_id
     WHERE tm.user_id = _user_id AND tm.status = 'active'
     LIMIT 1),
    '{}'::jsonb
  )
$$;

-- 7) Helper: check if user is team member of a head
CREATE OR REPLACE FUNCTION public.is_team_member_of(_user_id uuid, _head_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_members
    WHERE user_id = _user_id AND head_professional_id = _head_id AND status = 'active'
  )
$$;

-- 8) Helper: get the head_professional_id for a team member
CREATE OR REPLACE FUNCTION public.get_team_head_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT head_professional_id FROM public.team_members
  WHERE user_id = _user_id AND status = 'active'
  LIMIT 1
$$;

-- 9) Trigger: auto-create default permissions on team_member insert
CREATE OR REPLACE FUNCTION public.auto_create_team_permissions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.team_member_permissions (team_member_id, head_professional_id)
  VALUES (NEW.id, NEW.head_professional_id)
  ON CONFLICT (team_member_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_create_team_permissions
  AFTER INSERT ON public.team_members
  FOR EACH ROW EXECUTE FUNCTION public.auto_create_team_permissions();

-- 10) Log team activity helper
CREATE OR REPLACE FUNCTION public.log_team_activity(
  _head_professional_id uuid,
  _team_member_id uuid,
  _action text,
  _resource_type text DEFAULT NULL,
  _resource_id uuid DEFAULT NULL,
  _metadata jsonb DEFAULT '{}'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.team_member_activity_logs (head_professional_id, team_member_id, action, resource_type, resource_id, metadata)
  VALUES (_head_professional_id, _team_member_id, _action, _resource_type, _resource_id, _metadata);
END;
$$;
