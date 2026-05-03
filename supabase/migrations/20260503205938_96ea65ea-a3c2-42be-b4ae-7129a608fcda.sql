-- Create meal_plan_jobs table
CREATE TABLE public.meal_plan_jobs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    result JSONB DEFAULT '{}'::jsonb,
    error TEXT,
    current_step TEXT DEFAULT 'iniciando',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.meal_plan_jobs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Patients can view their own jobs" 
ON public.meal_plan_jobs 
FOR SELECT 
USING (auth.uid() = patient_id);

CREATE POLICY "Patients can insert their own jobs" 
ON public.meal_plan_jobs 
FOR INSERT 
WITH CHECK (auth.uid() = patient_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_meal_plan_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_meal_plan_jobs_updated_at
BEFORE UPDATE ON public.meal_plan_jobs
FOR EACH ROW
EXECUTE FUNCTION public.update_meal_plan_jobs_updated_at();

-- Enable Realtime for the table
ALTER PUBLICATION supabase_realtime ADD TABLE public.meal_plan_jobs;
