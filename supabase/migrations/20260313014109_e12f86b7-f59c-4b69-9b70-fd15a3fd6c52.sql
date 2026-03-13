
-- Fix booking_payments INSERT policy: restrict WITH CHECK to validate required fields
-- instead of allowing any data
DROP POLICY IF EXISTS "Anyone can insert booking payments" ON public.booking_payments;
CREATE POLICY "Anyone can insert booking payments with valid data" ON public.booking_payments
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    length(customer_name) > 0 AND length(customer_name) <= 200
    AND length(customer_email) > 2 AND length(customer_email) <= 320
    AND amount > 0
    AND nutritionist_id IS NOT NULL
  );

-- Fix SOS tickets: nutritionists should only see tickets for THEIR patients
DROP POLICY IF EXISTS "Patients can view own SOS" ON public.sos_tickets;
CREATE POLICY "Users can view relevant SOS tickets" ON public.sos_tickets
  FOR SELECT TO authenticated
  USING (
    patient_id = auth.uid()
    OR (has_role(auth.uid(), 'nutritionist'::app_role) AND EXISTS (
      SELECT 1 FROM nutritionist_patients np
      WHERE np.patient_id = sos_tickets.patient_id
      AND np.nutritionist_id = auth.uid()
      AND np.status = 'active'
    ))
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- Fix SOS update: restrict to nutritionist who owns the patient
DROP POLICY IF EXISTS "Professionals can update SOS" ON public.sos_tickets;
CREATE POLICY "Professionals can update own patient SOS" ON public.sos_tickets
  FOR UPDATE TO authenticated
  USING (
    (EXISTS (
      SELECT 1 FROM nutritionist_patients np
      WHERE np.patient_id = sos_tickets.patient_id
      AND np.nutritionist_id = auth.uid()
      AND np.status = 'active'
    ))
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- Fix plan_requests SELECT: nutritionist should only see THEIR patients' requests
DROP POLICY IF EXISTS "Users can view plan requests" ON public.plan_requests;
CREATE POLICY "Users can view relevant plan requests" ON public.plan_requests
  FOR SELECT TO authenticated
  USING (
    patient_id = auth.uid()
    OR (has_role(auth.uid(), 'nutritionist'::app_role) AND EXISTS (
      SELECT 1 FROM nutritionist_patients np
      WHERE np.patient_id = plan_requests.patient_id
      AND np.nutritionist_id = auth.uid()
      AND np.status = 'active'
    ))
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- Fix plan_requests UPDATE: restrict to nutritionist who owns the patient
DROP POLICY IF EXISTS "Professionals can update plan requests" ON public.plan_requests;
CREATE POLICY "Professionals can update own patient plan requests" ON public.plan_requests
  FOR UPDATE TO authenticated
  USING (
    (EXISTS (
      SELECT 1 FROM nutritionist_patients np
      WHERE np.patient_id = plan_requests.patient_id
      AND np.nutritionist_id = auth.uid()
      AND np.status = 'active'
    ))
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- Fix program_join_requests: restrict to program owner, not any nutritionist
DROP POLICY IF EXISTS "Users can view join requests" ON public.program_join_requests;
CREATE POLICY "Users can view relevant join requests" ON public.program_join_requests
  FOR SELECT TO authenticated
  USING (
    patient_id = auth.uid()
    OR (has_role(auth.uid(), 'nutritionist'::app_role) AND EXISTS (
      SELECT 1 FROM programs p
      WHERE p.id = program_join_requests.program_id
      AND p.created_by = auth.uid()
    ))
    OR has_role(auth.uid(), 'admin'::app_role)
  );

DROP POLICY IF EXISTS "Professionals can update join requests" ON public.program_join_requests;
CREATE POLICY "Program owners can update join requests" ON public.program_join_requests
  FOR UPDATE TO authenticated
  USING (
    (EXISTS (
      SELECT 1 FROM programs p
      WHERE p.id = program_join_requests.program_id
      AND p.created_by = auth.uid()
    ))
    OR has_role(auth.uid(), 'admin'::app_role)
  );
