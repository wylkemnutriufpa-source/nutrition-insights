
-- IFJ Patient Permissions: granular feature access per patient
CREATE TABLE public.ifj_patient_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL,
  meal_plan BOOLEAN NOT NULL DEFAULT true,
  recipes BOOLEAN NOT NULL DEFAULT true,
  checklist BOOLEAN NOT NULL DEFAULT true,
  hydration BOOLEAN NOT NULL DEFAULT true,
  progress BOOLEAN NOT NULL DEFAULT true,
  appointments BOOLEAN NOT NULL DEFAULT true,
  substitutions BOOLEAN NOT NULL DEFAULT true,
  messages BOOLEAN NOT NULL DEFAULT true,
  recommendations BOOLEAN NOT NULL DEFAULT true,
  ifj_mode TEXT NOT NULL DEFAULT 'standard',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(patient_id)
);

-- RLS
ALTER TABLE public.ifj_patient_permissions ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY "admin_full_access_ifj_perms" ON public.ifj_patient_permissions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Nutritionists can manage their patients' permissions
CREATE POLICY "nutri_manage_ifj_perms" ON public.ifj_patient_permissions
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.nutritionist_patients np
      WHERE np.patient_id = ifj_patient_permissions.patient_id
        AND np.nutritionist_id = auth.uid()
        AND np.status = 'active'
    )
  );

-- Patients can read their own permissions
CREATE POLICY "patient_read_own_ifj_perms" ON public.ifj_patient_permissions
  FOR SELECT TO authenticated
  USING (patient_id = auth.uid());

-- Indexes
CREATE INDEX idx_ifj_patient_permissions_patient ON public.ifj_patient_permissions(patient_id);
