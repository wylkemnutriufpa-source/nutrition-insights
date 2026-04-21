-- Global audit rules config for template nutrition audit (shared by all admins)
CREATE TABLE public.template_audit_rules_config (
  rule_key TEXT NOT NULL PRIMARY KEY,
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'warning', 'ignore')),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID
);

ALTER TABLE public.template_audit_rules_config ENABLE ROW LEVEL SECURITY;

-- Read: any admin
CREATE POLICY "Admins can view audit rules config"
ON public.template_audit_rules_config
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Insert: any admin
CREATE POLICY "Admins can insert audit rules config"
ON public.template_audit_rules_config
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Update: any admin
CREATE POLICY "Admins can update audit rules config"
ON public.template_audit_rules_config
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Delete: any admin
CREATE POLICY "Admins can delete audit rules config"
ON public.template_audit_rules_config
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Auto-update updated_at
CREATE TRIGGER update_template_audit_rules_config_updated_at
BEFORE UPDATE ON public.template_audit_rules_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Realtime so other admins see changes immediately
ALTER PUBLICATION supabase_realtime ADD TABLE public.template_audit_rules_config;