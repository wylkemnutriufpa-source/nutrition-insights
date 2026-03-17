
-- MEALS
CREATE INDEX IF NOT EXISTS idx_meals_user_id ON public.meals (user_id);
CREATE INDEX IF NOT EXISTS idx_meals_user_logged ON public.meals (user_id, logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_meals_created_at ON public.meals (created_at DESC);

-- PHYSICAL_ASSESSMENTS
CREATE INDEX IF NOT EXISTS idx_physical_assessments_patient ON public.physical_assessments (patient_id);
CREATE INDEX IF NOT EXISTS idx_physical_assessments_assessor ON public.physical_assessments (assessor_id);

-- PATIENT_CHECKINS
CREATE INDEX IF NOT EXISTS idx_patient_checkins_patient ON public.patient_checkins (patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_checkins_patient_created ON public.patient_checkins (patient_id, created_at DESC);

-- CHAT_MESSAGES
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender ON public.chat_messages (sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_receiver ON public.chat_messages (receiver_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation ON public.chat_messages (
  LEAST(sender_id, receiver_id), GREATEST(sender_id, receiver_id), created_at DESC
);
CREATE INDEX IF NOT EXISTS idx_chat_messages_unread ON public.chat_messages (receiver_id, is_read) WHERE is_read = false;

-- NOTIFICATIONS
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON public.notifications (user_id, is_read, created_at DESC);

-- PATIENT_APPOINTMENTS
CREATE INDEX IF NOT EXISTS idx_patient_appointments_patient ON public.patient_appointments (patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_appointments_nutritionist ON public.patient_appointments (nutritionist_id);
CREATE INDEX IF NOT EXISTS idx_patient_appointments_date ON public.patient_appointments (appointment_date);

-- PATIENT_PROTOCOLS
CREATE INDEX IF NOT EXISTS idx_patient_protocols_patient ON public.patient_protocols (patient_id);

-- PATIENT_ANAMNESIS
CREATE INDEX IF NOT EXISTS idx_patient_anamnesis_user ON public.patient_anamnesis (user_id);

-- USER_PRESENCE
CREATE INDEX IF NOT EXISTS idx_user_presence_user ON public.user_presence (user_id);
CREATE INDEX IF NOT EXISTS idx_user_presence_online ON public.user_presence (is_online, last_seen_at DESC);

-- MEAL_PLANS
CREATE INDEX IF NOT EXISTS idx_meal_plans_patient_active ON public.meal_plans (patient_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_meal_plans_nutritionist ON public.meal_plans (nutritionist_id);
CREATE INDEX IF NOT EXISTS idx_meal_plans_status ON public.meal_plans (plan_status);

-- RECIPES
CREATE INDEX IF NOT EXISTS idx_recipes_nutritionist ON public.recipes (nutritionist_id);

-- SUBSCRIPTIONS
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON public.subscriptions (user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions (status);

-- USER_SESSIONS
CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON public.user_sessions (user_id);

-- AUTOMATION_RULES
CREATE INDEX IF NOT EXISTS idx_automation_rules_nutritionist ON public.automation_rules (nutritionist_id, is_active);

-- GLOBAL_TIPS
CREATE INDEX IF NOT EXISTS idx_global_tips_published ON public.global_tips (is_published) WHERE is_published = true;

-- PATIENT_TIPS
CREATE INDEX IF NOT EXISTS idx_patient_tips_user ON public.patient_tips (user_id);
