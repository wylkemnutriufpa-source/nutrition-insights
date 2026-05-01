import { z } from "npm:zod";
import { getCorsHeaders } from "./cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Shared validator for Edge Functions.
 * Validates request body against a Zod schema and returns a Response if invalid.
 * Returns the parsed data if valid.
 */
export async function validateBody<T>(req: Request, schema: z.ZodSchema<T>): Promise<{ data?: T; response?: Response }> {
  const origin = req.headers.get("Origin");
  const corsHeaders = getCorsHeaders(origin);
  
  try {
    const body = await req.json();
    const result = schema.safeParse(body);
    
    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;
      
      // Log validation failure
      const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      await supabase.rpc("log_security_event", {
        p_event_type: "schema_validation_failed",
        p_severity: "warning",
        p_message: "Payload de entrada inválido detectado pelo Zod",
        p_metadata: { errors, body_keys: Object.keys(body) }
      });

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
