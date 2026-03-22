
-- Phytotherapy protocol templates (library)
CREATE TABLE public.phytotherapy_protocol_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  objective text NOT NULL DEFAULT '',
  phytotherapics jsonb NOT NULL DEFAULT '[]'::jsonb,
  dosage text NOT NULL DEFAULT '',
  schedule text NOT NULL DEFAULT '',
  duration text NOT NULL DEFAULT '',
  clinical_notes text DEFAULT '',
  contraindications text DEFAULT '',
  patient_instructions text DEFAULT '',
  is_global boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Patient assigned protocols
CREATE TABLE public.patient_phytotherapy_protocols (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  nutritionist_id uuid NOT NULL,
  template_id uuid REFERENCES public.phytotherapy_protocol_templates(id) ON DELETE SET NULL,
  name text NOT NULL,
  objective text NOT NULL DEFAULT '',
  phytotherapics jsonb NOT NULL DEFAULT '[]'::jsonb,
  dosage text NOT NULL DEFAULT '',
  schedule text NOT NULL DEFAULT '',
  duration text NOT NULL DEFAULT '',
  clinical_notes text DEFAULT '',
  contraindications text DEFAULT '',
  patient_instructions text DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.phytotherapy_protocol_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_phytotherapy_protocols ENABLE ROW LEVEL SECURITY;

-- Templates: authenticated can read global or own
CREATE POLICY "Read global or own templates" ON public.phytotherapy_protocol_templates
  FOR SELECT TO authenticated
  USING (is_global = true OR created_by = auth.uid());

CREATE POLICY "Insert own templates" ON public.phytotherapy_protocol_templates
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Update own templates" ON public.phytotherapy_protocol_templates
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "Delete own templates" ON public.phytotherapy_protocol_templates
  FOR DELETE TO authenticated
  USING (created_by = auth.uid());

-- Patient protocols: nutritionist manages, patient reads own
CREATE POLICY "Nutritionist manages patient protocols" ON public.patient_phytotherapy_protocols
  FOR ALL TO authenticated
  USING (nutritionist_id = auth.uid());

CREATE POLICY "Patient reads own protocols" ON public.patient_phytotherapy_protocols
  FOR SELECT TO authenticated
  USING (patient_id = auth.uid());

-- Indexes
CREATE INDEX idx_phyto_templates_global ON public.phytotherapy_protocol_templates(is_global);
CREATE INDEX idx_phyto_templates_creator ON public.phytotherapy_protocol_templates(created_by);
CREATE INDEX idx_patient_phyto_patient ON public.patient_phytotherapy_protocols(patient_id);
CREATE INDEX idx_patient_phyto_nutri ON public.patient_phytotherapy_protocols(nutritionist_id);
