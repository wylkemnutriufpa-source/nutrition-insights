-- Set search_path to public for notify_medical_review_required function
ALTER FUNCTION public.notify_medical_review_required() SET search_path = public;