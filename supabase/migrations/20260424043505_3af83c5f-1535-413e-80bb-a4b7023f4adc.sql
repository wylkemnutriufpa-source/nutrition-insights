-- Enable RLS on system_config (global config table)
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read global config
CREATE POLICY "Authenticated users can read system_config"
ON public.system_config
FOR SELECT
TO authenticated
USING (true);

-- Only admins can insert
CREATE POLICY "Admins can insert system_config"
ON public.system_config
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Only admins can update
CREATE POLICY "Admins can update system_config"
ON public.system_config
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Only admins can delete
CREATE POLICY "Admins can delete system_config"
ON public.system_config
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));