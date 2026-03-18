
-- Ensure patient can insert their own project history requests (read via existing SELECT policy)
-- Also add missing INSERT policy for program_join_requests if needed

-- patient_project_history: allow patients to read their own history
-- (SELECT policy already covers this via patient_id = auth.uid())

-- The main issue: ensure program_join_requests has proper RLS
-- Check and add INSERT policy for patients
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'program_join_requests' 
    AND policyname = 'Patients can create join requests'
  ) THEN
    EXECUTE 'CREATE POLICY "Patients can create join requests" ON public.program_join_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = patient_id)';
  END IF;
END $$;

-- Ensure patients can read their own join requests
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'program_join_requests' 
    AND policyname = 'Patients can read own join requests'
  ) THEN
    EXECUTE 'CREATE POLICY "Patients can read own join requests" ON public.program_join_requests FOR SELECT TO authenticated USING (auth.uid() = patient_id OR public.has_role(auth.uid(), ''nutritionist'') OR public.has_role(auth.uid(), ''admin''))';
  END IF;
END $$;

-- Ensure professionals can update join requests (approve/reject)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'program_join_requests' 
    AND policyname = 'Professionals can update join requests'
  ) THEN
    EXECUTE 'CREATE POLICY "Professionals can update join requests" ON public.program_join_requests FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), ''nutritionist'') OR public.has_role(auth.uid(), ''admin''))';
  END IF;
END $$;
