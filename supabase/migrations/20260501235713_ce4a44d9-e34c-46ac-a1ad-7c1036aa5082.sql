-- Create access_logs table for LGPD/Security auditing
CREATE TABLE IF NOT EXISTS public.access_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    patient_id UUID REFERENCES public.profiles(id), -- Using profiles since it holds the patient data
    action TEXT NOT NULL, -- view, edit, export, delete
    resource TEXT NOT NULL, -- meal_plan, draft, patient_profile
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    tenant_id UUID -- For multi-tenant isolation
);

-- Enable RLS on access_logs
ALTER TABLE public.access_logs ENABLE ROW LEVEL SECURITY;

-- Policies for access_logs
CREATE POLICY "Admins can view all access logs"
ON public.access_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND (profiles.current_editor_mode = 'admin' OR profiles.fit_intelligence_access_mode = 'admin')
  )
);

CREATE POLICY "Users can see logs they generated"
ON public.access_logs
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "System can insert logs"
ON public.access_logs
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Update profiles table for LGPD compliance (representing patients/users)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS consent_given BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS consent_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS compliance_mode BOOLEAN DEFAULT true;

-- Function to handle patient data anonymization (Right to be Forgotten)
-- This targets the profile record
CREATE OR REPLACE FUNCTION public.anonymize_profile_data(target_profile_id UUID)
RETURNS VOID AS $$
BEGIN
    -- Update profile info to remove PII
    UPDATE public.profiles
    SET 
        full_name = 'ANONYMIZED_' || substr(id::text, 1, 8),
        phone = NULL,
        whatsapp = NULL,
        avatar_url = NULL,
        notes = 'Data anonymized per user request under LGPD/Right to be Forgotten.'
    WHERE id = target_profile_id;

    -- Log the anonymization action
    INSERT INTO public.access_logs (user_id, patient_id, action, resource)
    VALUES (auth.uid(), target_profile_id, 'anonymize', 'patient_profile');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_access_logs_patient ON public.access_logs(patient_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_user ON public.access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_created_at ON public.access_logs(created_at);