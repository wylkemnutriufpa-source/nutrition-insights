-- Create invitations table
CREATE TABLE public.invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  professional_id UUID NOT NULL REFERENCES auth.users(id),
  tenant_id UUID REFERENCES public.tenants(id),
  patient_name TEXT,
  patient_email TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- Create policies for invitations
CREATE POLICY "Professionals can manage their own invitations" 
ON public.invitations 
FOR ALL 
USING (auth.uid() = professional_id);

CREATE POLICY "Anyone can view an invitation by code" 
ON public.invitations 
FOR SELECT 
USING (true);

-- Create invitation_logs table
CREATE TABLE public.invitation_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invitation_id UUID REFERENCES public.invitations(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  user_agent TEXT,
  ip_address TEXT,
  domain_used TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.invitation_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for invitation_logs
CREATE POLICY "Professionals can view logs for their invitations" 
ON public.invitation_logs 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.invitations i
  WHERE i.id = invitation_id AND i.professional_id = auth.uid()
));

CREATE POLICY "System can insert logs" 
ON public.invitation_logs 
FOR INSERT 
WITH CHECK (true);

-- Create trigger for automatic timestamp updates on invitations
CREATE TRIGGER update_invitations_updated_at
BEFORE UPDATE ON public.invitations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
