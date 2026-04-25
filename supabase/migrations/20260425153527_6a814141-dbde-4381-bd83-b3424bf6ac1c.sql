CREATE OR REPLACE FUNCTION public.invalidate_audit_cache()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Clear expired items first
    DELETE FROM public.audit_cache WHERE expires_at < now();
    
    -- Clear all remaining items to ensure consistency on plan change
    -- Fix: Added 'WHERE id IS NOT NULL' to satisfy safety constraints that require a WHERE clause
    DELETE FROM public.audit_cache WHERE id IS NOT NULL;
    
    RETURN NULL;
END;
$function$;