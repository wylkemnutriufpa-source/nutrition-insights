import { supabase } from "@/integrations/supabase/client";

/**
 * Invoke an edge function without automatic retries.
 * Predictable behavior: it either works or fails.
 */
export async function invokeWithRetry(
  functionName: string,
  options: {
    body?: any;
    headers?: Record<string, string>;
  } = {}
) {
  const { data, error } = await supabase.functions.invoke(functionName, options);
  
  if (error) {
    console.error(`[EdgeFunction] Call to ${functionName} failed:`, error);
  }
  
  return { data, error };
}
