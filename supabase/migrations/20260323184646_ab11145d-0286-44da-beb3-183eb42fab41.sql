
-- WORKSTREAM 2: Safe orphan pipeline preview RPC
CREATE OR REPLACE FUNCTION public.preview_orphan_onboarding_pipelines()
RETURNS TABLE(
  pipeline_id uuid,
  patient_id uuid,
  nutritionist_id uuid,
  pipeline_status text,
  created_at timestamptz,
  archival_reason text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    op.id AS pipeline_id,
    op.patient_id,
    op.nutritionist_id,
    op.status::text AS pipeline_status,
    op.created_at,
    CASE
      WHEN np.id IS NULL THEN 'no_active_patient_link'
      WHEN op.created_at < now() - interval '90 days' AND op.status IN ('pending', 'in_progress') THEN 'stale_pipeline_90d'
      WHEN op.status = 'pending' AND op.created_at < now() - interval '30 days' THEN 'abandoned_pending_30d'
      ELSE 'unknown'
    END AS archival_reason
  FROM onboarding_pipelines op
  LEFT JOIN nutritionist_patients np
    ON np.patient_id = op.patient_id
    AND np.nutritionist_id = op.nutritionist_id
    AND np.status = 'active'
  WHERE op.status NOT IN ('completed', 'archived', 'cancelled')
    AND (
      np.id IS NULL
      OR (op.created_at < now() - interval '90 days' AND op.status IN ('pending', 'in_progress'))
      OR (op.status = 'pending' AND op.created_at < now() - interval '30 days')
    );
END;
$$;

-- WORKSTREAM 3: Diagnostic pipeline observability helper RPC
CREATE OR REPLACE FUNCTION public.log_pipeline_execution(
  _pipeline_name text,
  _status text DEFAULT 'started',
  _patients_processed int DEFAULT 0,
  _errors_count int DEFAULT 0,
  _error_details jsonb DEFAULT NULL,
  _metadata jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _id uuid;
BEGIN
  INSERT INTO pipeline_execution_logs (
    pipeline_name, execution_status, patients_processed,
    errors_count, error_details, metadata,
    started_at, completed_at
  ) VALUES (
    _pipeline_name, _status, _patients_processed,
    _errors_count, _error_details, _metadata,
    now(),
    CASE WHEN _status IN ('completed', 'failed', 'partial') THEN now() ELSE NULL END
  )
  RETURNING id INTO _id;
  
  RETURN _id;
END;
$$;

-- Helper to finalize a pipeline run
CREATE OR REPLACE FUNCTION public.finalize_pipeline_execution(
  _id uuid,
  _status text,
  _patients_processed int DEFAULT 0,
  _errors_count int DEFAULT 0,
  _error_details jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE pipeline_execution_logs
  SET execution_status = _status,
      completed_at = now(),
      patients_processed = _patients_processed,
      errors_count = _errors_count,
      error_details = COALESCE(_error_details, error_details)
  WHERE id = _id;
END;
$$;
