// Edge Function ZMS (Zero Mutation System) — Única porta de entrada para criação de pacientes
// Implementa Event Sourcing + CQRS: Grava evento e projeta estado atômico.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { checkRateLimit, rateLimitResponse } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

type Source = "invite" | "import" | "register" | "lead_convert" | "admin";

interface CreatePatientInput {
  email: string;
  full_name: string;
  phone?: string | null;
  password?: string | null;
  nutritionist_id?: string | null;
  source: Source;
  metadata?: Record<string, unknown>;
  send_magic_link?: boolean;
  request_id?: string; // Idempotência via cliente
}

const randomStrongPassword = () => {
  const a = crypto.randomUUID().replace(/-/g, "");
  return `${a.slice(0, 8)}Aa!${a.slice(8, 14)}`;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Not authenticated" }, 401);

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) return json({ error: "Invalid session" }, 401);

    const body = (await req.json()) as CreatePatientInput;
    const email = String(body.email || "").trim().toLowerCase();
    const fullName = String(body.full_name || "").trim();
    const source = body.source;

    if (!email || !fullName) return json({ error: "email e full_name obrigatórios" }, 400);

    const rl = await checkRateLimit("create-patient", caller.id, 30, 15);
    if (!rl.allowed) return rateLimitResponse();

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 1. Identidade Canônica Absoluta (Auth)
    let patientId: string | null = null;
    const password = body.password || randomStrongPassword();

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, role: "patient" },
    });

    if (createErr) {
      const msg = createErr.message || "";
      const exists = msg.includes("already been registered") || (createErr as any).code === "email_exists";
      if (!exists) return json({ error: msg }, 400);

      // Localizar existente
      const { data: list } = await admin.auth.admin.listUsers();
      const existing = list?.users?.find((u: any) => u.email?.toLowerCase() === email);
      if (!existing) return json({ error: "Usuário existe mas não foi possível localizar" }, 400);
      patientId = existing.id;
    } else {
      patientId = created.user.id;
    }

    if (!patientId) return json({ error: "Falha ao resolver patient_id" }, 500);

    // 2. COMANDO ZMS: append_patient_event (Single Writer)
    // Usamos um request_id único para garantir idempotência atômica no banco
    const requestId = body.request_id || crypto.randomUUID();

    const { data: eventResult, error: eventErr } = await admin.rpc("append_patient_event", {
      _patient_id: patientId,
      _request_id: requestId,
      _event_type: "PATIENT_CREATED",
      _payload: {
        email,
        full_name: fullName,
        phone: body.phone || null,
        nutritionist_id: body.nutritionist_id || null,
        source: source,
        metadata: body.metadata || {},
      },
      _metadata: { caller_id: caller.id, source: "edge_function_zms" }
    });

    if (eventErr) {
      console.error("[ZMS] append_patient_event error:", eventErr);
      return json({ error: `Falha no Single Writer: ${eventErr.message}` }, 500);
    }

    // 3. Side Effects (Assíncronos no conceito, mas síncronos aqui para feedback)
    if (body.send_magic_link) {
      try {
        await admin.auth.admin.generateLink({
          type: "magiclink",
          email,
          options: { redirectTo: `https://www.fitjourney.com.br/` },
        });
      } catch (e) {
        console.log("[ZMS] magic link falhou:", e);
      }
    }

    return json({ 
      success: true, 
      patient_id: patientId, 
      zms: eventResult,
      message: eventResult.status === "idempotent" ? "Comando já processado" : "Paciente criado com sucesso"
    });
  } catch (err: any) {
    console.error("create-patient zms error:", err);
    return json({ error: err.message }, 500);
  }
});
