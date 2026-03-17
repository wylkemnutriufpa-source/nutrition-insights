-- SCALING READINESS: Critical Missing Indexes (verified tables only)

-- 1. checklist_tasks (43K rows, 593M seq_tup_read)
CREATE INDEX IF NOT EXISTS idx_checklist_tasks_patient_date ON public.checklist_tasks (patient_id, date);
CREATE INDEX IF NOT EXISTS idx_checklist_tasks_date_completed ON public.checklist_tasks (date, completed);
CREATE INDEX IF NOT EXISTS idx_checklist_tasks_protocol ON public.checklist_tasks (patient_protocol_id) WHERE patient_protocol_id IS NOT NULL;

-- 2. patient_anamnesis
CREATE INDEX IF NOT EXISTS idx_patient_anamnesis_user_status ON public.patient_anamnesis (user_id, status);

-- 3. physical_assessments
CREATE INDEX IF NOT EXISTS idx_physical_assessments_patient ON public.physical_assessments (patient_id, created_at DESC);

-- 4. patient_checkins
CREATE INDEX IF NOT EXISTS idx_patient_checkins_patient ON public.patient_checkins (patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_patient_checkins_nutri_status ON public.patient_checkins (nutritionist_id, status);

-- 5. chat_messages
CREATE INDEX IF NOT EXISTS idx_chat_messages_receiver_read ON public.chat_messages (receiver_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_chat_messages_participants ON public.chat_messages (sender_id, receiver_id, created_at DESC);

-- 6. patient_protocols
CREATE INDEX IF NOT EXISTS idx_patient_protocols_patient ON public.patient_protocols (patient_id, status);

-- 7. protocols
CREATE INDEX IF NOT EXISTS idx_protocols_created_by ON public.protocols (created_by);

-- 8. notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON public.notifications (user_id, is_read, created_at DESC);

-- 9. clinical_alerts
CREATE INDEX IF NOT EXISTS idx_clinical_alerts_patient_active ON public.clinical_alerts (patient_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_clinical_alerts_nutritionist ON public.clinical_alerts (nutritionist_id, is_active, created_at DESC);

-- 10. patient_timeline
CREATE INDEX IF NOT EXISTS idx_patient_timeline_patient_created ON public.patient_timeline (patient_id, created_at DESC);

-- 11. meal_plans
CREATE INDEX IF NOT EXISTS idx_meal_plans_patient_active ON public.meal_plans (patient_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_meal_plans_nutritionist ON public.meal_plans (nutritionist_id, is_active);

-- 12. patient_appointments
CREATE INDEX IF NOT EXISTS idx_patient_appointments_nutri_date ON public.patient_appointments (nutritionist_id, appointment_date);

-- 13. onboarding_pipelines
CREATE INDEX IF NOT EXISTS idx_onboarding_pipelines_patient ON public.onboarding_pipelines (patient_id, status);

-- 14. professional_feature_usage
CREATE INDEX IF NOT EXISTS idx_prof_feature_usage_nutri ON public.professional_feature_usage (nutritionist_id);

-- 15. patient_points
CREATE INDEX IF NOT EXISTS idx_patient_points_patient_earned ON public.patient_points (patient_id, earned_at DESC);
CREATE INDEX IF NOT EXISTS idx_patient_points_action_earned ON public.patient_points (action_key, earned_at DESC);

-- 16. user_sessions
CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON public.user_sessions (user_id);

-- 17. global_tips
CREATE INDEX IF NOT EXISTS idx_global_tips_published ON public.global_tips (is_published) WHERE is_published = true;

-- 18. program_patients
CREATE INDEX IF NOT EXISTS idx_program_patients_patient_status ON public.program_patients (patient_id, status);

-- 19. engagement_signals
CREATE INDEX IF NOT EXISTS idx_engagement_signals_patient ON public.engagement_signals (patient_id, is_resolved, detected_at DESC);

-- 20. clinical_daily_snapshots
CREATE INDEX IF NOT EXISTS idx_clinical_snapshots_patient_date ON public.clinical_daily_snapshots (patient_id, snapshot_date DESC);

-- 21. behavioral_recovery
CREATE INDEX IF NOT EXISTS idx_behavioral_recovery_patient_created ON public.behavioral_recovery_actions (patient_id, created_at DESC);