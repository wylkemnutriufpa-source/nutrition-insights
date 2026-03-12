
-- Table to archive points before reset
CREATE TABLE IF NOT EXISTS public.patient_points_archive (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  original_id uuid,
  patient_id uuid NOT NULL,
  action_key text NOT NULL,
  points integer NOT NULL,
  metadata jsonb,
  source_type text,
  source_id text,
  professional_id uuid,
  earned_at timestamptz NOT NULL,
  archived_at timestamptz NOT NULL DEFAULT now(),
  archived_by uuid
);

ALTER TABLE public.patient_points_archive ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view archives" ON public.patient_points_archive
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Function to archive and reset all points
CREATE OR REPLACE FUNCTION public.reset_all_ranking_points()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _count integer;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can reset ranking points';
  END IF;

  -- Archive all current points
  INSERT INTO public.patient_points_archive (original_id, patient_id, action_key, points, metadata, source_type, source_id, professional_id, earned_at, archived_by)
  SELECT id, patient_id, action_key, points, metadata, source_type, source_id, professional_id, earned_at, auth.uid()
  FROM public.patient_points;

  GET DIAGNOSTICS _count = ROW_COUNT;

  -- Clear all points
  DELETE FROM public.patient_points;

  -- Clear ranking cache
  DELETE FROM public.patient_ranking_cache;

  -- Log audit
  PERFORM public.log_audit('reset_ranking_points', 'ranking', NULL, jsonb_build_object('archived_count', _count));

  RETURN jsonb_build_object('success', true, 'archived_count', _count);
END;
$$;
