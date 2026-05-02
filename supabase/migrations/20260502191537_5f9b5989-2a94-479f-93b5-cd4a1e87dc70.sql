-- Create meal_checkins table
CREATE TABLE IF NOT EXISTS public.meal_checkins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    meal_id UUID NOT NULL, -- Reference to the meal within the meal_plan JSON
    checkin_date DATE NOT NULL DEFAULT CURRENT_DATE,
    completed BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(patient_id, meal_id, checkin_date)
);

-- Enable RLS for checkins
ALTER TABLE public.meal_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients can manage their own meal checkins"
ON public.meal_checkins
FOR ALL
USING (auth.uid() = patient_id)
WITH CHECK (auth.uid() = patient_id);

-- Create usage_logs for product metrics
CREATE TABLE IF NOT EXISTS public.usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL, -- 'login', 'checkin', 'view_dashboard'
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for usage_logs
ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own logs"
ON public.usage_logs
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own logs"
ON public.usage_logs
FOR SELECT
USING (auth.uid() = user_id);

-- Create engagement stats table (Single Source of Truth for progress)
CREATE TABLE IF NOT EXISTS public.patient_engagement_stats (
    patient_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    weekly_adherence_pct NUMERIC(5,2) DEFAULT 0,
    total_checkins INTEGER DEFAULT 0,
    last_checkin_date DATE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for engagement stats
ALTER TABLE public.patient_engagement_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients can view their own stats"
ON public.patient_engagement_stats
FOR SELECT
USING (auth.uid() = patient_id);

-- Function to update engagement stats on check-in
CREATE OR REPLACE FUNCTION public.update_patient_engagement()
RETURNS TRIGGER AS $$
DECLARE
    v_streak INTEGER;
    v_last_date DATE;
BEGIN
    -- Get current stats
    SELECT current_streak, last_checkin_date INTO v_streak, v_last_date
    FROM public.patient_engagement_stats
    WHERE patient_id = NEW.patient_id;

    IF NOT FOUND THEN
        INSERT INTO public.patient_engagement_stats (patient_id, current_streak, last_checkin_date, total_checkins)
        VALUES (NEW.patient_id, 1, NEW.checkin_date, 1);
    ELSE
        -- Update streak logic
        IF v_last_date = NEW.checkin_date - INTERVAL '1 day' THEN
            v_streak := v_streak + 1;
        ELSIF v_last_date < NEW.checkin_date - INTERVAL '1 day' THEN
            v_streak := 1;
        ELSE
            v_streak := v_streak; -- Same day check-in, don't increment streak again
        END IF;

        UPDATE public.patient_engagement_stats
        SET 
            current_streak = v_streak,
            longest_streak = GREATEST(longest_streak, v_streak),
            last_checkin_date = NEW.checkin_date,
            total_checkins = total_checkins + 1,
            updated_at = now()
        WHERE patient_id = NEW.patient_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for engagement updates
CREATE TRIGGER tr_update_engagement_on_checkin
AFTER INSERT ON public.meal_checkins
FOR EACH ROW
EXECUTE FUNCTION public.update_patient_engagement();
