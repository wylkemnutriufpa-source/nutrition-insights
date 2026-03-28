
CREATE OR REPLACE FUNCTION public.get_nutritionist_dashboard_stats(_nutritionist_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  today_start timestamptz := date_trunc('day', now());
  today_end timestamptz := today_start + interval '1 day' - interval '1 microsecond';
BEGIN
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
$$;

CREATE OR REPLACE FUNCTION public.get_patient_dashboard_stats(_patient_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  today_date date := current_date;
BEGIN
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
$$;
