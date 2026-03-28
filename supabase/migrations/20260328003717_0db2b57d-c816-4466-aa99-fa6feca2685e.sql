
-- SECURITY HARDENING: Replace both dashboard RPCs with auth.uid()-validated versions
-- This prevents any authenticated user from querying another user's stats

CREATE OR REPLACE FUNCTION public.get_nutritionist_dashboard_stats(_nutritionist_id uuid)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb;
  today_start timestamptz := date_trunc('day', now());
  today_end timestamptz := today_start + interval '1 day' - interval '1 microsecond';
BEGIN
  -- SECURITY: Validate caller is the requested nutritionist
  IF _nutritionist_id IS NULL OR _nutritionist_id != auth.uid() THEN
    RETURN jsonb_build_object(
      'patient_count', 0, 'protocol_count', 0, 'program_count', 0,
      'meal_plan_count', 0, 'appointments_today', 0, 'unread_chats', 0, 'pending_checkins', 0
    );
  END IF;

  SELECT jsonb_build_object(
    'patient_count', (SELECT count(*) FROM nutritionist_patients WHERE nutritionist_id = _nutritionist_id AND status = 'active'),
    'protocol_count', (SELECT count(*) FROM protocols WHERE created_by = _nutritionist_id),
    'program_count', (SELECT count(*) FROM programs WHERE created_by = _nutritionist_id AND is_active = true),
    'meal_plan_count', (SELECT count(*) FROM meal_plans WHERE nutritionist_id = _nutritionist_id AND is_active = true),
    'appointments_today', (SELECT count(*) FROM patient_appointments WHERE nutritionist_id = _nutritionist_id AND appointment_date >= today_start AND appointment_date <= today_end),
    'unread_chats', (SELECT count(*) FROM chat_messages WHERE receiver_id = _nutritionist_id AND is_read = false),
    'pending_checkins', (SELECT count(*) FROM patient_checkins WHERE nutritionist_id = _nutritionist_id AND status = 'pending')
  ) INTO result;

  RETURN result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_patient_dashboard_stats(_patient_id uuid)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb;
  today_date date := current_date;
BEGIN
  -- SECURITY: Validate caller is the requested patient
  IF _patient_id IS NULL OR _patient_id != auth.uid() THEN
    RETURN jsonb_build_object(
      'stats', null, 'checklist_count', 0, 'checklist_done', 0,
      'has_anamnesis', false, 'unread_messages', 0, 'next_appointment', null
    );
  END IF;

  SELECT jsonb_build_object(
    'stats', (SELECT row_to_json(s) FROM player_stats s WHERE s.user_id = _patient_id LIMIT 1),
    'checklist_count', (SELECT count(*) FROM checklist_tasks WHERE patient_id = _patient_id AND date = today_date::text),
    'checklist_done', (SELECT count(*) FROM checklist_tasks WHERE patient_id = _patient_id AND date = today_date::text AND completed = true),
    'has_anamnesis', (SELECT exists(SELECT 1 FROM patient_anamnesis WHERE user_id = _patient_id AND status = 'completed')),
    'unread_messages', (SELECT count(*) FROM chat_messages WHERE receiver_id = _patient_id AND is_read = false),
    'next_appointment', (
      SELECT row_to_json(a) FROM patient_appointments a
      WHERE a.patient_id = _patient_id AND a.appointment_date >= now()
      ORDER BY a.appointment_date LIMIT 1
    )
  ) INTO result;

  RETURN result;
END;
$function$;
