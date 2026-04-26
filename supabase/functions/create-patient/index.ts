// Edge Function CANÔNICA — única autorizada a criar pacientes
// Substitui chamadas diretas a auth.users e RPCs legadas
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
  password?: string | null;        // se ausente, gera senha aleatória forte
  nutritionist_id?: string | null; // opcional; obrigatório quando source != 'admin'
  source: Source;
  metadata?: Record<string, unknown>;
  send_magic_link?: boolean;
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

    const rl = await checkRateLimit("create-patient", caller.id, 30, 15);
    if (!rl.allowed) return rateLimitResponse();

    const body = (await req.json()) as CreatePatientInput;
    const email = String(body.email || "").trim().toLowerCase();
    const fullName = String(body.full_name || "").trim();
    const source = body.source;

    if (!email || !fullName) return json({ error: "email e full_name obrigatórios" }, 400);
    if (!["invite", "import", "register", "lead_convert", "admin"].includes(source)) {
      return json({ error: "source inválido" }, 400);
    }

    // Autorização por source
    const { data: callerRoles } = await callerClient
      .from("user_roles").select("role").eq("user_id", caller.id);
    const roles = (callerRoles || []).map((r: any) => r.role);
    const isPro = roles.some((r: string) => ["nutritionist", "personal", "admin"].includes(r));

    if (source === "register") {
      // Auto-cadastro: nutricionista é OPCIONAL — sem nutri o front cria lead, não chama esta função
      if (!body.nutritionist_id) {
        return json({ error: "Auto-cadastro sem nutricionista deve gerar lead, não paciente" }, 400);
      }
    } else if (!isPro) {
      return json({ error: "Apenas profissionais podem criar pacientes" }, 403);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 1. Criar / localizar usuário em auth.users (via GoTrue admin API)
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
      const { data: foundId } = await admin.rpc("find_patient_by_email" as any, { _email: email });
      if (foundId) {
        patientId = foundId as string;
      } else {
        const { data: list } = await admin.auth.admin.listUsers();
        const existing = list?.users?.find((u: any) => u.email?.toLowerCase() === email);
        if (!existing) return json({ error: "Usuário existe mas não foi possível localizar" }, 400);
        patientId = existing.id;
      }
    } else {
      patientId = created.user.id;
    }

    if (!patientId) return json({ error: "Falha ao resolver patient_id" }, 500);

    // 2. RPC canônica (cria profile + role + tenant + vínculo + pipeline + lifecycle + log)
    const { data: result, error: rpcErr } = await admin.rpc("create_patient_canonical" as any, {
      _patient_id: patientId,
      _full_name: fullName,
      _email: email,
      _phone: body.phone || null,
      _nutritionist_id: body.nutritionist_id || null,
      _source: source,
      _metadata: body.metadata || {},
    });

    if (rpcErr) {
      console.error("[create-patient] RPC canonical error:", rpcErr);
      return json({ error: `Falha na canônica: ${rpcErr.message}` }, 500);
    }

    // 3. Notificação de boas-vindas
    try {
      await admin.from("notifications").insert({
        user_id: patientId,
        title: "Bem-vindo ao FitJourney! 🎉",
        message: "Seu acesso foi criado. Aguarde a liberação do acompanhamento.",
        type: "info",
        target_route: "/patient-dashboard",
      });
    } catch (_) {}

    // 4. Magic link opcional
    if (body.send_magic_link) {
      try {
        await admin.auth.admin.generateLink({
          type: "magiclink",
          email,
          options: { redirectTo: `https://www.fitjourney.com.br/` },
        });
      } catch (e) {
        console.log("[create-patient] magic link falhou:", e);
      }
    }

    return json({ success: true, patient_id: patientId, canonical: result });
  } catch (err: any) {
    console.error("create-patient error:", err);
    return json({ error: err.message }, 500);
  }
});
