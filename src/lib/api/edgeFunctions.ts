import { supabase } from "@/integrations/supabase/client";
import { withRetry } from "@/lib/retry";

export async function invokeWithRetry(
  functionName: string,
  options: {
    body?: any;
    headers?: Record<string, string>;
  } = {},
  retryOptions: {
    maxRetries?: number;
    initialDelay?: number;
  } = {}
) {
  return withRetry(
    async () => {
      const { data, error } = await supabase.functions.invoke(functionName, options);
      
      if (error) {
        // Only retry on network/timeout errors (FunctionsFetchError has no status)
        // FunctionsHttpError with 5xx might also be retried
        const isNetworkError = error.name === 'FunctionsFetchError' || error.name === 'FunctionsRelayError';
        const isRetryableHttpStatus = (error as any).status >= 500;
        
        if (isNetworkError || isRetryableHttpStatus) {
          throw error;
        }
        
        // For other errors (4xx), return them to the caller to handle business logic
        return { data, error };
      }
      
      return { data, error };
    },
    {
      maxRetries: retryOptions.maxRetries ?? 3,
      initialDelay: retryOptions.initialDelay ?? 1000,
      onRetry: (attempt, err) => {
        console.warn(`[EdgeFunctionRetry] Attempt ${attempt} for ${functionName} failed:`, err);
      }
    }
  );
}
