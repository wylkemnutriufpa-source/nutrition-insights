
ALTER TABLE public.meal_item_completions 
ADD COLUMN IF NOT EXISTS adherence_status text NOT NULL DEFAULT 'followed';

COMMENT ON COLUMN public.meal_item_completions.adherence_status IS 'followed, partial, not_followed';
