-- Sprint 2.3 P0: Critical performance indexes
CREATE INDEX IF NOT EXISTS idx_checklist_tasks_patient_date ON public.checklist_tasks(patient_id, date);
CREATE INDEX IF NOT EXISTS idx_meal_item_completions_patient_date ON public.meal_item_completions(patient_id, date);
CREATE INDEX IF NOT EXISTS idx_patient_points_patient_earned ON public.patient_points(patient_id, earned_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_receiver_read ON public.chat_messages(receiver_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_nutritionist_patients_nutri_status ON public.nutritionist_patients(nutritionist_id, status);
CREATE INDEX IF NOT EXISTS idx_patient_timeline_patient ON public.patient_timeline(patient_id, created_at DESC);