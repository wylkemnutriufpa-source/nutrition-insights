ALTER TABLE public.v3_drafts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS v3_drafts_updated_at_trigger ON public.v3_drafts;

CREATE TRIGGER v3_drafts_updated_at_trigger
BEFORE UPDATE ON public.v3_drafts
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();