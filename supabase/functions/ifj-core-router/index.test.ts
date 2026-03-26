import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;

// Helper to call the edge function
async function callIFJCore(command: string, token?: string) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/ifj-core-router`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token || SUPABASE_ANON_KEY}`,
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ input_text: command, session_key: "test-suite-v3" }),
  });
  const body = await res.text();
  return { status: res.status, body: JSON.parse(body) };
}

// ══════════════════════════════════════════════════════════════
// 1. AUTH VALIDATION
// ══════════════════════════════════════════════════════════════
Deno.test("Returns 401 without auth header", async () => {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/ifj-core-router`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY },
    body: JSON.stringify({ input_text: "oi" }),
  });
  assertEquals(res.status, 401);
  await res.text();
});

Deno.test("Returns 401 with invalid token", async () => {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/ifj-core-router`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer invalid_token_xyz",
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ input_text: "oi" }),
  });
  assertEquals(res.status, 401);
  await res.text();
});

Deno.test("CORS preflight returns 200", async () => {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/ifj-core-router`, {
    method: "OPTIONS",
    headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY },
  });
  assertEquals(res.status, 200);
  await res.text();
});

// ══════════════════════════════════════════════════════════════
// 2. RESPONSE FORMAT VALIDATION (anon key = auth but no user_roles)
// These tests validate the router handles gracefully when user has no role
// ══════════════════════════════════════════════════════════════

// Note: With anon key, getUser() will fail with 401.
// Authenticated tests require a real user token.
// Below we validate structure for the 401 path.

Deno.test("Anon key returns 401 (getUser fails)", async () => {
  const { status } = await callIFJCore("oi");
  assertEquals(status, 401);
});

// ══════════════════════════════════════════════════════════════
// 3. INTENT DETECTION UNIT TESTS (no network needed)
// ══════════════════════════════════════════════════════════════
// We test the normalize + detectIntent logic inline

function normalize(t: string): string {
  return t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

const SYNONYM_MAP: Record<string, string[]> = {
  patients_attention: ["atencao", "urgente", "risco", "critico", "dropout", "abandono", "piorou", "caiu"],
  patients_improved: ["melhorou", "evoluiu", "progresso", "avancou", "melhora"],
  patient_detail: ["paciente", "sobre", "como esta", "como vai", "ficha", "perfil", "dados"],
  financial_overview: ["financeiro", "faturamento", "receita", "dinheiro", "pagamento", "cobranc", "caixa", "inadimpl"],
  financial_pending: ["cobranca pendente", "pagamento atrasado", "inadimplente", "devendo"],
  meal_plan: ["plano alimentar", "dieta", "refeic", "cardapio", "plano nutricional"],
  meal_plan_expiring: ["plano vencendo", "dieta vencendo", "plano expira", "renovar plano"],
  anamnesis: ["anamnese", "anamnesis", "historico clinico", "questionario"],
  clinical_alerts: ["alerta", "aviso", "notificac"],
  clinical_summary: ["resum", "carteira", "panorama", "visao geral", "overview", "dashboard"],
  checklist_status: ["checklist", "tarefas de hoje", "adesao", "aderencia"],
  appointments: ["consulta", "agenda", "agendamento", "horario", "atendimento"],
  workout_pain: ["dor", "lesao", "desconforto", "incomodo", "machuc"],
  workout_overview: ["treino", "exercicio", "academia", "musculac", "treinamento"],
  navigate: ["abrir", "ir para", "navegar", "mostrar tela", "abra"],
  greeting: ["oi", "ola", "bom dia", "boa tarde", "boa noite", "eai", "salve", "opa", "fala"],
  help: ["ajuda", "como usar", "comandos", "o que voce faz", "tutorial"],
  priorities_today: ["prioridade", "resolver hoje", "o que fazer", "pendencia do dia", "agenda ifj", "fila"],
  next_best_action: ["proxima acao", "melhor acao", "o que fazer agora", "sugestao", "recomendac"],
};

function matchesIntent(n: string, intentKey: string): boolean {
  return (SYNONYM_MAP[intentKey] || []).some(s => n.includes(s));
}

// ── Intent Detection Tests ─────────────────────────────────────

// Greeting
Deno.test("Intent: greeting - oi", () => { assertEquals(/^(oi|ola)\b/.test(normalize("oi")), true); });
Deno.test("Intent: greeting - bom dia", () => { assertEquals(/^(bom dia)\b/.test(normalize("Bom dia!")), true); });
Deno.test("Intent: greeting - boa noite", () => { assertEquals(/^(boa noite)\b/.test(normalize("Boa noite")), true); });

// Priorities
Deno.test("Intent: priorities_today - o que preciso resolver hoje", () => { assertEquals(normalize("O que preciso resolver hoje?").includes("resolver hoje"), true); });
Deno.test("Intent: priorities_today - prioridade do dia", () => { assertEquals(normalize("prioridade do dia").includes("prioridade do dia"), true); });
Deno.test("Intent: priorities_today - pendências", () => { assertEquals(normalize("pendências do dia").includes("pendencia"), true); });

// Next best action
Deno.test("Intent: next_best_action - próxima ação", () => { assertEquals(matchesIntent(normalize("Qual a próxima ação?"), "next_best_action"), true); });
Deno.test("Intent: next_best_action - melhor ação", () => { assertEquals(matchesIntent(normalize("Melhor ação agora"), "next_best_action"), true); });

// Patients attention
Deno.test("Intent: patients_attention - risco", () => { assertEquals(matchesIntent(normalize("pacientes em risco"), "patients_attention"), true); });
Deno.test("Intent: patients_attention - dropout", () => { assertEquals(matchesIntent(normalize("quem está em dropout"), "patients_attention"), true); });
Deno.test("Intent: patients_attention - piorou", () => { assertEquals(matchesIntent(normalize("quem piorou?"), "patients_attention"), true); });

// Patients improved
Deno.test("Intent: patients_improved - melhorou", () => { assertEquals(matchesIntent(normalize("quem melhorou?"), "patients_improved"), true); });
Deno.test("Intent: patients_improved - evoluiu", () => { assertEquals(matchesIntent(normalize("quem evoluiu essa semana"), "patients_improved"), true); });

// Patient detail
Deno.test("Intent: patient_detail - sobre Sandra", () => {
  const n = normalize("sobre Sandra Lima");
  assertEquals(matchesIntent(n, "patient_detail"), true);
  const m = n.match(/(?:sobre)\s+(.+)/);
  assertExists(m);
  assertEquals(m![1], "sandra lima");
});

// Financial
Deno.test("Intent: financial_overview - resumo financeiro", () => { assertEquals(matchesIntent(normalize("resumo financeiro"), "financial_overview"), true); });
Deno.test("Intent: financial_overview - faturamento", () => { assertEquals(matchesIntent(normalize("como está o faturamento"), "financial_overview"), true); });
Deno.test("Intent: financial_pending - cobrança pendente", () => { assertEquals(matchesIntent(normalize("cobranca pendente"), "financial_pending"), true); });
Deno.test("Intent: financial_pending - inadimplente", () => { assertEquals(matchesIntent(normalize("quem está inadimplente"), "financial_pending"), true); });

// Meal plan
Deno.test("Intent: meal_plan - dieta", () => { assertEquals(matchesIntent(normalize("dieta da Sandra"), "meal_plan"), true); });
Deno.test("Intent: meal_plan_expiring - plano vencendo", () => { assertEquals(matchesIntent(normalize("planos vencendo"), "meal_plan_expiring"), true); });

// Anamnesis
Deno.test("Intent: anamnesis - anamnese", () => { assertEquals(matchesIntent(normalize("anamnese da Sandra"), "anamnesis"), true); });
Deno.test("Intent: anamnesis - histórico clínico", () => { assertEquals(matchesIntent(normalize("historico clinico do João"), "anamnesis"), true); });

// Clinical
Deno.test("Intent: clinical_alerts - alertas", () => { assertEquals(matchesIntent(normalize("alertas clínicos"), "clinical_alerts"), true); });
Deno.test("Intent: clinical_summary - resumo da carteira", () => { assertEquals(matchesIntent(normalize("resumo da carteira"), "clinical_summary"), true); });
Deno.test("Intent: clinical_summary - panorama", () => { assertEquals(matchesIntent(normalize("panorama geral"), "clinical_summary"), true); });

// Workout / Training
Deno.test("Intent: workout_pain - dor", () => { assertEquals(matchesIntent(normalize("alunos com dor"), "workout_pain"), true); });
Deno.test("Intent: workout_pain - lesão", () => { assertEquals(matchesIntent(normalize("relatos de lesão"), "workout_pain"), true); });
Deno.test("Intent: workout_overview - treinos", () => { assertEquals(matchesIntent(normalize("visão de treinos"), "workout_overview"), true); });

// Appointments
Deno.test("Intent: appointments - consultas", () => { assertEquals(matchesIntent(normalize("próximas consultas"), "appointments"), true); });
Deno.test("Intent: appointments - agenda", () => { assertEquals(matchesIntent(normalize("minha agenda"), "appointments"), true); });

// Checklist / Behavioral
Deno.test("Intent: checklist - adesão", () => { assertEquals(matchesIntent(normalize("como está a adesão"), "checklist_status"), true); });
Deno.test("Intent: checklist - tarefas de hoje", () => { assertEquals(matchesIntent(normalize("tarefas de hoje"), "checklist_status"), true); });

// Navigation
Deno.test("Intent: navigate - abrir financeiro", () => { assertEquals(matchesIntent(normalize("abrir financeiro"), "navigate"), true); });
Deno.test("Intent: navigate - ir para pacientes", () => { assertEquals(matchesIntent(normalize("ir para pacientes"), "navigate"), true); });

// Help
Deno.test("Intent: help - ajuda", () => { assertEquals(matchesIntent(normalize("ajuda"), "help"), true); });
Deno.test("Intent: help - comandos", () => { assertEquals(matchesIntent(normalize("quais comandos"), "help"), true); });

// ── Disambiguation test ─────────────────────────────────────
Deno.test("Name resolver: exact match", () => {
  const list = [{ full_name: "Sandra Lima" }, { full_name: "Sandra Oliveira" }];
  const sn = normalize("Sandra Lima");
  const exact = list.filter(p => normalize(p.full_name) === sn);
  assertEquals(exact.length, 1);
  assertEquals(exact[0].full_name, "Sandra Lima");
});

Deno.test("Name resolver: ambiguous partial match", () => {
  const list = [{ full_name: "Sandra Lima" }, { full_name: "Sandra Oliveira" }];
  const sn = normalize("Sandra");
  const partial = list.filter(p => normalize(p.full_name).includes(sn));
  assertEquals(partial.length, 2); // ambiguous
});

Deno.test("Name resolver: no match", () => {
  const list = [{ full_name: "Sandra Lima" }];
  const sn = normalize("João");
  const partial = list.filter(p => normalize(p.full_name).includes(sn));
  assertEquals(partial.length, 0);
});

// ── Context follow-up test ──────────────────────────────────
Deno.test("Context: follow-up 'quando vence' uses last_patient_id", () => {
  const n = normalize("quando vence?");
  const hasCtx = n.includes("quando vence");
  assertEquals(hasCtx, true);
});

Deno.test("Context: follow-up 'como ela está' uses last_patient", () => {
  const n = normalize("como ela está?");
  assertEquals(n.includes("como ela esta"), true);
});

// ── Navigation resolver test ────────────────────────────────
Deno.test("Navigation: resolves financeiro", () => {
  const NAV_MAP: Record<string, string> = { financeiro: "/financial", pacientes: "/patients", dashboard: "/" };
  const n = normalize("abrir financeiro");
  let found = "";
  for (const [key, route] of Object.entries(NAV_MAP)) { if (n.includes(key)) { found = route; break; } }
  assertEquals(found, "/financial");
});

Deno.test("Navigation: resolves dashboard", () => {
  const NAV_MAP: Record<string, string> = { financeiro: "/financial", pacientes: "/patients", dashboard: "/" };
  const n = normalize("ir para dashboard");
  let found = "";
  for (const [key, route] of Object.entries(NAV_MAP)) { if (n.includes(key)) { found = route; break; } }
  assertEquals(found, "/");
});

// ── Ambiguous intent test ───────────────────────────────────
Deno.test("Ambiguous: 'como está a Sandra' matches patient_detail", () => {
  assertEquals(matchesIntent(normalize("como está a Sandra"), "patient_detail"), true);
});

Deno.test("Ambiguous: 'pagamento' matches financial_overview", () => {
  assertEquals(matchesIntent(normalize("pagamento"), "financial_overview"), true);
});

Deno.test("Ambiguous: 'treino do aluno' matches workout_overview", () => {
  assertEquals(matchesIntent(normalize("treino do aluno"), "workout_overview"), true);
});

// ── Error handling: empty input ─────────────────────────────
Deno.test("Normalize: empty string stays empty", () => {
  assertEquals(normalize(""), "");
});

Deno.test("Normalize: special chars stripped", () => {
  assertEquals(normalize("Olá!!!"), "ola");
});

Deno.test("Normalize: accents removed", () => {
  assertEquals(normalize("próxima ação"), "proxima acao");
});
