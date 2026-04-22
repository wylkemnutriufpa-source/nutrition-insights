import { z } from "npm:zod";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2/cors";

/**
 * Shared validator for Edge Functions.
 * Validates request body against a Zod schema and returns a Response if invalid.
 * Returns the parsed data if valid.
 */
export async function validateBody<T>(req: Request, schema: z.ZodSchema<T>): Promise<{ data?: T; response?: Response }> {
  try {
    const body = await req.json();
    const result = schema.safeParse(body);
    
    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;
      return {
        response: new Response(
          JSON.stringify({ 
            error: "Payload de entrada inválido", 
            code: "INVALID_INPUT", 
            details: errors 
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          }
        )
      };
    }
    
    return { data: result.data };
  } catch (e) {
    return {
      response: new Response(
        JSON.stringify({ 
          error: "Corpo da requisição deve ser um JSON válido", 
          code: "MALFORMED_JSON" 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      )
    };
  }
}
