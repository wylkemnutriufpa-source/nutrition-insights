
-- 1. Add protocol_key to programs table
ALTER TABLE public.programs ADD COLUMN IF NOT EXISTS protocol_key text DEFAULT NULL;

-- Update known programs with protocol keys
UPDATE public.programs SET protocol_key = 'bikini_branco' WHERE tag ILIKE '%biqu%' OR title ILIKE '%biqu%' AND protocol_key IS NULL;

-- 2. Create patient_project_history table
CREATE TABLE IF NOT EXISTS public.patient_project_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  program_id uuid REFERENCES public.programs(id) ON DELETE SET NULL,
  project_code text NOT NULL,
  status text NOT NULL DEFAULT 'requested',
  started_at timestamptz,
  ended_at timestamptz,
  approved_by uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.patient_project_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Professionals see own patients project history"
  ON public.patient_project_history FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.nutritionist_patients np 
      WHERE np.patient_id = patient_project_history.patient_id 
      AND np.nutritionist_id = auth.uid() AND np.status = 'active'
    )
    OR patient_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Professionals insert project history"
  ON public.patient_project_history FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.nutritionist_patients np 
      WHERE np.patient_id = patient_project_history.patient_id 
      AND np.nutritionist_id = auth.uid() AND np.status = 'active'
    )
    OR public.has_role(auth.uid(), 'admin')
  );

-- 3. Trigger: On program_join_requests approval → activate project protocol + log history
CREATE OR REPLACE FUNCTION public.trg_project_request_approved()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _program record;
  _protocol_id uuid;
  _protocol_key text;
BEGIN
  -- Only fire on status change to 'approved'
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    -- Get program details
    SELECT id, protocol_key, protocol_id, title INTO _program
    FROM public.programs WHERE id = NEW.program_id;

    IF _program.protocol_key IS NOT NULL THEN
      _protocol_key := _program.protocol_key;
      _protocol_id := _program.protocol_id;

      -- If program has a linked protocol, find it by key
      IF _protocol_id IS NULL THEN
        SELECT id INTO _protocol_id FROM public.protocols 
        WHERE protocol_key = _protocol_key LIMIT 1;
      END IF;

      -- Deactivate any current active protocol for this patient (from the approving professional)
      UPDATE public.patient_protocols 
      SET status = 'completed', 
          manual_intervention_status = COALESCE(manual_intervention_status, 'none')
      WHERE patient_id = NEW.patient_id AND status = 'active';

      -- Activate the project protocol
      IF _protocol_id IS NOT NULL THEN
        INSERT INTO public.patient_protocols (
          patient_id, protocol_id, protocol_key, status, 
          start_date, nutritionist_id
        ) VALUES (
          NEW.patient_id, _protocol_id, _protocol_key, 'active',
          CURRENT_DATE, NEW.reviewed_by
        ) ON CONFLICT DO NOTHING;
      END IF;

      -- Log project history
      INSERT INTO public.patient_project_history (
        patient_id, program_id, project_code, status, started_at, approved_by
      ) VALUES (
        NEW.patient_id, NEW.program_id, _protocol_key, 'active', now(), NEW.reviewed_by
      );
    ELSE
      -- No protocol_key on program, just log as enrolled
      INSERT INTO public.patient_project_history (
        patient_id, program_id, project_code, status, started_at, approved_by
      ) VALUES (
        NEW.patient_id, NEW.program_id, 'fitjourney_master', 'active', now(), NEW.reviewed_by
      );
    END IF;
  END IF;

  -- On rejection, log history
  IF NEW.status = 'rejected' AND (OLD.status IS DISTINCT FROM 'rejected') THEN
    SELECT protocol_key INTO _protocol_key FROM public.programs WHERE id = NEW.program_id;
    INSERT INTO public.patient_project_history (
      patient_id, program_id, project_code, status, approved_by, notes
    ) VALUES (
      NEW.patient_id, NEW.program_id, COALESCE(_protocol_key, 'unknown'), 'rejected', NEW.reviewed_by, 'Solicitação recusada pelo profissional'
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_project_request_approved ON public.program_join_requests;
CREATE TRIGGER trg_project_request_approved
  AFTER UPDATE ON public.program_join_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_project_request_approved();

-- 4. Function to end a project and revert to fitjourney_master
CREATE OR REPLACE FUNCTION public.end_patient_project(
  _patient_id uuid,
  _program_id uuid,
  _reason text DEFAULT 'Projeto encerrado'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _program record;
  _fj_protocol_id uuid;
BEGIN
  -- Get project protocol_key
  SELECT protocol_key INTO _program FROM public.programs WHERE id = _program_id;

  -- Deactivate project protocol
  UPDATE public.patient_protocols
  SET status = 'completed'
  WHERE patient_id = _patient_id 
    AND protocol_key = _program.protocol_key 
    AND status = 'active';

  -- Log project ended
  UPDATE public.patient_project_history
  SET status = 'ended', ended_at = now(), notes = _reason
  WHERE patient_id = _patient_id AND program_id = _program_id AND status = 'active';

  -- Insert return-to-base history
  INSERT INTO public.patient_project_history (
    patient_id, program_id, project_code, status, started_at, notes
  ) VALUES (
    _patient_id, _program_id, 'fitjourney_master', 'returned_to_base', now(), 'Retorno automático ao protocolo base'
  );

  -- Reactivate fitjourney_master
  SELECT id INTO _fj_protocol_id FROM public.protocols 
  WHERE protocol_key = 'fitjourney_master' LIMIT 1;

  IF _fj_protocol_id IS NOT NULL THEN
    -- Check if already has an active fitjourney
    IF NOT EXISTS (
      SELECT 1 FROM public.patient_protocols 
      WHERE patient_id = _patient_id AND protocol_key = 'fitjourney_master' AND status = 'active'
    ) THEN
      INSERT INTO public.patient_protocols (
        patient_id, protocol_id, protocol_key, status, start_date, nutritionist_id
      ) VALUES (
        _patient_id, _fj_protocol_id, 'fitjourney_master', 'active', CURRENT_DATE, auth.uid()
      );
    END IF;
  END IF;

  RETURN jsonb_build_object('success', true, 'reverted_to', 'fitjourney_master');
END;
$$;

-- 5. Enable realtime for project history
ALTER PUBLICATION supabase_realtime ADD TABLE public.patient_project_history;
