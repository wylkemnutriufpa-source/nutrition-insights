import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { instance_id, api_token, phone_number, action } = body;

    // Action: validate credentials with Z-API
    if (action === "validate") {
      if (!instance_id || !api_token) {
        return new Response(JSON.stringify({ error: "instance_id e token são obrigatórios" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Test the Z-API connection by checking instance status
      const statusUrl = `https://api.z-api.io/instances/${instance_id}/token/${api_token}/status`;
      let zapiResponse: Response;
      try {
        zapiResponse = await fetch(statusUrl, { method: "GET" });
      } catch (fetchErr) {
        return new Response(JSON.stringify({
          valid: false,
          error: "Não foi possível conectar à Z-API. Verifique a URL e tente novamente.",
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const zapiData = await zapiResponse.json();

      if (!zapiResponse.ok) {
        return new Response(JSON.stringify({
          valid: false,
          error: `Z-API retornou erro (${zapiResponse.status}): ${JSON.stringify(zapiData)}`,
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check if instance is connected
      const isConnected = zapiData?.connected === true || zapiData?.status === "CONNECTED";
      const phoneFromApi = zapiData?.phone || zapiData?.phoneNumber || null;

      return new Response(JSON.stringify({
        valid: true,
        connected: isConnected,
        phone: phoneFromApi,
        raw_status: zapiData,
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action: save validated credentials
    if (action === "save") {
      if (!instance_id || !api_token) {
        return new Response(JSON.stringify({ error: "instance_id e token são obrigatórios" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Validate credentials with Z-API before saving
      const statusUrl = `https://api.z-api.io/instances/${instance_id}/token/${api_token}/status`;
      let isValid = false;
      let lastError: string | null = null;

      try {
        const resp = await fetch(statusUrl, { method: "GET" });
        const data = await resp.json();
        isValid = resp.ok && (data?.connected === true || data?.status === "CONNECTED");
        if (!isValid) {
          lastError = `Instância não conectada: ${JSON.stringify(data)}`;
        }
      } catch {
        lastError = "Falha ao validar com Z-API";
      }

      // Store token in Vault (encrypted)
      await supabase.rpc("store_whatsapp_token", {
        _professional_id: user.id,
        _token: api_token,
      });

      // Upsert integration metadata (no token in table)
      const { data: existing } = await supabase
        .from("whatsapp_integrations")
        .select("id")
        .eq("professional_id", user.id)
        .maybeSingle();

      const integrationData = {
        instance_id,
        phone_number: phone_number || null,
        is_active: isValid,
        connection_validated_at: isValid ? new Date().toISOString() : null,
        last_error: lastError,
        updated_at: new Date().toISOString(),
      };

      if (existing) {
        const { error } = await supabase
          .from("whatsapp_integrations")
          .update(integrationData)
          .eq("professional_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("whatsapp_integrations")
          .insert({
            professional_id: user.id,
            provider: "zapi",
            ...integrationData,
          });
        if (error) throw error;
      }

      return new Response(JSON.stringify({
        success: true,
        validated: isValid,
        error: lastError,
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Ação inválida" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("WhatsApp validate error:", error);
    return new Response(JSON.stringify({ error: "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
