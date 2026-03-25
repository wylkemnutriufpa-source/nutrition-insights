
-- patient_professional_links: Universal multi-professional linking
CREATE TABLE IF NOT EXISTS public.patient_professional_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  professional_id uuid NOT NULL,
  professional_role text NOT NULL DEFAULT 'trainer',
  link_status text NOT NULL DEFAULT 'active',
  permissions jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (patient_id, professional_id, professional_role)
);

-- Add constraint for valid roles
ALTER TABLE public.patient_professional_links
  ADD CONSTRAINT chk_professional_role CHECK (professional_role IN ('nutritionist', 'trainer', 'doctor', 'physiotherapist', 'psychologist'));

-- Add constraint for valid statuses
ALTER TABLE public.patient_professional_links
  ADD CONSTRAINT chk_link_status CHECK (link_status IN ('pending', 'active', 'revoked'));

-- Enable RLS
ALTER TABLE public.patient_professional_links ENABLE ROW LEVEL SECURITY;

-- Helper function to check professional link
CREATE OR REPLACE FUNCTION public.is_linked_professional(_user_id uuid, _patient_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.patient_professional_links
    WHERE professional_id = _user_id
      AND patient_id = _patient_id
      AND link_status = 'active'
  );
$$;

-- RLS policies
CREATE POLICY "ppl_select" ON public.patient_professional_links FOR SELECT TO authenticated
  USING (
    patient_id = auth.uid()
    OR professional_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "ppl_insert" ON public.patient_professional_links FOR INSERT TO authenticated
  WITH CHECK (
    professional_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "ppl_update" ON public.patient_professional_links FOR UPDATE TO authenticated
  USING (
    professional_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "ppl_delete" ON public.patient_professional_links FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
  );

-- Index for fast lookups
CREATE INDEX idx_ppl_patient ON public.patient_professional_links(patient_id, link_status);
CREATE INDEX idx_ppl_professional ON public.patient_professional_links(professional_id, link_status);

-- Sync existing personal_trainer_students into patient_professional_links
INSERT INTO public.patient_professional_links (patient_id, professional_id, professional_role, link_status, created_at)
SELECT student_id, personal_id, 'trainer', 
  CASE WHEN status = 'active' THEN 'active' ELSE 'revoked' END,
  created_at
FROM public.personal_trainer_students
ON CONFLICT (patient_id, professional_id, professional_role) DO NOTHING;

-- Also sync nutritionist_patients
INSERT INTO public.patient_professional_links (patient_id, professional_id, professional_role, link_status, created_at)
SELECT patient_id, nutritionist_id, 'nutritionist', 'active', created_at
FROM public.nutritionist_patients
WHERE status = 'active'
ON CONFLICT (patient_id, professional_id, professional_role) DO NOTHING;
