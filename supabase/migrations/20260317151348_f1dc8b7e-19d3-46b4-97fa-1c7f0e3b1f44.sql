
-- Add metabolic response classification to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS metabolic_response_type text DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS historical_loss_rate numeric,
  ADD COLUMN IF NOT EXISTS regain_probability numeric,
  ADD COLUMN IF NOT EXISTS plateau_probability numeric,
  ADD COLUMN IF NOT EXISTS behavioral_consistency_score numeric,
  ADD COLUMN IF NOT EXISTS weight_history_analyzed_at timestamptz;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.metabolic_response_type IS 'rapid_responder | slow_responder | plateau_prone | weight_cycler | stable_maintainer | unknown';
