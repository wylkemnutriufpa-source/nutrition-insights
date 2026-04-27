ALTER TABLE public.invitation_logs ADD COLUMN correlation_id UUID;
CREATE INDEX idx_invitation_logs_correlation_id ON public.invitation_logs(correlation_id);