/**
 * Edge Function Error Helper
 * Extracts meaningful error messages from supabase.functions.invoke() responses.
 * 
 * When an edge function returns a non-2xx status, supabase-js wraps it in a
 * FunctionsHttpError with a generic message. This helper extracts the actual
 * response body to get our custom error codes and messages.
 */

import { mapSupabaseError, friendlySupabaseError } from "./supabaseErrorMapper";

interface EdgeFunctionErrorDetail {
  error: string;
  code?: string;
  details?: string;
}

/**
 * Extract the actual error body from a supabase.functions.invoke error.
 * Handles FunctionsHttpError, FunctionsRelayError, and generic errors.
 */
export async function extractEdgeFunctionError(
  error: unknown
): Promise<EdgeFunctionErrorDetail> {
  // FunctionsHttpError has a context property with the Response object
  if (error && typeof error === "object") {
    const err = error as any;
    
    // Try to get the response body from context (FunctionsHttpError)
    if (err.context && typeof err.context.json === "function") {
      try {
        const body = await err.context.json();
        if (body?.error) {
          return {
            error: body.error,
            code: body.code || undefined,
            details: body.details || undefined,
          };
        }
      } catch {
        // JSON parsing failed, try text
        try {
          const text = await err.context.text();
          if (text) return { error: text };
        } catch {
          // ignore
        }
      }
    }

    // Standard error with message
    if (err.message && typeof err.message === "string") {
      return { error: err.message };
    }
  }

  return { error: "Erro desconhecido" };
}

/**
 * Get a user-friendly error message from an edge function error.
 * First checks against our error mapper, then falls back to the raw message.
 */
export async function friendlyEdgeFunctionError(
  error: unknown,
  fallback = "Erro ao processar. Tente novamente."
): Promise<string> {
  const detail = await extractEdgeFunctionError(error);
  
  // Check against the centralized error mapper
  const mapped = mapSupabaseError({ message: detail.code || detail.error });
  if (mapped) return mapped.userMessage;
  
  // Use the raw error message if it's reasonably short
  if (detail.error && detail.error.length < 200) return detail.error;
  
  return fallback;
}
