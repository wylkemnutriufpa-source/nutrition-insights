
-- Rate limiting table for edge functions
CREATE TABLE IF NOT EXISTS public.edge_function_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name text NOT NULL,
  client_key text NOT NULL,
  request_count integer NOT NULL DEFAULT 1,
  window_start timestamptz NOT NULL DEFAULT now(),
  UNIQUE(function_name, client_key)
);

-- No RLS needed - accessed only via service role from edge functions
ALTER TABLE public.edge_function_rate_limits ENABLE ROW LEVEL SECURITY;

-- Cleanup old entries (runs on each check)
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  _function_name text,
  _client_key text,
  _max_requests integer,
  _window_seconds integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _record record;
  _now timestamptz := now();
BEGIN
  -- Clean expired windows
  DELETE FROM public.edge_function_rate_limits
  WHERE window_start < _now - (_window_seconds || ' seconds')::interval;

  -- Try to get existing record
  SELECT * INTO _record FROM public.edge_function_rate_limits
  WHERE function_name = _function_name AND client_key = _client_key;

  IF NOT FOUND THEN
    INSERT INTO public.edge_function_rate_limits (function_name, client_key, request_count, window_start)
    VALUES (_function_name, _client_key, 1, _now);
    RETURN true;
  END IF;

  -- Check if window expired
  IF _record.window_start < _now - (_window_seconds || ' seconds')::interval THEN
    UPDATE public.edge_function_rate_limits
    SET request_count = 1, window_start = _now
    WHERE function_name = _function_name AND client_key = _client_key;
    RETURN true;
  END IF;

  -- Check limit
  IF _record.request_count >= _max_requests THEN
    RETURN false;
  END IF;

  -- Increment
  UPDATE public.edge_function_rate_limits
  SET request_count = request_count + 1
  WHERE function_name = _function_name AND client_key = _client_key;
  RETURN true;
END;
$$;
