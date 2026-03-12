
-- Add image_url column for image messages
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Quick reply suggestions table (deterministic, no LLM)
CREATE TABLE IF NOT EXISTS public.quick_reply_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_signal TEXT NOT NULL,
  message TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  icon TEXT NOT NULL DEFAULT '💬',
  priority INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.quick_reply_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read quick replies"
  ON public.quick_reply_templates FOR SELECT
  TO authenticated USING (true);

-- Seed quick reply templates
INSERT INTO public.quick_reply_templates (trigger_signal, message, category, icon, priority) VALUES
  ('general', 'Olá! Como posso te ajudar hoje? 😊', 'greeting', '👋', 10),
  ('general', 'Parabéns pela evolução! Continue assim 👏', 'motivation', '🎉', 9),
  ('low_adherence', 'Percebi que ontem foi um dia difícil. Tudo bem, vamos retomar hoje! 💪', 'adherence', '📋', 8),
  ('low_adherence', 'Vi que a adesão caiu um pouco. Quer que ajustemos algo no plano?', 'adherence', '🔄', 7),
  ('good_progress', 'Seus resultados estão excelentes! O plano está funcionando bem 🌟', 'motivation', '⭐', 8),
  ('good_progress', 'Parabéns pela consistência! Isso faz toda a diferença 🏆', 'motivation', '🏆', 7),
  ('weight_stagnation', 'Percebi uma estabilização no peso. Vamos analisar juntos?', 'clinical', '📊', 8),
  ('hydration', 'Vamos ajustar sua hidratação hoje? É essencial para os resultados 💧', 'hydration', '💧', 6),
  ('meal_skip', 'Notei que pulou algumas refeições. Quer conversar sobre isso?', 'nutrition', '🍽️', 7),
  ('checkin_pending', 'Quando puder, faça seu check-in semanal. É importante para acompanharmos! 📸', 'reminder', '📸', 6),
  ('general', 'Tem alguma dúvida sobre o plano alimentar? Estou aqui!', 'support', '🤝', 5),
  ('general', 'Lembre-se: pequenos hábitos diários constroem grandes resultados! 🚀', 'motivation', '🚀', 4);
