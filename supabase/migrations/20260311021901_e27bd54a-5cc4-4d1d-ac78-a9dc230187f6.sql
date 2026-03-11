
-- SOS support tickets table
CREATE TABLE public.sos_tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL,
  nutritionist_id UUID,
  category TEXT NOT NULL DEFAULT 'other',
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Program join requests table
CREATE TABLE public.program_join_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL,
  program_id UUID REFERENCES public.programs(id) ON DELETE CASCADE NOT NULL,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(patient_id, program_id, status)
);

-- Plan request notifications
CREATE TABLE public.plan_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL,
  nutritionist_id UUID,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sos_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_join_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_requests ENABLE ROW LEVEL SECURITY;

-- RLS for sos_tickets
CREATE POLICY "Patients can create own SOS" ON public.sos_tickets FOR INSERT TO authenticated WITH CHECK (patient_id = auth.uid());
CREATE POLICY "Patients can view own SOS" ON public.sos_tickets FOR SELECT TO authenticated USING (patient_id = auth.uid() OR public.has_role(auth.uid(), 'nutritionist') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Professionals can update SOS" ON public.sos_tickets FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'nutritionist') OR public.has_role(auth.uid(), 'admin'));

-- RLS for program_join_requests
CREATE POLICY "Patients can create join requests" ON public.program_join_requests FOR INSERT TO authenticated WITH CHECK (patient_id = auth.uid());
CREATE POLICY "Users can view join requests" ON public.program_join_requests FOR SELECT TO authenticated USING (patient_id = auth.uid() OR public.has_role(auth.uid(), 'nutritionist') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Professionals can update join requests" ON public.program_join_requests FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'nutritionist') OR public.has_role(auth.uid(), 'admin'));

-- RLS for plan_requests
CREATE POLICY "Patients can create plan requests" ON public.plan_requests FOR INSERT TO authenticated WITH CHECK (patient_id = auth.uid());
CREATE POLICY "Users can view plan requests" ON public.plan_requests FOR SELECT TO authenticated USING (patient_id = auth.uid() OR public.has_role(auth.uid(), 'nutritionist') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Professionals can update plan requests" ON public.plan_requests FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'nutritionist') OR public.has_role(auth.uid(), 'admin'));

-- Enable realtime for SOS
ALTER PUBLICATION supabase_realtime ADD TABLE public.sos_tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.plan_requests;
