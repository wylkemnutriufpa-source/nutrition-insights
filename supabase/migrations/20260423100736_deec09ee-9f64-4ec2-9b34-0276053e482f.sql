-- Hardening the lifecycle function with an explicit search_path
ALTER FUNCTION public.resolve_patient_lifecycle_state(UUID) SET search_path = public;
