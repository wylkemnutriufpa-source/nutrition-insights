-- Tabela de configurações de geração de marmitas por nutricionista
CREATE TABLE public.marmita_generation_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nutritionist_id UUID NOT NULL UNIQUE,
  -- Modo Semanal (escalável)
  weekly_min_lunch INTEGER NOT NULL DEFAULT 7,
  weekly_min_dinner INTEGER NOT NULL DEFAULT 7,
  -- Modo Marmitas Fixas (congeladas)
  fixed_min_lunch INTEGER NOT NULL DEFAULT 7,
  fixed_min_dinner INTEGER NOT NULL DEFAULT 7,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT marmita_min_positive CHECK (
    weekly_min_lunch >= 1 AND weekly_min_lunch <= 7 AND
    weekly_min_dinner >= 1 AND weekly_min_dinner <= 7 AND
    fixed_min_lunch >= 1 AND fixed_min_lunch <= 7 AND
    fixed_min_dinner >= 1 AND fixed_min_dinner <= 7
  )
);

ALTER TABLE public.marmita_generation_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Nutritionist can view own marmita settings"
ON public.marmita_generation_settings FOR SELECT
USING (auth.uid() = nutritionist_id);

CREATE POLICY "Nutritionist can insert own marmita settings"
ON public.marmita_generation_settings FOR INSERT
WITH CHECK (auth.uid() = nutritionist_id);

CREATE POLICY "Nutritionist can update own marmita settings"
ON public.marmita_generation_settings FOR UPDATE
USING (auth.uid() = nutritionist_id);

CREATE POLICY "Nutritionist can delete own marmita settings"
ON public.marmita_generation_settings FOR DELETE
USING (auth.uid() = nutritionist_id);

CREATE TRIGGER update_marmita_settings_updated_at
BEFORE UPDATE ON public.marmita_generation_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();