
-- Program Enrollments: tracks patient journey through Biquíni Branco phases
CREATE TABLE public.program_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID REFERENCES public.programs(id) ON DELETE CASCADE NOT NULL,
  patient_id UUID NOT NULL,
  professional_id UUID NOT NULL,
  current_phase INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'pending_onboarding',
  blocked_reason TEXT,
  started_at TIMESTAMPTZ DEFAULT now(),
  next_weight_due_at TIMESTAMPTZ,
  next_full_review_due_at TIMESTAMPTZ,
  onboarding_completed_at TIMESTAMPTZ,
  last_weight_at TIMESTAMPTZ,
  last_photos_at TIMESTAMPTZ,
  initial_weight NUMERIC,
  initial_height NUMERIC,
  initial_bmi NUMERIC,
  initial_tmb NUMERIC,
  initial_get NUMERIC,
  initial_kcal_target NUMERIC,
  initial_protein NUMERIC,
  initial_carbs NUMERIC,
  initial_fat NUMERIC,
  clinical_questions JSONB DEFAULT '{}',
  has_measurements BOOLEAN DEFAULT false,
  measurements JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(program_id, patient_id)
);

-- Protocol Cycles: tracks each protocol phase activation
CREATE TABLE public.protocol_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID REFERENCES public.program_enrollments(id) ON DELETE CASCADE NOT NULL,
  phase INTEGER NOT NULL,
  protocol_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  approval_required BOOLEAN DEFAULT false,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  auto_adjustments JSONB DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enrollment photos for each phase
CREATE TABLE public.enrollment_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID REFERENCES public.program_enrollments(id) ON DELETE CASCADE NOT NULL,
  patient_id UUID NOT NULL,
  phase INTEGER NOT NULL DEFAULT 1,
  photo_front_url TEXT,
  photo_side_url TEXT,
  photo_back_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.program_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.protocol_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollment_photos ENABLE ROW LEVEL SECURITY;

-- RLS: professionals see their enrollments, patients see their own
CREATE POLICY "Professionals manage their enrollments" ON public.program_enrollments
  FOR ALL TO authenticated
  USING (professional_id = auth.uid() OR patient_id = auth.uid());

CREATE POLICY "Professionals manage protocol cycles" ON public.protocol_cycles
  FOR ALL TO authenticated
  USING (enrollment_id IN (SELECT id FROM public.program_enrollments WHERE professional_id = auth.uid() OR patient_id = auth.uid()));

CREATE POLICY "Users manage enrollment photos" ON public.enrollment_photos
  FOR ALL TO authenticated
  USING (patient_id = auth.uid() OR enrollment_id IN (SELECT id FROM public.program_enrollments WHERE professional_id = auth.uid()));

-- Trigger to update updated_at
CREATE TRIGGER update_program_enrollments_updated_at
  BEFORE UPDATE ON public.program_enrollments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for enrollment photos
INSERT INTO storage.buckets (id, name, public) VALUES ('enrollment-photos', 'enrollment-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS
CREATE POLICY "Users can upload enrollment photos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'enrollment-photos');

CREATE POLICY "Anyone can view enrollment photos" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'enrollment-photos');
