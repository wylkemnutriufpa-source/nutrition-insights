ALTER TABLE public.marmita_generation_settings 
ADD COLUMN IF NOT EXISTS default_practical_instructions TEXT DEFAULT '⏱️ Prática: Aqueça por 3-5 min no micro-ondas.',
ADD COLUMN IF NOT EXISTS default_fast_instructions TEXT DEFAULT '⚡ MODO RÁPIDO: Aqueça por apenas 2-3 min. Refeição otimizada para tempo.';
