CREATE OR REPLACE FUNCTION public.notify_lifecycle_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  _new_payload jsonb := COALESCE(to_jsonb(NEW), '{}'::jsonb);
  _old_payload jsonb := COALESCE(to_jsonb(OLD), '{}'::jsonb);
  _record_id text;
  _patient_id text;
BEGIN
  _record_id := COALESCE(
    _new_payload ->> 'id',
    _new_payload ->> 'patient_id',
    _old_payload ->> 'id',
    _old_payload ->> 'patient_id'
  );

  _patient_id := COALESCE(
    _new_payload ->> 'patient_id',
    _old_payload ->> 'patient_id'
  );

  PERFORM pg_notify(
    'lifecycle_changes',
    json_build_object(
      'table', TG_TABLE_NAME,
      'operation', TG_OP,
      'record_id', _record_id,
      'patient_id', _patient_id
    )::text
  );

  RETURN COALESCE(NEW, OLD);
END;
$function$;