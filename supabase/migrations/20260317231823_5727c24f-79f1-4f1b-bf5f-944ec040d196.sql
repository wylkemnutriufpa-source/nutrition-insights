
INSERT INTO public.feature_registry (feature_key, name, short_description, category, emoji, icon_name, gradient, status, target_audience, experience_type, journey_phase, emotional_impact)
VALUES
  ('web_push_notifications', 'Notificações Push', 'Receba alertas em tempo real no celular, mesmo com o app fechado.', 'experience_engagement', '🔔', 'Bell', 'from-emerald-500 to-teal-600', 'active', 'patient', 'feature', 'start', 'high'),
  ('pwa_offline', 'Modo Offline', 'Acesse seus dados mesmo sem internet. Seus planos e checklist ficam salvos.', 'experience_engagement', '📡', 'WifiOff', 'from-blue-500 to-indigo-600', 'active', 'patient', 'feature', 'start', 'medium'),
  ('meal_plan_versioning', 'Histórico de Planos', 'Veja todas as versões anteriores do seu plano alimentar.', 'clinical_intelligence', '📋', 'History', 'from-violet-500 to-purple-600', 'active', 'professional', 'monitoring', 'consolidation', 'medium')
ON CONFLICT (feature_key) DO NOTHING;
