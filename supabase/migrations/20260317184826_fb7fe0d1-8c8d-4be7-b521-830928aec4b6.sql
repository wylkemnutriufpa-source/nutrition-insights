
-- Fix: Insert point rules with correct columns
INSERT INTO public.ranking_point_rules (action_key, action_label, points, daily_limit, icon, is_active)
VALUES
  ('projection_elite_match', 'Projeção atingida com 90%+ precisão', 100, 1, '🎯', true),
  ('projection_achieved', 'Projeção atingida com 70%+ precisão', 50, 1, '✨', true)
ON CONFLICT (action_key) DO NOTHING;
