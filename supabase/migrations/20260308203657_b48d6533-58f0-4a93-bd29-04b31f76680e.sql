
-- ============================================
-- FitJourney 2.0 - Complete Schema Migration
-- ============================================

-- 1. Create all tables first (no cross-referencing policies yet)

CREATE TABLE public.protocols (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'nutrition',
  duration_days integer NOT NULL DEFAULT 30,
  is_template boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.patient_protocols (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  protocol_id uuid NOT NULL REFERENCES public.protocols(id) ON DELETE CASCADE,
  nutritionist_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'scheduled',
  start_date date NOT NULL,
  end_date date,
  schedule_criteria jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.protocol_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  protocol_id uuid NOT NULL REFERENCES public.protocols(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'habit',
  frequency text NOT NULL DEFAULT 'daily',
  sort_order integer NOT NULL DEFAULT 0,
  icon text NOT NULL DEFAULT '✅',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.checklist_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  protocol_task_id uuid REFERENCES public.protocol_tasks(id) ON DELETE SET NULL,
  patient_protocol_id uuid REFERENCES public.patient_protocols(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  icon text NOT NULL DEFAULT '✅',
  category text NOT NULL DEFAULT 'habit',
  date date NOT NULL DEFAULT CURRENT_DATE,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(patient_id, protocol_task_id, date)
);

CREATE TABLE public.patient_timeline (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  event_type text NOT NULL DEFAULT 'note',
  title text NOT NULL,
  description text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  tag text NOT NULL DEFAULT 'general',
  image_url text,
  created_by uuid NOT NULL,
  start_date date NOT NULL,
  end_date date,
  is_active boolean NOT NULL DEFAULT true,
  protocol_id uuid REFERENCES public.protocols(id) ON DELETE SET NULL,
  max_patients integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.program_patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'active',
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(program_id, patient_id)
);

-- 2. Enable RLS on all tables
ALTER TABLE public.protocols ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_protocols ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.protocol_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_patients ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies

-- protocols
CREATE POLICY "Nutritionists manage own protocols" ON public.protocols
  FOR ALL TO authenticated USING (auth.uid() = created_by) WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Patients view assigned protocols" ON public.protocols
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.patient_protocols pp WHERE pp.protocol_id = protocols.id AND pp.patient_id = auth.uid()));

-- patient_protocols
CREATE POLICY "Nutritionists manage patient protocols" ON public.patient_protocols
  FOR ALL TO authenticated USING (auth.uid() = nutritionist_id) WITH CHECK (auth.uid() = nutritionist_id);

CREATE POLICY "Patients view own protocols" ON public.patient_protocols
  FOR SELECT TO authenticated USING (auth.uid() = patient_id);

-- protocol_tasks
CREATE POLICY "Via protocol owner access" ON public.protocol_tasks
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.protocols p WHERE p.id = protocol_tasks.protocol_id AND p.created_by = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.protocols p WHERE p.id = protocol_tasks.protocol_id AND p.created_by = auth.uid()));

CREATE POLICY "Patients view protocol tasks" ON public.protocol_tasks
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.patient_protocols pp WHERE pp.protocol_id = protocol_tasks.protocol_id AND pp.patient_id = auth.uid()));

-- checklist_tasks
CREATE POLICY "Patients manage own checklist" ON public.checklist_tasks
  FOR ALL TO authenticated USING (auth.uid() = patient_id) WITH CHECK (auth.uid() = patient_id);

CREATE POLICY "Nutritionists view patient checklist" ON public.checklist_tasks
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.nutritionist_patients np WHERE np.patient_id = checklist_tasks.patient_id AND np.nutritionist_id = auth.uid() AND np.status = 'active'));

-- patient_timeline
CREATE POLICY "Patient views own timeline" ON public.patient_timeline
  FOR SELECT TO authenticated USING (auth.uid() = patient_id);

CREATE POLICY "Nutritionists manage patient timeline" ON public.patient_timeline
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.nutritionist_patients np WHERE np.patient_id = patient_timeline.patient_id AND np.nutritionist_id = auth.uid() AND np.status = 'active'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.nutritionist_patients np WHERE np.patient_id = patient_timeline.patient_id AND np.nutritionist_id = auth.uid() AND np.status = 'active'));

-- programs
CREATE POLICY "Nutritionists manage own programs" ON public.programs
  FOR ALL TO authenticated USING (auth.uid() = created_by) WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Patients view enrolled programs" ON public.programs
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.program_patients gp WHERE gp.program_id = programs.id AND gp.patient_id = auth.uid()));

-- program_patients
CREATE POLICY "Nutritionists manage program patients" ON public.program_patients
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.programs p WHERE p.id = program_patients.program_id AND p.created_by = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.programs p WHERE p.id = program_patients.program_id AND p.created_by = auth.uid()));

CREATE POLICY "Patients view own enrollment" ON public.program_patients
  FOR SELECT TO authenticated USING (auth.uid() = patient_id);

-- 4. Sync function
CREATE OR REPLACE FUNCTION public.sync_protocol_checklist(_patient_protocol_id uuid, _date date DEFAULT CURRENT_DATE)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _pp record;
  _task record;
  _count integer := 0;
BEGIN
  SELECT * INTO _pp FROM public.patient_protocols WHERE id = _patient_protocol_id AND status = 'active';
  IF NOT FOUND THEN RETURN 0; END IF;

  FOR _task IN SELECT * FROM public.protocol_tasks WHERE protocol_id = _pp.protocol_id
  LOOP
    INSERT INTO public.checklist_tasks (patient_id, protocol_task_id, patient_protocol_id, title, description, icon, category, date)
    VALUES (_pp.patient_id, _task.id, _patient_protocol_id, _task.title, _task.description, _task.icon, _task.category, _date)
    ON CONFLICT (patient_id, protocol_task_id, date) DO NOTHING;
    _count := _count + 1;
  END LOOP;

  RETURN _count;
END;
$$;

-- 5. Triggers for updated_at
CREATE TRIGGER update_protocols_updated_at BEFORE UPDATE ON public.protocols
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_patient_protocols_updated_at BEFORE UPDATE ON public.patient_protocols
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_programs_updated_at BEFORE UPDATE ON public.programs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.checklist_tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.patient_timeline;
