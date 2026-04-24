DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'plan_mode_type') THEN
    CREATE TYPE public.plan_mode_type AS ENUM ('weekly', 'single_day');
  END IF;
END $$;

ALTER TABLE public.meal_plans 
ADD COLUMN IF NOT EXISTS plan_mode public.plan_mode_type DEFAULT 'weekly' NOT NULL;
