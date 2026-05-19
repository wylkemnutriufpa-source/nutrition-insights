CREATE TABLE public.template_application_tests (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    template_id UUID,
    template_name TEXT,
    version TEXT,
    status TEXT,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.template_application_tests ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins can view test results"
ON public.template_application_tests
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete test results"
ON public.template_application_tests
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert test results"
ON public.template_application_tests
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
