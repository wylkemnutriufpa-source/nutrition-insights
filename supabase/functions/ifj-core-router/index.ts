import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ═══════════════════════════════════════════════════════════════
// IFJ CORE ROUTER v6.0 — Database-Driven Intelligence Brain
// Intents, phrases, guardrails, templates, food DB — all from DB
// ═══════════════════════════════════════════════════════════════

interface IFJIntent {
  intent: string;
  target_entity: string | null;
  target_id: string | null;
  target_name: string | null;
  module: string;
  confidence: number;
  needs_disambiguation: boolean;
  response_mode: string;
  requires_context: boolean;
  requires_active_plan: boolean;
  requires_patient_selected: boolean;
  requires_permission_key: string | null;
  action_type: string;
  executor_key: string | null;
  scope: string;
}

interface IFJResponse {
  title: string;
  icon: string;
  response_type: string;
  summary: string;
  body_markdown: string;
  actions: Array<{ label: string; route: string; type: string; patient_id?: string; original_command?: string; subtitle?: string }>;
  meta: { intent: string; confidence: number; data_source: string; engine: string; used_context: boolean };
  sessionContext: Record<string, any>;
}

interface SessionCtx {
  last_patient_id?: string;
  last_patient_name?: string;
  last_student_id?: string;
  last_student_name?: string;
  last_module?: string;
  last_route?: string;
  last_intent?: string;
  last_entity_type?: string;
  last_entity_id?: string;
}

interface PatientRecord {
  id: string;
  full_name: string;
  goal: string | null;
  journey_status: string | null;
  status: string | null;
}

interface DBIntentRow {
  id: string;
  intent_key: string;
  label: string;
  scope: string;
  module: string;
  action_type: string;
  executor_key: string | null;
  requires_context: boolean;
  requires_active_plan: boolean;
  requires_patient_selected: boolean;
  requires_permission_key: string | null;
  fallback_mode: string;
  priority_order: number;
}

interface DBPhraseRow {
  intent_id: string;
  phrase: string;
  phrase_type: string;
  weight: number;
}

// ── NORMALIZE ──────────────────────────────────────────────────
function normalize(t: string): string {
  return t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

// ── LOAD BRAIN FROM DB ────────────────────────────────────────
async function loadBrain(supabase: any) {
  const [{ data: intents }, { data: phrases }, { data: guardrails }, { data: brandRules }] = await Promise.all([
    supabase.from("ifj_intent_registry").select("*").eq("is_active", true).order("priority_order"),
    supabase.from("ifj_intent_phrases").select("intent_id, phrase, phrase_type, weight").eq("is_active", true),
    supabase.from("ifj_guardrails").select("*").eq("is_active", true),
    supabase.from("ifj_brand_rules").select("*").eq("is_active", true),
  ]);

  // Build phrase map: intent_id -> phrases[]
  const phraseMap = new Map<string, DBPhraseRow[]>();
  for (const p of (phrases || [])) {
    if (!phraseMap.has(p.intent_id)) phraseMap.set(p.intent_id, []);
    phraseMap.get(p.intent_id)!.push(p);
  }

  return {
    intents: (intents || []) as DBIntentRow[],
    phraseMap,
    guardrails: guardrails || [],
    brandRules: brandRules || [],
  };
}

// ── DB-DRIVEN INTENT DETECTION ────────────────────────────────
function detectIntentFromDB(
  n: string,
  ctx: SessionCtx,
  intents: DBIntentRow[],
  phraseMap: Map<string, DBPhraseRow[]>,
  role: string
): IFJIntent {
  const base: IFJIntent = {
    intent: "unknown", target_entity: null, target_id: null, target_name: null,
    module: "general", confidence: 0, needs_disambiguation: false, response_mode: "text",
    requires_context: false, requires_active_plan: false, requires_patient_selected: false,
    requires_permission_key: null, action_type: "query", executor_key: null, scope: "all",
  };

  // Food substitution patterns — check FIRST (high priority regex)
  const subPatterns = [
    /(?:substituir?|trocar?|no lugar d[eao]|em vez d[eao]|outra? opcao para|o que (?:posso |pode )?(?:comer|usar|colocar) (?:no lugar|em vez|ao inves))\s*(?:d[eao]\s+)?(.+)/,
    /(?:posso trocar|posso substituir|tem substitut|quero trocar)\s*(?:o\s+|a\s+)?(.+?)(?:\s+por\s+|$)/,
    /(?:nao tenho|acabou|sem)\s+(.+?)(?:,|\s+o que|\s+que|\s+posso|$)/,
    /(?:me de|da|sugira)\s+(?:outra?s?\s+)?(?:opcao|opcoes|alternativa)\s+(?:para|d[eao]|ao)\s+(.+)/,
  ];
  for (const p of subPatterns) {
    const m = n.match(p);
    if (m && m[1]?.trim()) {
      const foodIntent = intents.find(i => i.intent_key === "food_substitution");
      if (foodIntent) {
        return {
          ...base, intent: "food_substitution", target_name: m[1].trim(),
          module: foodIntent.module, confidence: 0.93, response_mode: "substitution",
          requires_context: foodIntent.requires_context, requires_active_plan: foodIntent.requires_active_plan,
          requires_permission_key: foodIntent.requires_permission_key, action_type: foodIntent.action_type,
          executor_key: foodIntent.executor_key, scope: foodIntent.scope,
        };
      }
    }
  }

  // Compound action: "coloque premium e libere IFJ para X"
  if (n.match(/(?:coloque|ative|libere|de|dar)\s+premium.*(?:e\s+)?(?:libere|ative|habilite)\s+ifj\s+(?:para|d[aeo]\s+)?(.+)/) ||
      n.match(/(?:libere|ative|habilite)\s+ifj.*(?:e\s+)?(?:coloque|ative|libere|de)\s+premium\s+(?:para|d[aeo]\s+)?(.+)/)) {
    const nameMatch = n.match(/(?:para|d[aeo])\s+([a-z\s]+?)(?:\s*$)/);
    const ci = intents.find(i => i.intent_key === "action_compound_premium_ifj");
    if (ci) return { ...base, intent: ci.intent_key, target_entity: "patient", target_name: nameMatch?.[1] || null, module: ci.module, confidence: 0.97, response_mode: "action", action_type: ci.action_type, executor_key: ci.executor_key, scope: ci.scope };
  }

  // ── COMPOUND INTENT REGEX (pre-score) ──────────────────────────
  // "avaliar plano da Luana", "ver dieta do João", "checar cardapio da Maria"
  const compoundMealPlan = n.match(/(?:avaliar|ver|abrir|mostrar|checar|revisar)\s+(?:o\s+)?(?:plano|dieta|cardapio)\s+(?:d[aeo]\s+|da\s+|do\s+)(.+)/);
  if (compoundMealPlan && compoundMealPlan[1]?.trim()) {
    const mp = intents.find(i => i.intent_key === "meal_plan");
    if (mp) {
      const cleaned = compoundMealPlan[1].trim().replace(/\s+(hoje|agora|atual|ativo)$/, "").trim();
      return {
        ...base, intent: "meal_plan", target_entity: "patient", target_name: cleaned,
        module: mp.module, confidence: 0.92, response_mode: "detail",
        requires_context: mp.requires_context, requires_active_plan: mp.requires_active_plan,
        requires_permission_key: mp.requires_permission_key, action_type: mp.action_type,
        executor_key: mp.executor_key, scope: mp.scope,
      };
    }
  }

  // "ver checklist da Luana", "checklist do João", "tarefas da Maria"
  const compoundChecklist = n.match(/(?:ver|abrir|mostrar|checar)?\s*(?:o\s+)?(?:checklist|tarefas?|pendencias)\s+(?:d[aeo]\s+|da\s+|do\s+)(.+)/);
  if (compoundChecklist && compoundChecklist[1]?.trim()) {
    const ck = intents.find(i => i.intent_key === "checklist_status");
    if (ck) {
      const cleaned = compoundChecklist[1].trim().replace(/\s+(hoje|agora)$/, "").trim();
      return {
        ...base, intent: "checklist_status", target_entity: "patient", target_name: cleaned,
        module: ck.module, confidence: 0.91, response_mode: "detail",
        requires_context: ck.requires_context, requires_active_plan: ck.requires_active_plan,
        requires_permission_key: ck.requires_permission_key, action_type: ck.action_type,
        executor_key: ck.executor_key, scope: ck.scope,
      };
    }
  }

  // "evolução da Luana", "progresso do João", "como está a Luana"
  const compoundEvolution = n.match(/(?:evolucao|progresso|resultado|como esta)\s+(?:d[aeo]\s+|da\s+|do\s+)(.+)/);
  if (compoundEvolution && compoundEvolution[1]?.trim()) {
    const pd = intents.find(i => i.intent_key === "patient_detail");
    if (pd) {
      const cleaned = compoundEvolution[1].trim().replace(/\s+(hoje|agora)$/, "").trim();
      return {
        ...base, intent: "patient_detail", target_entity: "patient", target_name: cleaned,
        module: pd.module, confidence: 0.90, response_mode: "detail",
        requires_context: pd.requires_context, requires_active_plan: pd.requires_active_plan,
        requires_permission_key: pd.requires_permission_key, action_type: pd.action_type,
        executor_key: pd.executor_key, scope: pd.scope,
      };
    }
  }

  // "anamnese da Luana", "ver anamnese do João"
  const compoundAnamnesis = n.match(/(?:ver|abrir|mostrar)?\s*(?:a\s+)?anamnese\s+(?:d[aeo]\s+|da\s+|do\s+)(.+)/);
  if (compoundAnamnesis && compoundAnamnesis[1]?.trim()) {
    const an = intents.find(i => i.intent_key === "anamnesis");
    if (an) {
      const cleaned = compoundAnamnesis[1].trim();
      return {
        ...base, intent: "anamnesis", target_entity: "patient", target_name: cleaned,
        module: an.module, confidence: 0.91, response_mode: "detail",
        requires_context: an.requires_context, requires_active_plan: an.requires_active_plan,
        requires_permission_key: an.requires_permission_key, action_type: an.action_type,
        executor_key: an.executor_key, scope: an.scope,
      };
    }
  }

  // "exames da Luana", "ver exames do João"
  const compoundLab = n.match(/(?:ver|abrir|mostrar)?\s*(?:os?\s+)?(?:exames?|lab|laboratorio)\s+(?:d[aeo]\s+|da\s+|do\s+)(.+)/);
  if (compoundLab && compoundLab[1]?.trim()) {
    const lb = intents.find(i => i.intent_key === "lab_exams");
    if (lb) {
      const cleaned = compoundLab[1].trim();
      return {
        ...base, intent: "lab_exams", target_entity: "patient", target_name: cleaned,
        module: lb.module, confidence: 0.91, response_mode: "detail",
        requires_context: lb.requires_context, requires_active_plan: lb.requires_active_plan,
        requires_permission_key: lb.requires_permission_key, action_type: lb.action_type,
        executor_key: lb.executor_key, scope: lb.scope,
      };
    }
  }

  // "plano alimentar da Luana", "plano da Luana"
  const simpleMealPlan = n.match(/(?:plano|dieta|cardapio)\s+(?:alimentar\s+)?(?:d[aeo]\s+|da\s+|do\s+)(.+)/);
  if (simpleMealPlan && simpleMealPlan[1]?.trim()) {
    const mp = intents.find(i => i.intent_key === "meal_plan");
    if (mp) {
      const cleaned = simpleMealPlan[1].trim().replace(/\s+(hoje|agora|atual|ativo)$/, "").trim();
      const foodCheck = /(?:comer|substituir|trocar|receita|saudavel|engorda|emagrec|caloria)/;
      if (!foodCheck.test(cleaned)) {
        return {
          ...base, intent: "meal_plan", target_entity: "patient", target_name: cleaned,
          module: mp.module, confidence: 0.90, response_mode: "detail",
          requires_context: mp.requires_context, requires_active_plan: mp.requires_active_plan,
          requires_permission_key: mp.requires_permission_key, action_type: mp.action_type,
          executor_key: mp.executor_key, scope: mp.scope,
        };
      }
    }
  }

  const scores: { intent: DBIntentRow; score: number; bestWeight: number }[] = [];

  for (const intent of intents) {
    const iPhrases = phraseMap.get(intent.id) || [];
    if (!iPhrases.length) continue;

    // Skip scope-restricted intents
    if (intent.scope === "admin" && role !== "admin") continue;
    if (intent.scope === "professional" && !["admin", "nutritionist", "personal"].includes(role)) continue;
    if (intent.scope === "patient" && role !== "patient" && role !== "admin") continue;

    let totalScore = 0;
    let bestWeight = 0;
    let matchCount = 0;

    for (const phrase of iPhrases) {
      if (n.includes(phrase.phrase)) {
        totalScore += phrase.weight;
        matchCount++;
        if (phrase.weight > bestWeight) bestWeight = phrase.weight;
      }
    }

    if (matchCount > 0) {
      scores.push({ intent, score: totalScore, bestWeight });
    }
  }

  // Sort by score descending, then by priority_order ascending
  scores.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.intent.priority_order - b.intent.priority_order;
  });

  if (scores.length > 0) {
    const best = scores[0];
    const confidence = Math.min(0.99, 0.6 + (best.score * 0.05));
    const ik = best.intent.intent_key;

    // Extract target name for specific intents
    let targetName: string | null = null;
    let targetEntity: string | null = null;

    // Action intents that need a name
    if (["action_release_onboarding", "action_set_premium", "action_enable_ifj"].includes(ik)) {
      const namePatterns: Record<string, RegExp> = {
        action_release_onboarding: /(?:libere?|ative?)\s+(?:o\s+)?onboarding\s+(?:d[aeo]\s+)?(.+)/,
        action_set_premium: /(?:coloque|ative|libere|dar|tornar)\s+premium\s+(?:para\s+|d[aeo]\s+)?(.+)/,
        action_enable_ifj: /(?:libere?|ative?|habilite?|ligar?)\s+ifj\s+(?:para\s+|d[aeo]\s+)?(.+)/,
      };
      const pattern = namePatterns[ik];
      if (pattern) { const m = n.match(pattern); targetName = m?.[1] || null; }
      targetEntity = "patient";
    }

    // patient_detail needs name extraction
    if (ik === "patient_detail") {
      const m = n.match(/(?:paciente|sobre|como esta|como vai|ficha d[aeo]|perfil d[aeo]|dados d[aeo])\s+(.+)/);
      if (m) {
        const candidateName = m[1];
        const foodWords = /(?:comer|substituir|trocar|lugar|comida|alimento|receita|ingrediente|lanche|saudavel|engorda|emagrec|caloria|proteina|carboidrato|gordura|fibra|vitamina|nutriente|cafe|almoco|janta|dieta|refeic)/;
        if (!foodWords.test(candidateName)) {
          targetName = candidateName;
          targetEntity = "patient";
        } else {
          // It's actually a nutrition question
          const nutIntent = intents.find(i => i.intent_key === "nutrition_question");
          if (nutIntent) return { ...base, intent: "nutrition_question", module: nutIntent.module, confidence: 0.80, response_mode: "nutrition", requires_context: nutIntent.requires_context, requires_active_plan: nutIntent.requires_active_plan, requires_permission_key: nutIntent.requires_permission_key, action_type: nutIntent.action_type, executor_key: nutIntent.executor_key, scope: nutIntent.scope };
        }
      } else if (ctx.last_patient_id) {
        targetName = ctx.last_patient_name || null;
        targetEntity = "patient";
        return { ...base, intent: ik, target_entity: targetEntity, target_id: ctx.last_patient_id, target_name: targetName, module: best.intent.module, confidence: 0.85, response_mode: "detail", requires_context: best.intent.requires_context, requires_active_plan: best.intent.requires_active_plan, requires_patient_selected: best.intent.requires_patient_selected, requires_permission_key: best.intent.requires_permission_key, action_type: best.intent.action_type, executor_key: best.intent.executor_key, scope: best.intent.scope };
      }
    }

    // student_detail name extraction
    if (ik === "student_detail") {
      const m = n.match(/(?:aluno|estudante|meu aluno)\s+(.+)/);
      if (m) { targetName = m[1]; targetEntity = "student"; }
    }

    // meal_plan: extract patient name from compound commands like "avaliar plano da Luana"
    if (ik === "meal_plan") {
      if (!targetName) {
        const mealNamePatterns = [
          /(?:plano|dieta|cardapio|meal plan)\s+(?:d[aeo]\s+|da\s+|do\s+)(.+)/,
          /(?:avaliar|ver|abrir|mostrar|checar)\s+(?:o\s+)?(?:plano|dieta)\s+(?:d[aeo]\s+|da\s+|do\s+)(.+)/,
        ];
        for (const pat of mealNamePatterns) {
          const m = n.match(pat);
          if (m && m[1]?.trim()) {
            // Remove trailing noise words
            const cleaned = m[1].trim().replace(/\s+(hoje|agora|atual|ativo)$/, "").trim();
            if (cleaned && !/(?:comer|substituir|trocar|receita|saudavel)/.test(cleaned)) {
              targetName = cleaned;
              targetEntity = "patient";
              break;
            }
          }
        }
      }
      // Fallback to context patient if no name extracted
      if (!targetName && ctx.last_patient_id) {
        return { ...base, intent: ik, target_entity: "patient", target_id: ctx.last_patient_id, target_name: ctx.last_patient_name || null, module: best.intent.module, confidence: 0.88, response_mode: "detail", requires_context: best.intent.requires_context, requires_active_plan: best.intent.requires_active_plan, requires_permission_key: best.intent.requires_permission_key, action_type: best.intent.action_type, executor_key: best.intent.executor_key, scope: best.intent.scope };
      }
      if (targetName) targetEntity = "patient";
    }

    return {
      ...base, intent: ik, target_entity: targetEntity, target_name: targetName,
      module: best.intent.module, confidence, response_mode: best.intent.action_type === "execute" ? "action" : "text",
      requires_context: best.intent.requires_context, requires_active_plan: best.intent.requires_active_plan,
      requires_patient_selected: best.intent.requires_patient_selected,
      requires_permission_key: best.intent.requires_permission_key,
      action_type: best.intent.action_type, executor_key: best.intent.executor_key, scope: best.intent.scope,
    };
  }

  // Nutrition question fallback for food-related words
  if (/(?:posso comer|pode comer|faz mal|devo evitar|o que comer|receita|saudavel|engorda|emagrec)/.test(n)) {
    const nutIntent = intents.find(i => i.intent_key === "nutrition_question");
    if (nutIntent) return { ...base, intent: "nutrition_question", module: nutIntent.module, confidence: 0.80, response_mode: "nutrition", requires_context: nutIntent.requires_context, requires_active_plan: nutIntent.requires_active_plan, requires_permission_key: nutIntent.requires_permission_key, action_type: nutIntent.action_type, executor_key: nutIntent.executor_key, scope: nutIntent.scope };
  }

  // Context-aware follow-ups
  if (ctx.last_patient_id) {
    if (n.includes("quando vence") || n.includes("plano del") || n.includes("dieta del")) {
      const mp = intents.find(i => i.intent_key === "meal_plan");
      if (mp) return { ...base, intent: "meal_plan", target_entity: "patient", target_id: ctx.last_patient_id, target_name: ctx.last_patient_name || null, module: mp.module, confidence: 0.87, response_mode: "detail", requires_context: mp.requires_context, requires_active_plan: mp.requires_active_plan, requires_permission_key: mp.requires_permission_key, action_type: mp.action_type, executor_key: mp.executor_key, scope: mp.scope };
    }
    if (n.includes("como ele esta") || n.includes("como ela esta") || n.includes("status del")) {
      const pd = intents.find(i => i.intent_key === "patient_detail");
      if (pd) return { ...base, intent: "patient_detail", target_entity: "patient", target_id: ctx.last_patient_id, target_name: ctx.last_patient_name || null, module: pd.module, confidence: 0.86, response_mode: "detail", requires_context: pd.requires_context, requires_active_plan: pd.requires_active_plan, requires_permission_key: pd.requires_permission_key, action_type: pd.action_type, executor_key: pd.executor_key, scope: pd.scope };
    }
  }

  // ── BARE-NAME FALLBACK ──────────────────────────────────────
  // If input is 1-3 words and no intent was detected, treat as patient name search
  const wordCount = n.split(/\s+/).length;
  if (wordCount <= 3 && role !== "patient") {
    // Only if it doesn't look like a navigation or food word
    const skipWords = /^(ajuda|help|oi|ola|menu|sair|voltar|cancelar|sim|nao|ok|obrigad|valeu)$/;
    const foodCheck = /(?:comer|receita|saudavel|engorda|emagrec|caloria|proteina|carboidrato|substituir|trocar)/;
    if (!skipWords.test(n) && !foodCheck.test(n)) {
      const pd = intents.find(i => i.intent_key === "patient_detail");
      if (pd) {
        return {
          ...base, intent: "patient_detail", target_entity: "patient", target_name: n,
          module: pd.module, confidence: 0.65, response_mode: "detail",
          requires_context: pd.requires_context, requires_active_plan: pd.requires_active_plan,
          requires_patient_selected: pd.requires_patient_selected,
          requires_permission_key: pd.requires_permission_key,
          action_type: pd.action_type, executor_key: pd.executor_key, scope: pd.scope,
        };
      }
    }
  }

  return base;
}

// ── GUARDRAILS ENGINE ──────────────────────────────────────────
function applyGuardrails(intent: IFJIntent, role: string, guardrails: any[], perms: any | null, ctx: SessionCtx): { blocked: boolean; message: string } {
  for (const g of guardrails) {
    const cond = g.condition_json || {};

    if (cond.check === "role_action_guard" && intent.action_type === "execute") {
      if ((cond.blocked_roles || []).includes(role)) return { blocked: true, message: g.message_template };
    }

    if (cond.check === "role_known" && role === "unknown") return { blocked: true, message: g.message_template };

    if (cond.check === "ifj_enabled" && role === "patient" && perms && perms.ifj_enabled === false) return { blocked: true, message: g.message_template };

    if (cond.check === "permission_key" && intent.requires_permission_key && role === "patient" && perms) {
      if (perms[intent.requires_permission_key] === false) return { blocked: true, message: g.message_template };
    }

    if (cond.check === "scope_professional" && intent.scope === "professional" && role === "patient") return { blocked: true, message: g.message_template };
  }

  return { blocked: false, message: "" };
}

// ── NAME RESOLVER ──────────────────────────────────────────────
function findByName(list: any[], searchName: string, nameField = "full_name"): { found: any | null; ambiguous: any[] } {
  const sn = normalize(searchName);
  const exact = list.filter(p => normalize(p[nameField]) === sn);
  if (exact.length === 1) return { found: exact[0], ambiguous: [] };
  const partial = list.filter(p => normalize(p[nameField]).includes(sn));
  if (partial.length === 1) return { found: partial[0], ambiguous: [] };
  if (partial.length > 1) return { found: null, ambiguous: partial };
  return { found: null, ambiguous: [] };
}

// ── SMART DISAMBIGUATION BUILDER ──────────────────────────────
function buildDisambiguation(
  ambiguous: PatientRecord[],
  intent: IFJIntent,
  originalCommand: string,
  ctx: SessionCtx,
  engine: string,
  actionLabelPrefix?: string,
): IFJResponse {
  // Sort by relevance: patients with goal first, then alphabetically
  const sorted = [...ambiguous].sort((a, b) => {
    if (a.goal && !b.goal) return -1;
    if (!a.goal && b.goal) return 1;
    return a.full_name.localeCompare(b.full_name);
  });

  const statusLabel = (p: PatientRecord) => {
    const s = p.journey_status || p.status || "";
    const map: Record<string, string> = {
      active: "Ativo", onboarding_active: "Em onboarding", awaiting_payment: "Aguardando pgto",
      invited: "Convidado", completed: "Completo", "": "—",
    };
    return map[s] || s;
  };

  const actions = sorted.map((p) => ({
    label: p.full_name,
    subtitle: `${p.goal || "Sem objetivo"} · ${statusLabel(p)}`,
    route: `/patients/${p.id}`,
    type: "disambiguate" as const,
    patient_id: p.id,
    original_command: originalCommand,
  }));

  const md = `## Qual ${intent.target_name}?\n\nEncontrei **${sorted.length}** pacientes:\n\n` +
    sorted.map((p, i) => `${i + 1}. **${p.full_name}** — ${p.goal || "Sem objetivo"} · _${statusLabel(p)}_`).join("\n") +
    `\n\n💡 Selecione abaixo para continuar a ação.`;

  return fmt(
    "Qual paciente?", "🔍", "disambiguation",
    `${sorted.length} pacientes com nome similar`,
    md, actions, intent, engine, ctx,
  );
}

// ═══════════════════════════════════════════════════════════════
// CONNECTORS — Schema-validated data fetchers
// ═══════════════════════════════════════════════════════════════

async function getUserRole(supabase: any, userId: string): Promise<string> {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  const roles = (data || []).map((r: any) => r.role);
  if (roles.includes("admin")) return "admin";
  if (roles.includes("nutritionist")) return "nutritionist";
  if (roles.includes("personal")) return "personal";
  if (roles.includes("patient")) return "patient";
  return "unknown";
}

async function checkPatientIFJAccess(supabase: any, patientId: string): Promise<{ hasAccess: boolean; perms: any }> {
  // Use fresh query with no caching - critical for permission enforcement
  const { data, error } = await supabase.from("ifj_patient_permissions")
    .select("ifj_enabled, meal_plan, substitutions, ifj_mode, recipes, checklist, hydration, progress, appointments, messages, recommendations, smart_recipe_help, smart_swap_suggestions, smart_meal_context, allow_ai_last_resort")
    .eq("patient_id", patientId).limit(1).single();
  console.log(`[IFJ-ACCESS-v2] patient=${patientId} ifj_enabled=${data?.ifj_enabled} meal_plan=${data?.meal_plan} subs=${data?.substitutions} mode=${data?.ifj_mode} err=${error?.message || 'none'}`);
  if (error || !data) { console.log("[IFJ-ACCESS-v2] NO DATA -> blocked"); return { hasAccess: false, perms: null }; }
  if (data.ifj_enabled === false) { console.log("[IFJ-ACCESS-v2] BLOCKED: ifj_enabled=false"); return { hasAccess: false, perms: data }; }
  if (data.meal_plan === false) { console.log("[IFJ-ACCESS-v2] BLOCKED: meal_plan=false"); return { hasAccess: false, perms: data }; }
  return { hasAccess: true, perms: data };
}

async function getPatients(supabase: any, userId: string, role?: string): Promise<PatientRecord[]> {
  let links: any[] = [];
  if (role === "admin") {
    const { data } = await supabase.from("nutritionist_patients")
      .select("patient_id, status, journey_status, nutritionist_id")
      .eq("status", "active").limit(500);
    links = data || [];
  } else {
    const { data } = await supabase.from("nutritionist_patients")
      .select("patient_id, status, journey_status")
      .eq("nutritionist_id", userId).eq("status", "active").limit(200);
    links = data || [];
  }
  if (!links.length) return [];
  const patientIds = [...new Set(links.map((l: any) => l.patient_id))];
  const { data: profiles } = await supabase.from("profiles")
    .select("user_id, full_name, goal").in("user_id", patientIds);
  return patientIds.map((pid: string) => {
    const profile = (profiles || []).find((p: any) => p.user_id === pid);
    const link = links.find((l: any) => l.patient_id === pid);
    return { id: pid, full_name: profile?.full_name || "Sem nome", goal: profile?.goal || null, journey_status: link?.journey_status, status: link?.status };
  });
}

async function getPortfolioInputs(supabase: any, userId: string, patientIds: string[], today: string, role?: string) {
  const safeIds = patientIds.length ? patientIds : ["00000000-0000-0000-0000-000000000000"];
  const [snapshots, alerts, plans, transactions] = await Promise.all([
    getSnapshots(supabase, safeIds, today),
    getActiveAlerts(supabase, userId, role),
    getMealPlans(supabase, userId, role),
    getFinancialSummary(supabase, userId, role),
  ]);
  return { snapshots, alerts, plans, transactions };
}

async function getPatientOverview(supabase: any, patientId: string, today: string) {
  const [{ data: snap }, { data: alerts }, { data: plan }] = await Promise.all([
    supabase.from("clinical_daily_snapshots")
      .select("adherence_score, dropout_risk_score, risk_level, checklist_completion_rate, days_since_last_checkin, current_weight, weight_trend, momentum_direction")
      .eq("patient_id", patientId).eq("snapshot_date", today).maybeSingle(),
    supabase.from("clinical_alerts")
      .select("id, title, severity").eq("patient_id", patientId).eq("is_active", true).limit(5),
    supabase.from("meal_plans")
      .select("id, title, plan_status, is_active, start_date, end_date")
      .eq("patient_id", patientId).eq("is_active", true).limit(1).maybeSingle(),
  ]);
  return { snapshot: snap, alerts: alerts || [], activePlan: plan };
}

async function getPatientAnamnesis(supabase: any, patientUserId: string) {
  const { data } = await supabase.from("patient_anamnesis")
    .select("id, answers, status, created_at")
    .eq("user_id", patientUserId).order("created_at", { ascending: false }).limit(1).maybeSingle();
  return data;
}

async function getPatientLabSummary(supabase: any, patientId: string) {
  const { data } = await supabase.from("patient_lab_results")
    .select("id, marker_name, value, unit, reference_min, reference_max, interpretation, collected_at")
    .eq("patient_id", patientId).order("collected_at", { ascending: false }).limit(20);
  return data || [];
}

async function getFinancialSummary(supabase: any, userId: string, role?: string) {
  let query = supabase.from("financial_transactions")
    .select("id, amount, status, type, date, description, category, created_at");
  if (role !== "admin") query = query.eq("nutritionist_id", userId);
  const { data } = await query.limit(500);
  return data || [];
}

async function getActiveAlerts(supabase: any, userId: string, role?: string) {
  let query = supabase.from("clinical_alerts")
    .select("id, patient_id, title, severity, alert_type, created_at");
  if (role !== "admin") query = query.eq("nutritionist_id", userId);
  const { data } = await query.eq("is_active", true).order("created_at", { ascending: false }).limit(50);
  return data || [];
}

async function getSnapshots(supabase: any, patientIds: string[], today: string) {
  if (!patientIds.length) return [];
  const { data } = await supabase.from("clinical_daily_snapshots")
    .select("patient_id, adherence_score, dropout_risk_score, risk_level, checklist_completion_rate, current_weight, weight_trend, momentum_direction, days_since_last_checkin")
    .in("patient_id", patientIds).eq("snapshot_date", today);
  return data || [];
}

async function getMealPlans(supabase: any, userId: string, role?: string) {
  let query = supabase.from("meal_plans")
    .select("id, patient_id, title, plan_status, is_active, start_date, end_date");
  if (role !== "admin") query = query.eq("nutritionist_id", userId);
  const { data } = await query.eq("is_active", true).limit(500);
  return data || [];
}

async function getStudents(supabase: any, personalId: string): Promise<PatientRecord[]> {
  const { data: links } = await supabase.from("patient_professional_links")
    .select("patient_id")
    .eq("professional_id", personalId).eq("professional_role", "personal_trainer").eq("link_status", "active").limit(100);
  if (!links?.length) return [];
  const ids = links.map((l: any) => l.patient_id);
  const { data: profiles } = await supabase.from("profiles")
    .select("user_id, full_name, goal").in("user_id", ids);
  return (profiles || []).map((p: any) => ({ id: p.user_id, full_name: p.full_name, goal: p.goal, journey_status: null, status: "active" }));
}

async function getWorkoutFeedback(supabase: any, studentIds: string[]) {
  if (!studentIds.length) return [];
  const { data } = await supabase.from("workout_session_feedback")
    .select("id, patient_id, pain_reported, pain_location, fatigue_level, session_date, notes")
    .in("patient_id", studentIds).order("session_date", { ascending: false }).limit(30);
  return data || [];
}

// ── SESSION CONTEXT ────────────────────────────────────────────
async function loadSessionContext(supabase: any, userId: string, sessionKey: string): Promise<SessionCtx> {
  const { data } = await supabase.from("ifj_session_context")
    .select("*").eq("user_id", userId).eq("session_key", sessionKey).maybeSingle();
  if (!data) return {};
  return {
    last_patient_id: data.last_patient_id, last_patient_name: data.last_patient_name,
    last_student_id: data.last_student_id, last_student_name: data.last_student_name,
    last_module: data.last_module, last_route: data.last_route, last_intent: data.last_intent,
    last_entity_type: data.last_entity_type, last_entity_id: data.last_entity_id,
  };
}

async function saveSessionContext(supabase: any, userId: string, role: string, sessionKey: string, ctx: SessionCtx, intent: string) {
  await supabase.from("ifj_session_context").upsert({
    user_id: userId, role, session_key: sessionKey,
    last_patient_id: ctx.last_patient_id || null, last_patient_name: ctx.last_patient_name || null,
    last_student_id: ctx.last_student_id || null, last_student_name: ctx.last_student_name || null,
    last_module: ctx.last_module || null, last_route: ctx.last_route || null,
    last_intent: intent, last_entity_type: ctx.last_entity_type || null, last_entity_id: ctx.last_entity_id || null,
    context_json: ctx, updated_at: new Date().toISOString(),
  }, { onConflict: "user_id,session_key" });
}

async function logIntent(supabase: any, userId: string, role: string, input: string, normalized: string, intent: IFJIntent, responseType: string, engine: string, responseTimeMs: number, error?: string) {
  await supabase.from("ifj_intent_logs").insert({
    user_id: userId, role, input_text: input, normalized_text: normalized,
    detected_intent: intent.intent, confidence: intent.confidence,
    resolved_entity_type: intent.target_entity, resolved_entity_id: intent.target_id,
    response_type: responseType, engine_used: engine, response_time_ms: responseTimeMs, error_message: error || null,
  });
}

// ═══════════════════════════════════════════════════════════════
// PRIORITY ENGINE
// ═══════════════════════════════════════════════════════════════
interface PriorityItem {
  entity_type: string; entity_id: string; entity_name: string;
  score: number; level: string; reasons: string[]; source_engine: string;
}

function calculatePriorities(patients: PatientRecord[], snapshots: any[], alerts: any[], plans: any[], transactions: any[]): PriorityItem[] {
  const items: PriorityItem[] = [];
  const today = new Date();
  for (const p of patients) {
    let score = 0; const reasons: string[] = [];
    const snap = snapshots.find((s: any) => s.patient_id === p.id);
    const pAlerts = alerts.filter((a: any) => a.patient_id === p.id);
    const pPlan = plans.find((pl: any) => pl.patient_id === p.id);
    if (snap?.risk_level === "critical") { score += 50; reasons.push("Risco clínico crítico"); }
    else if (snap?.risk_level === "high") { score += 35; reasons.push("Risco clínico alto"); }
    if (snap?.adherence_score != null && snap.adherence_score < 40) { score += 25; reasons.push(`Adesão ${snap.adherence_score}%`); }
    else if (snap?.adherence_score != null && snap.adherence_score < 60) { score += 15; reasons.push(`Adesão ${snap.adherence_score}%`); }
    if (snap?.dropout_risk_score != null && snap.dropout_risk_score > 70) { score += 30; reasons.push(`Risco abandono ${snap.dropout_risk_score}%`); }
    if (pAlerts.length > 0) {
      const critAlerts = pAlerts.filter((a: any) => a.severity === "critical");
      if (critAlerts.length) { score += 40; reasons.push(`${critAlerts.length} alerta(s) crítico(s)`); }
      else { score += 15; reasons.push(`${pAlerts.length} alerta(s) ativo(s)`); }
    }
    if (pPlan?.end_date) {
      const daysLeft = Math.ceil((new Date(pPlan.end_date).getTime() - today.getTime()) / 86400000);
      if (daysLeft < 0) { score += 25; reasons.push("Plano vencido"); }
      else if (daysLeft <= 2) { score += 20; reasons.push(`Plano vence em ${daysLeft}d`); }
    }
    if (snap?.checklist_completion_rate != null && snap.checklist_completion_rate < 30) { score += 10; reasons.push("Checklist < 30%"); }
    if (snap?.days_since_last_checkin != null && snap.days_since_last_checkin > 7) { score += 15; reasons.push(`${snap.days_since_last_checkin}d sem check-in`); }
    if (score > 0) {
      const level = score >= 60 ? "critical" : score >= 40 ? "high" : score >= 20 ? "medium" : "low";
      items.push({ entity_type: "patient", entity_id: p.id, entity_name: p.full_name, score, level, reasons, source_engine: "priority" });
    }
  }
  return items.sort((a, b) => b.score - a.score);
}

async function syncPriorityQueue(supabase: any, userId: string, priorities: PriorityItem[]) {
  const now = new Date().toISOString();
  const upsertPromises = priorities.slice(0, 20).map(item =>
    supabase.from("ifj_priority_queue").upsert({
      entity_type: item.entity_type, entity_id: item.entity_id, entity_name: item.entity_name,
      owner_user_id: userId, priority_score: item.score, priority_level: item.level,
      reasons_json: item.reasons, source_engine: "priority", is_resolved: false, updated_at: now,
    }, { onConflict: "owner_user_id,entity_type,entity_id" }).then(() => {})
  );
  await Promise.all(upsertPromises);
  const currentEntityIds = priorities.slice(0, 20).map(p => p.entity_id);
  if (currentEntityIds.length > 0) {
    const { data: existing } = await supabase.from("ifj_priority_queue")
      .select("id, entity_id").eq("owner_user_id", userId).eq("is_resolved", false);
    const toResolve = (existing || []).filter((e: any) => !currentEntityIds.includes(e.entity_id));
    if (toResolve.length > 0) {
      await Promise.all(toResolve.map((e: any) =>
        supabase.from("ifj_priority_queue").update({ is_resolved: true, updated_at: now }).eq("id", e.id).then(() => {})
      ));
    }
  } else {
    await supabase.from("ifj_priority_queue")
      .update({ is_resolved: true, updated_at: now })
      .eq("owner_user_id", userId).eq("is_resolved", false).then(() => {});
  }
}

function fmt(title: string, icon: string, responseType: string, summary: string, markdown: string, actions: any[], intent: IFJIntent, engine: string, ctx: SessionCtx): IFJResponse {
  return {
    title, icon, response_type: responseType, summary, body_markdown: markdown, actions,
    meta: { intent: intent.intent, confidence: intent.confidence, data_source: "deterministic", engine, used_context: !!(ctx.last_patient_id || ctx.last_student_id) },
    sessionContext: ctx,
  };
}

const NAV_MAP: Record<string, { route: string; label: string }> = {
  "control tower": { route: "/control-tower", label: "Control Tower" },
  "torre de controle": { route: "/control-tower", label: "Control Tower" },
  "pacientes": { route: "/patients", label: "Pacientes" },
  "financeiro": { route: "/financial", label: "Financeiro" },
  "consultas": { route: "/appointments", label: "Consultas" },
  "agenda": { route: "/appointments", label: "Agenda" },
  "planos": { route: "/meal-plans", label: "Planos Alimentares" },
  "plano alimentar": { route: "/meal-plans", label: "Planos Alimentares" },
  "treinos": { route: "/workouts", label: "Treinos" },
  "automac": { route: "/automation-center", label: "Automações" },
  "relatorios": { route: "/reports", label: "Relatórios" },
  "configurac": { route: "/settings", label: "Configurações" },
  "ajustes": { route: "/settings", label: "Configurações" },
  "inteligencia": { route: "/intelligence-settings", label: "Inteligência FitJourney" },
  "ifj": { route: "/intelligence-settings", label: "Inteligência FitJourney" },
  "dashboard": { route: "/", label: "Dashboard" },
  "workspace": { route: "/clinical-workspace", label: "Workspace Clínico" },
  "protocolos": { route: "/protocols", label: "Protocolos" },
  "programas": { route: "/programs", label: "Programas" },
  "pipeline": { route: "/onboarding-pipeline", label: "Pipeline" },
  "onboarding": { route: "/onboarding-pipeline", label: "Pipeline de Onboarding" },
  "anamnese": { route: "/anamnesis", label: "Anamnese" },
  "anaminese": { route: "/anamnesis", label: "Anamnese" },
  "receitas": { route: "/recipes", label: "Receitas" },
  "biblioteca": { route: "/recipes", label: "Biblioteca de Receitas" },
  "chat": { route: "/chat", label: "Chat" },
  "mensagens": { route: "/chat", label: "Mensagens" },
  "avaliacao": { route: "/body-assessment", label: "Avaliação Física" },
  "avaliacoes": { route: "/body-assessment", label: "Avaliações Físicas" },
  "perfil": { route: "/profile", label: "Perfil" },
  "minha conta": { route: "/profile", label: "Minha Conta" },
  "checklist": { route: "/checklist", label: "Checklist" },
  "hidratacao": { route: "/hydration", label: "Hidratação" },
  "notificac": { route: "/notifications", label: "Notificações" },
  "afiliados": { route: "/affiliates", label: "Afiliados" },
  "campanhas": { route: "/campaigns", label: "Campanhas" },
};

function resolveNavigation(n: string): { route: string; label: string } | null {
  for (const [key, val] of Object.entries(NAV_MAP)) { if (n.includes(key)) return val; }
  return null;
}

// ── SMART SUGGESTION ENGINE ───────────────────────────────────
// When intent is unknown, extract keywords and suggest possible actions
interface SmartSuggestion { label: string; example: string; }

function generateSmartSuggestions(n: string, intents: DBIntentRow[], phraseMap: Map<string, DBPhraseRow[]>, role: string): SmartSuggestion[] {
  const suggestions: SmartSuggestion[] = [];
  const words = n.split(" ").filter(w => w.length > 2);

  // Check if any word partially matches a NAV_MAP key
  for (const word of words) {
    for (const [key, val] of Object.entries(NAV_MAP)) {
      if (key.includes(word) || word.includes(key.substring(0, Math.min(key.length, 5)))) {
        suggestions.push({ label: `Abrir ${val.label}`, example: `abrir ${key}` });
        break;
      }
    }
  }

  // Check if any word partially matches intent phrases
  const seenIntents = new Set<string>();
  for (const word of words) {
    for (const intent of intents) {
      if (seenIntents.has(intent.intent_key)) continue;
      if (intent.scope === "admin" && role !== "admin") continue;
      if (intent.scope === "professional" && !["admin", "nutritionist", "personal"].includes(role)) continue;
      if (intent.scope === "patient" && role !== "patient" && role !== "admin") continue;

      const iPhrases = phraseMap.get(intent.id) || [];
      for (const phrase of iPhrases) {
        if (phrase.phrase.includes(word) || word.includes(phrase.phrase.substring(0, Math.min(phrase.phrase.length, 4)))) {
          const exampleMap: Record<string, string> = {
            "anamnesis": "anamnese do [paciente]",
            "patient_detail": "sobre [paciente]",
            "meal_plan": "plano alimentar do [paciente]",
            "food_substitution": "trocar [alimento]",
            "action_release_onboarding": "libere onboarding da [nome]",
            "action_enable_ifj": "libere IFJ para [nome]",
            "priorities_today": "o que preciso resolver hoje?",
            "patients_attention": "quem precisa de atenção?",
            "clinical_alerts": "alertas clínicos",
            "financial_overview": "resumo financeiro",
            "appointments": "próximas consultas",
            "checklist_status": "checklist do [paciente]",
            "lab_exams": "exames do [paciente]",
            "navigate": `abrir ${word}`,
          };
          suggestions.push({
            label: intent.label,
            example: exampleMap[intent.intent_key] || `${intent.label.toLowerCase()}`,
          });
          seenIntents.add(intent.intent_key);
          break;
        }
      }
    }
  }

  // Deduplicate by label
  const seen = new Set<string>();
  return suggestions.filter(s => {
    if (seen.has(s.label)) return false;
    seen.add(s.label);
    return true;
  }).slice(0, 5);
}

// ═══════════════════════════════════════════════════════════════
// ACTION ENGINE — Execute real operations
// ═══════════════════════════════════════════════════════════════
async function runActionEngine(supabaseAdmin: any, supabase: any, intent: IFJIntent, userId: string, ctx: SessionCtx, patients: PatientRecord[], role: string): Promise<IFJResponse> {
  if (role === "patient" || role === "unknown")
    return fmt("Sem permissão", "🚫", "error", "Pacientes não podem executar ações.", "", [], intent, "action", ctx);

  switch (intent.intent) {
    case "action_release_onboarding": {
      if (!intent.target_name) return fmt("Quem?", "❓", "error", "Diga o nome do paciente.", "Ex: *libere onboarding da Maria*", [], intent, "action", ctx);
      const { found, ambiguous } = findByName(patients, intent.target_name);
      if (ambiguous.length > 0) return fmt("Qual paciente?", "🔍", "disambiguation", "Múltiplos encontrados", ambiguous.map((p: any, i: number) => `${i + 1}. **${p.full_name}**`).join("\n"), [], intent, "action", ctx);
      if (!found) return fmt("Não encontrado", "❌", "error", "Paciente não encontrado.", "", [], intent, "action", ctx);
      const { error } = await supabaseAdmin.from("nutritionist_patients").update({ journey_status: "onboarding_active" }).eq("patient_id", found.id).eq("status", "active");
      if (error) return fmt("Erro", "❌", "error", "Erro ao liberar.", error.message, [], intent, "action", ctx);
      await supabaseAdmin.from("notifications").insert({ user_id: found.id, title: "Onboarding liberado! 🎉", message: "Seu onboarding foi liberado. Comece agora!", type: "onboarding_released", is_read: false }).then(() => {});
      ctx.last_patient_id = found.id; ctx.last_patient_name = found.full_name;
      return fmt("✅ Onboarding liberado!", "🚀", "action_completed", `Onboarding de ${found.full_name} liberado e notificado.`,
        `## ✅ Ação executada\n\n**Paciente:** ${found.full_name}\n**Ação:** Onboarding liberado\n**Notificação:** Enviada ✓`,
        [{ label: "Abrir ficha", route: `/patients/${found.id}`, type: "navigate" }], intent, "action", ctx);
    }
    case "action_release_all_onboarding": {
      const PRE_OB = ["awaiting_consent", "invited", "awaiting_payment", "payment_confirmed", "awaiting_onboarding_release", "onboarding_active"];
      const toRelease = patients.filter(p => PRE_OB.includes(p.journey_status || ""));
      if (!toRelease.length) return fmt("Nenhum pendente", "✅", "info", "Nenhum paciente aguardando liberação.", "", [], intent, "action", ctx);
      let released = 0; const errors: string[] = [];
      for (const p of toRelease) {
        const { error } = await supabaseAdmin.from("nutritionist_patients").update({ journey_status: "onboarding_active" }).eq("patient_id", p.id).eq("status", "active");
        if (error) { errors.push(p.full_name); continue; }
        await supabaseAdmin.from("notifications").insert({ user_id: p.id, title: "Onboarding liberado! 🎉", message: "Seu onboarding foi liberado. Comece agora!", type: "onboarding_released", is_read: false }).then(() => {});
        released++;
      }
      const md = toRelease.map(p => `- **${p.full_name}** ${errors.includes(p.full_name) ? "❌ erro" : "✅ liberado"}`).join("\n");
      return fmt("✅ Onboarding em massa!", "🚀", "action_completed", `${released}/${toRelease.length} liberados.`,
        `## ✅ Liberação em massa\n\n${md}\n\n${errors.length ? `⚠️ ${errors.length} erro(s)` : "Todos liberados!"}`,
        [{ label: "Pipeline", route: "/onboarding-pipeline", type: "navigate" }], intent, "action", ctx);
    }
    case "action_awaiting_onboarding": {
      const PRE_OB = ["awaiting_consent", "invited", "awaiting_payment", "payment_confirmed", "awaiting_onboarding_release", "onboarding_active"];
      const awaiting = patients.filter(p => PRE_OB.includes(p.journey_status || ""));
      if (!awaiting.length) {
        const noOnboarding = patients.filter(p => !p.journey_status || p.journey_status === "active");
        if (noOnboarding.length > 0) return fmt("Status da carteira", "📋", "info", `${patients.length} pacientes ativos.`, `## Carteira\n\nTodos os **${patients.length}** pacientes estão com status **active**.\n\n💡 Diga: *"Quem precisa de atenção?"*`, [{ label: "Pipeline", route: "/onboarding-pipeline", type: "navigate" }], intent, "action", ctx);
        return fmt("Nenhum pendente", "✅", "info", "Nenhum aguardando onboarding.", "", [], intent, "action", ctx);
      }
      const md = awaiting.map(p => `- **${p.full_name}** — Status: \`${p.journey_status}\`\n  💡 *"libere onboarding da ${p.full_name.split(" ")[0]}"*`).join("\n");
      return fmt("Aguardando Onboarding", "📋", "list", `${awaiting.length} paciente(s)`,
        `## Pacientes aguardando onboarding\n\n${md}\n\n💡 *"libere onboarding da [nome]"* ou *"libere todos"*`,
        [{ label: "Pipeline", route: "/onboarding-pipeline", type: "navigate" }], intent, "action", ctx);
    }
    case "action_awaiting_payment": {
      const awaiting = patients.filter(p => ["awaiting_payment", "pending_payment", "invited"].includes(p.journey_status || ""));
      if (!awaiting.length) return fmt("Nenhum pendente", "✅", "info", "Todos com pagamento.", "", [], intent, "action", ctx);
      const md = awaiting.map(p => `- **${p.full_name}** — \`${p.journey_status}\``).join("\n");
      return fmt("Aguardando Pagamento", "💳", "list", `${awaiting.length} paciente(s)`, `## Pacientes aguardando pagamento\n\n${md}`, [{ label: "Financeiro", route: "/financial", type: "navigate" }], intent, "action", ctx);
    }
    case "action_no_diet": {
      const planPatientIds = new Set();
      const plans = await getMealPlans(supabase, userId, role);
      plans.forEach((pl: any) => planPatientIds.add(pl.patient_id));
      const noDiet = patients.filter(p => !planPatientIds.has(p.id) && !["awaiting_payment", "invited"].includes(p.journey_status || ""));
      if (!noDiet.length) return fmt("Todos com dieta", "✅", "info", "Todos com plano.", "", [], intent, "action", ctx);
      const md = noDiet.map(p => `- **${p.full_name}** — \`${p.journey_status || "ativo"}\``).join("\n");
      return fmt("Sem Dieta", "🍽️", "list", `${noDiet.length} sem plano`, `## Pacientes sem plano alimentar\n\n${md}`, [{ label: "Criar plano", route: "/meal-plans", type: "navigate" }], intent, "action", ctx);
    }
    case "action_awaiting_approval": {
      const awaiting = patients.filter(p => ["draft_ready_for_review", "onboarding_completed", "awaiting_consent"].includes(p.journey_status || ""));
      if (!awaiting.length) return fmt("Nenhum pendente", "✅", "info", "Nenhuma aprovação pendente.", "", [], intent, "action", ctx);
      const md = awaiting.map(p => `- **${p.full_name}** — \`${p.journey_status}\`\n  💡 *"libere onboarding da ${p.full_name.split(" ")[0]}"*`).join("\n");
      return fmt("Aguardando Aprovação", "⏳", "list", `${awaiting.length} pendente(s)`, `## Aguardando aprovação\n\n${md}`, [{ label: "Pipeline", route: "/onboarding-pipeline", type: "navigate" }], intent, "action", ctx);
    }
    case "action_set_premium": {
      if (!intent.target_name) return fmt("Quem?", "❓", "error", "Diga o nome.", "Ex: *coloque premium para Maria*", [], intent, "action", ctx);
      const { found, ambiguous } = findByName(patients, intent.target_name);
      if (ambiguous.length > 0) return fmt("Qual?", "🔍", "disambiguation", "Múltiplos", ambiguous.map((p: any, i: number) => `${i + 1}. **${p.full_name}**`).join("\n"), [], intent, "action", ctx);
      if (!found) return fmt("Não encontrado", "❌", "error", "Paciente não encontrado.", "", [], intent, "action", ctx);
      const { error } = await supabaseAdmin.from("user_subscriptions").upsert({ user_id: found.id, plan_type: "premium", is_active: true, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
      if (error) return fmt("Erro", "❌", "error", "Erro ao ativar.", error.message, [], intent, "action", ctx);
      ctx.last_patient_id = found.id; ctx.last_patient_name = found.full_name;
      return fmt("✅ Premium ativado!", "👑", "action_completed", `${found.full_name} agora é Premium.`,
        `## ✅ Premium ativado\n\n**Paciente:** ${found.full_name}\n**Ação:** Plano Premium ✓`,
        [{ label: "Abrir ficha", route: `/patients/${found.id}`, type: "navigate" }], intent, "action", ctx);
    }
    case "action_enable_ifj": {
      if (!intent.target_name) return fmt("Quem?", "❓", "error", "Diga o nome.", "Ex: *libere IFJ para Maria*", [], intent, "action", ctx);
      const { found, ambiguous } = findByName(patients, intent.target_name);
      if (ambiguous.length > 0) return fmt("Qual?", "🔍", "disambiguation", "Múltiplos", ambiguous.map((p: any, i: number) => `${i + 1}. **${p.full_name}**`).join("\n"), [], intent, "action", ctx);
      if (!found) return fmt("Não encontrado", "❌", "error", "Paciente não encontrado.", "", [], intent, "action", ctx);
      const { error } = await supabaseAdmin.from("ifj_patient_permissions").upsert({
        patient_id: found.id, ifj_mode: "standard", ifj_enabled: true,
        meal_plan: true, recipes: true, checklist: true, hydration: true,
        progress: true, appointments: true, substitutions: true, messages: true,
        smart_swap_suggestions: true, updated_at: new Date().toISOString(),
      }, { onConflict: "patient_id" });
      if (error) return fmt("Erro", "❌", "error", "Erro ao ativar IFJ.", error.message, [], intent, "action", ctx);
      ctx.last_patient_id = found.id; ctx.last_patient_name = found.full_name;
      return fmt("✅ IFJ ativada!", "🧠", "action_completed", `IFJ ativada para ${found.full_name}.`,
        `## ✅ IFJ ativada\n\n**Paciente:** ${found.full_name}\n**Modo:** Standard ✓`,
        [{ label: "Abrir ficha", route: `/patients/${found.id}`, type: "navigate" }], intent, "action", ctx);
    }
    case "action_compound_premium_ifj": {
      if (!intent.target_name) return fmt("Quem?", "❓", "error", "Diga o nome.", "Ex: *coloque premium e libere IFJ para Maria*", [], intent, "action", ctx);
      const { found, ambiguous } = findByName(patients, intent.target_name);
      if (ambiguous.length > 0) return fmt("Qual?", "🔍", "disambiguation", "Múltiplos", ambiguous.map((p: any, i: number) => `${i + 1}. **${p.full_name}**`).join("\n"), [], intent, "action", ctx);
      if (!found) return fmt("Não encontrado", "❌", "error", "Paciente não encontrado.", "", [], intent, "action", ctx);
      const [premRes, ifjRes] = await Promise.all([
        supabaseAdmin.from("user_subscriptions").upsert({ user_id: found.id, plan_type: "premium", is_active: true, updated_at: new Date().toISOString() }, { onConflict: "user_id" }),
        supabaseAdmin.from("ifj_patient_permissions").upsert({
          patient_id: found.id, ifj_mode: "standard", ifj_enabled: true,
          meal_plan: true, recipes: true, checklist: true, hydration: true,
          progress: true, appointments: true, substitutions: true, messages: true,
          smart_swap_suggestions: true, updated_at: new Date().toISOString(),
        }, { onConflict: "patient_id" }),
      ]);
      const errors = [premRes.error, ifjRes.error].filter(Boolean);
      if (errors.length) return fmt("Erro parcial", "⚠️", "error", "Erro parcial.", errors.map(e => e!.message).join(", "), [], intent, "action", ctx);
      ctx.last_patient_id = found.id; ctx.last_patient_name = found.full_name;
      return fmt("✅ Premium + IFJ!", "🚀", "action_completed", `${found.full_name}: Premium + IFJ.`,
        `## ✅ Ações executadas\n\n**Paciente:** ${found.full_name}\n\n- 👑 Premium ✓\n- 🧠 IFJ (standard) ✓`,
        [{ label: "Abrir ficha", route: `/patients/${found.id}`, type: "navigate" }], intent, "action", ctx);
    }
    default:
      return fmt("Ação não reconhecida", "❓", "error", "Não entendi.", "Tente: *coloque premium para [nome]*, *libere IFJ para [nome]*", [], intent, "action", ctx);
  }
}

// ═══════════════════════════════════════════════════════════════
// NUTRITION ENGINE — DB-driven food substitutions
// ═══════════════════════════════════════════════════════════════
async function runNutritionEngine(supabaseAdmin: any, intent: IFJIntent, userId: string, role: string, ctx: SessionCtx, inputText: string): Promise<IFJResponse> {
  if (intent.intent === "food_substitution") {
    // Check permissions for patient
    if (role === "patient") {
      const { data: perms } = await supabaseAdmin.from("ifj_patient_permissions").select("substitutions, smart_swap_suggestions, ifj_mode, ifj_enabled").eq("patient_id", userId).maybeSingle();
      if (perms?.ifj_enabled === false) return fmt("IFJ Desativada", "🔒", "access_denied", "IFJ não habilitada.", "🔒 Solicite ao seu nutricionista.", [], intent, "nutrition", ctx);
      if (perms?.substitutions === false) return fmt("Substituições desativadas", "🔒", "access_denied", "Substituições não liberadas.", "🔒 Solicite ao seu nutricionista a liberação.", [], intent, "nutrition", ctx);
    }

    const searchName = normalize(intent.target_name || "");
    if (!searchName) return fmt("Qual alimento?", "❓", "error", "Diga qual alimento substituir.", "Ex: *trocar pistache*, *no lugar de arroz*", [], intent, "nutrition", ctx);

    // Search food in DB
    const { data: foods } = await supabaseAdmin.from("ifj_food_database")
      .select("*").eq("is_active", true);

    const allFoods = foods || [];
    const match = allFoods.find((f: any) => normalize(f.food_name).includes(searchName) || searchName.includes(normalize(f.food_name)) || f.normalized_name.includes(searchName));
    if (!match) return fmt("Alimento não encontrado", "🔍", "info", `"${intent.target_name}" não encontrado.`, `📋 **${intent.target_name}** não está na base.\n\nConsulte seu nutricionista para alternativas.`, [], intent, "nutrition", ctx);

    // Get patient context for restrictions
    let allergies: string[] = [];
    let goal = "";
    let ifjMode = "standard";
    if (role === "patient") {
      const { data: anam } = await supabaseAdmin.from("patient_anamnesis").select("answers").eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (anam?.answers) {
        allergies = Array.isArray(anam.answers.allergies) ? anam.answers.allergies.map((a: any) => normalize(String(a))) : [];
      }
      const { data: profile } = await supabaseAdmin.from("profiles").select("goal").eq("user_id", userId).maybeSingle();
      goal = profile?.goal || "";
      const { data: perms } = await supabaseAdmin.from("ifj_patient_permissions").select("ifj_mode").eq("patient_id", userId).maybeSingle();
      ifjMode = perms?.ifj_mode || "standard";
    }

    // Get equivalents from DB
    const { data: equivalents } = await supabaseAdmin.from("ifj_food_equivalents")
      .select("*, target:target_food_id(*)").eq("source_food_id", match.id).eq("is_active", true)
      .order("similarity_score", { ascending: false });

    // Also get same-category foods as fallback
    const sameCat = allFoods.filter((f: any) => f.category === match.category && f.id !== match.id);

    // Filter out allergies
    const filterAllergy = (food: any) => {
      if (!allergies.length) return true;
      const tags = food.restriction_tags_json || [];
      return !allergies.some((a: string) => tags.some((t: string) => normalize(t).includes(a)));
    };

    // Build substitution list
    let subs: any[] = [];
    if (equivalents?.length) {
      subs = equivalents.filter((e: any) => e.target && filterAllergy(e.target))
        .map((e: any) => ({ ...e.target, similarity_score: e.similarity_score, is_preferred: e.is_preferred, notes: e.notes }));
    }

    // Fill with same-category if not enough
    if (subs.length < 5) {
      const existing = new Set(subs.map((s: any) => s.id));
      const extras = sameCat.filter((f: any) => !existing.has(f.id) && filterAllergy(f))
        .sort((a: any, b: any) => Math.abs(a.calories - match.calories) - Math.abs(b.calories - match.calories));
      subs = [...subs, ...extras.slice(0, 5 - subs.length).map((f: any) => ({ ...f, similarity_score: 0.7, is_preferred: false, notes: null }))];
    }

    // Apply mode limits
    const maxItems = ifjMode === "basic" ? 2 : ifjMode === "standard" ? 4 : 5;
    subs = subs.slice(0, maxItems);

    if (!subs.length) return fmt("Sem equivalentes", "🔍", "info", `Sem substituições para ${match.food_name}.`, "📋 Consulte seu nutricionista.", [], intent, "nutrition", ctx);

    const CATEGORY_LABELS: Record<string, string> = {
      proteina: "🥩 Proteínas", carboidrato: "🌾 Carboidratos", verdura: "🥦 Verduras",
      fruta: "🍎 Frutas", gordura: "🥑 Gorduras", laticinio: "🥛 Laticínios",
    };

    const catLabel = CATEGORY_LABELS[match.category] || match.category;
    let md = `## Substituições para ${match.food_name}\n\n`;
    md += `**Categoria:** ${catLabel}\n**Porção:** ${match.portion_reference} — ${match.calories}kcal | P:${match.protein}g | C:${match.carbs}g | G:${match.fats}g\n\n`;
    md += `| Opção | Porção | Kcal | P | C | G |\n|---|---|---|---|---|---|\n`;
    subs.forEach((s: any, i: number) => {
      const prefix = s.is_preferred ? "⭐ " : "";
      md += `| ${prefix}${s.food_name} | ${s.portion_reference} | ${s.calories} | ${s.protein}g | ${s.carbs}g | ${s.fats}g |\n`;
    });

    if (ifjMode === "standard" || ifjMode === "premium") {
      md += `\n💡 **Dica:** Mantenha a mesma categoria (${catLabel}) para equivalência nutricional.`;
    }
    if (ifjMode === "premium") {
      const best = subs.find((s: any) => s.is_preferred) || subs[0];
      md += `\n\n⭐ **Melhor escolha:** ${best.food_name} — ${best.notes || "Similaridade máxima em macros e calorias."}`;
      // Get goal rule
      if (goal) {
        const { data: goalRule } = await supabaseAdmin.from("ifj_goal_rules").select("default_guidance").eq("goal_key", normalize(goal)).maybeSingle();
        if (goalRule?.default_guidance) md += `\n\n🎯 **Observação para ${goal}:** ${goalRule.default_guidance}`;
      }
    }

    md += `\n\n---\n*📋 Baseado no seu plano alimentar — consulte seu nutricionista para ajustes.*`;

    return fmt(`Substituições: ${match.food_name}`, "🔄", "substitution", `${subs.length} opção(ões)`, md, [], intent, "nutrition", ctx);
  }

  // nutrition_question — contextual AI as LAST resort
  if (intent.intent === "nutrition_question") {
    if (role === "patient") {
      const { data: perms } = await supabaseAdmin.from("ifj_patient_permissions").select("allow_ai_last_resort, ifj_enabled").eq("patient_id", userId).maybeSingle();
      if (perms?.ifj_enabled === false) return fmt("IFJ Desativada", "🔒", "access_denied", "IFJ não habilitada.", "🔒 Solicite ao seu nutricionista.", [], intent, "nutrition", ctx);
      if (!perms?.allow_ai_last_resort) return fmt("Consulte seu nutricionista", "📋", "info", "Para essa dúvida, consulte seu nutricionista.", "📋 **Consulte seu nutricionista** para orientação personalizada.\n\n💡 Para substituições simples, diga: *\"trocar pistache\"* ou *\"no lugar de arroz\"*", [], intent, "nutrition", ctx);
    }

    // Load context
    const [{ data: profile }, { data: anam }, { data: plan }] = await Promise.all([
      supabaseAdmin.from("profiles").select("full_name, goal").eq("user_id", userId).maybeSingle(),
      supabaseAdmin.from("patient_anamnesis").select("answers").eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      supabaseAdmin.from("meal_plans").select("title, total_target_calories").eq("patient_id", userId).eq("is_active", true).limit(1).maybeSingle(),
    ]);

    if (!profile?.goal && !anam && !plan)
      return fmt("Consulte seu nutricionista", "📋", "info", "Dados insuficientes.", "📋 **Consulte seu nutricionista** — não há dados suficientes para responder com segurança.", [], intent, "nutrition", ctx);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return fmt("Consulte seu nutricionista", "📋", "info", "Recurso indisponível.", "📋 **Consulte seu nutricionista** para orientação personalizada.", [], intent, "nutrition", ctx);

    const allergies = anam?.answers?.allergies || [];
    const systemPrompt = `Você é o IFJ (Inteligência FitJourney), assistente nutricional integrado.

REGRAS CRÍTICAS:
1. NÃO é chatbot genérico. Só responda com base no contexto.
2. NÃO invente recomendações fora do contexto.
3. NÃO sugira alimentos proibidos ou alérgenos.
4. Se não souber, diga: "Consulte seu nutricionista."
5. Máximo 150 palavras. Markdown.

CONTEXTO:
- Nome: ${profile?.full_name || "Paciente"}
- Objetivo: ${profile?.goal || "Não informado"}
- Alergias: ${allergies.length ? allergies.join(", ") : "Nenhuma"}
- Plano: ${plan ? plan.title + " (" + (plan.total_target_calories || "?") + "kcal)" : "Sem plano ativo"}`;

    try {
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-lite",
          messages: [{ role: "system", content: systemPrompt }, { role: "user", content: inputText }],
          max_tokens: 400, temperature: 0.3,
        }),
      });
      if (!response.ok) return fmt("Consulte seu nutricionista", "📋", "info", "Serviço indisponível.", "📋 **Consulte seu nutricionista.**", [], intent, "nutrition", ctx);
      const aiData = await response.json();
      const aiText = aiData.choices?.[0]?.message?.content || "Consulte seu nutricionista.";
      return fmt("🧠 Assistente Nutricional", "🍎", "nutrition_response", "Resposta contextualizada",
        `${aiText}\n\n---\n*🔬 Baseado no seu perfil — consulte seu nutricionista para ajustes.*`, [], intent, "nutrition", ctx);
    } catch {
      return fmt("Consulte seu nutricionista", "📋", "info", "Erro.", "📋 **Consulte seu nutricionista.**", [], intent, "nutrition", ctx);
    }
  }

  return fmt("Não entendi", "❓", "error", "Comando nutricional não reconhecido.", "", [], intent, "nutrition", ctx);
}

// ═══════════════════════════════════════════════════════════════
// DOMAIN ENGINES (clinical, behavioral, financial, training, journey)
// ═══════════════════════════════════════════════════════════════

async function runClinicalEngine(supabase: any, intent: IFJIntent, userId: string, ctx: SessionCtx, patients: PatientRecord[], today: string, role?: string): Promise<IFJResponse> {
  const patientIds = patients.map(p => p.id);
  const safeIds = patientIds.length ? patientIds : ["00000000-0000-0000-0000-000000000000"];

  switch (intent.intent) {
    case "patients_attention": {
      const snapshots = await getSnapshots(supabase, safeIds, today);
      const atRisk = snapshots.filter((s: any) => s.risk_level === "high" || s.risk_level === "critical")
        .sort((a: any, b: any) => (b.dropout_risk_score || 0) - (a.dropout_risk_score || 0));
      if (!atRisk.length) return fmt("Nenhum em risco", "✅", "info", "Carteira estável.", "✅ Todos dentro dos parâmetros.", [], intent, "clinical", ctx);
      const md = `| Paciente | Risco | Adesão | Dropout |\n|---|---|---|---|\n` + atRisk.map((s: any) => { const p = patients.find(x => x.id === s.patient_id); return `| **${p?.full_name || "?"}** | ${s.risk_level} | ${s.adherence_score || 0}% | ${s.dropout_risk_score || 0}% |`; }).join("\n");
      return fmt("Pacientes em risco", "⚠️", "priority_list", `${atRisk.length} em risco`, md, [{ label: "Control Tower", route: "/control-tower", type: "navigate" }], intent, "clinical", ctx);
    }
    case "patients_improved": {
      const snapshots = await getSnapshots(supabase, safeIds, today);
      const improved = snapshots.filter((s: any) => s.momentum_direction === "up" || (s.adherence_score && s.adherence_score >= 80));
      if (!improved.length) return fmt("Sem destaques", "📊", "info", "Nenhuma melhora expressiva.", "", [], intent, "clinical", ctx);
      const md = improved.map((s: any) => { const p = patients.find(x => x.id === s.patient_id); return `- **${p?.full_name}** — Adesão: ${s.adherence_score}% | Tendência: ${s.weight_trend || "?"}`; }).join("\n");
      return fmt("Pacientes em evolução", "🌟", "list", `${improved.length} evoluindo`, md, [], intent, "clinical", ctx);
    }
    case "patient_detail": {
      let patient: PatientRecord | undefined;
      if (intent.target_id) patient = patients.find(p => p.id === intent.target_id);
      else if (intent.target_name) {
        const { found, ambiguous } = findByName(patients, intent.target_name);
        if (ambiguous.length > 0) return buildDisambiguation(ambiguous, intent, inputText || intent.target_name || "", ctx, "clinical");
        }
        patient = found;
      }
      if (!patient) return fmt("Não encontrado", "❌", "error", "Nenhum paciente.", "Verifique a grafia.", [], intent, "clinical", ctx);
      ctx.last_patient_id = patient.id; ctx.last_patient_name = patient.full_name; ctx.last_entity_type = "patient"; ctx.last_entity_id = patient.id;
      const overview = await getPatientOverview(supabase, patient.id, today);
      const s = overview.snapshot;
      const md = `## ${patient.full_name}\n\n| Campo | Valor |\n|---|---|\n` +
        `| Status | ${patient.journey_status || patient.status} |\n| Objetivo | ${patient.goal || "—"} |\n| Peso | ${s?.current_weight || "—"} kg |\n` +
        `| Adesão | ${s?.adherence_score ?? "—"}% |\n| Risco | ${s?.risk_level || "—"} |\n| Dropout | ${s?.dropout_risk_score ?? "—"}% |\n` +
        `| Peso tendência | ${s?.weight_trend || "—"} |\n| Alertas | ${overview.alerts.length} |\n| Plano | ${overview.activePlan?.title || "Nenhum"} |` +
        (overview.activePlan?.end_date ? `\n| Vence | ${overview.activePlan.end_date} |` : "");
      const actions = [{ label: "Abrir ficha", route: `/patients/${patient.id}`, type: "navigate" }];
      if (overview.activePlan?.id) actions.push({ label: "Ver plano", route: `/meal-plans/${overview.activePlan.id}`, type: "navigate" });
      return fmt(`Ficha: ${patient.full_name}`, "👤", "detail", `Resumo de ${patient.full_name}`, md, actions, intent, "clinical", ctx);
    }
    case "anamnesis": {
      let pid = intent.target_id || ctx.last_patient_id;
      if (!pid && intent.target_name) {
        const { found, ambiguous } = findByName(patients, intent.target_name);
        if (ambiguous.length > 0) return buildDisambiguation(ambiguous, intent, inputText || intent.target_name || "", ctx, "clinical");
        }
        if (found) { pid = found.id; ctx.last_patient_id = found.id; ctx.last_patient_name = found.full_name; }
      }
      if (!pid) return fmt("Quem?", "❓", "error", "Diga o nome do paciente.", "Ex: *anamnese da Maria*", [], intent, "clinical", ctx);
      const anam = await getPatientAnamnesis(supabase, pid);
      if (!anam) return fmt("Sem anamnese", "📋", "info", "Nenhuma encontrada.", "Ainda não há anamnese registrada.", [{ label: "Abrir ficha", route: `/patients/${pid}`, type: "navigate" }], intent, "clinical", ctx);
      const p = patients.find(x => x.id === pid);
      const answers = anam.answers || {};
      const md = `## Anamnese — ${p?.full_name}\n\n- **Status**: ${anam.status}\n- **Data**: ${new Date(anam.created_at).toLocaleDateString("pt-BR")}\n\n` +
        Object.entries(answers).slice(0, 15).map(([k, v]) => `- **${k}**: ${typeof v === "object" ? JSON.stringify(v) : v}`).join("\n");
      return fmt(`Anamnese: ${p?.full_name}`, "📋", "detail", "Dados da anamnese", md, [{ label: "Abrir ficha", route: `/patients/${pid}`, type: "navigate" }], intent, "clinical", ctx);
    }
    case "lab_exams": {
      let pid = intent.target_id || ctx.last_patient_id;
      if (!pid && intent.target_name) {
        const { found, ambiguous } = findByName(patients, intent.target_name);
        if (ambiguous.length > 0) return buildDisambiguation(ambiguous, intent, inputText || intent.target_name || "", ctx, "clinical");
        if (found) { pid = found.id; ctx.last_patient_id = found.id; ctx.last_patient_name = found.full_name; }
      }
      if (!pid) return fmt("Quem?", "❓", "error", "Diga o nome do paciente.", "Ex: *exames da Maria*", [], intent, "clinical", ctx);
      const labs = await getPatientLabSummary(supabase, pid);
      if (!labs.length) return fmt("Sem exames", "🔬", "info", "Nenhum exame registrado.", "", [{ label: "Abrir ficha", route: `/patients/${pid}`, type: "navigate" }], intent, "clinical", ctx);
      const p = patients.find(x => x.id === pid);
      const md = `## Exames — ${p?.full_name}\n\n| Marcador | Valor | Ref | Status |\n|---|---|---|---|\n` +
        labs.map((l: any) => { const val = parseFloat(l.value); const low = l.reference_min != null ? parseFloat(l.reference_min) : null; const high = l.reference_max != null ? parseFloat(l.reference_max) : null; let status = "✅"; if (low != null && val < low) status = "⬇️"; if (high != null && val > high) status = "⬆️"; return `| ${l.marker_name} | ${l.value} ${l.unit || ""} | ${low || "—"}-${high || "—"} | ${status} |`; }).join("\n");
      return fmt(`Exames: ${p?.full_name}`, "🔬", "detail", `${labs.length} marcadores`, md, [{ label: "Abrir ficha", route: `/patients/${pid}`, type: "navigate" }], intent, "clinical", ctx);
    }
    case "lab_pending": return fmt("Exames pendentes", "🔬", "info", "Em desenvolvimento", "🔬 Consulte por paciente.", [], intent, "clinical", ctx);
    case "meal_plan": {
      let pid = intent.target_id || ctx.last_patient_id;
      // Resolve patient by name if no ID
      if (!pid && intent.target_name) {
        const { found, ambiguous } = findByName(patients, intent.target_name);
        if (ambiguous.length > 0) return buildDisambiguation(ambiguous, intent, inputText || intent.target_name || "", ctx, "clinical");
        if (found) { pid = found.id; ctx.last_patient_id = found.id; ctx.last_patient_name = found.full_name; }
      }
      if (!pid) return fmt("Quem?", "❓", "error", "Diga o nome do paciente.", "Ex: *plano alimentar da Maria*", [], intent, "clinical", ctx);
      const { data: plan } = await supabase.from("meal_plans").select("id, title, plan_status, is_active, start_date, end_date, total_target_calories").eq("patient_id", pid).eq("is_active", true).limit(1).maybeSingle();
      const p = patients.find(x => x.id === pid);
      if (!plan) {
        // Check for inactive/old plans
        const { data: oldPlans } = await supabase.from("meal_plans").select("id, title, plan_status, end_date").eq("patient_id", pid).eq("is_active", false).order("end_date", { ascending: false }).limit(3);
        const hasOldPlans = oldPlans && oldPlans.length > 0;
        const oldPlansMd = hasOldPlans
          ? `\n\n### Planos anteriores\n${oldPlans.map((op: any) => `- **${op.title}** — ${op.plan_status} (até ${op.end_date || "—"})`).join("\n")}`
          : "";
        const actions = [
          { label: "Criar plano", route: "/meal-plans", type: "navigate" },
          { label: "Abrir ficha", route: `/patients/${pid}`, type: "navigate" },
        ];
        if (hasOldPlans) actions.push({ label: "Ver planos antigos", route: `/patients/${pid}`, type: "navigate" });
        return fmt("Sem plano ativo", "🍽️", "info", `${p?.full_name} não possui plano alimentar ativo.`,
          `## ${p?.full_name} — Sem plano ativo\n\nEste paciente não possui um plano alimentar ativo no momento.\n\n💡 **Ações sugeridas:**\n- Criar um novo plano alimentar\n- Revisar planos anteriores${oldPlansMd}`,
          actions, intent, "clinical", ctx);
      }
      const daysLeft = plan.end_date ? Math.ceil((new Date(plan.end_date).getTime() - Date.now()) / 86400000) : null;
      const md = `## ${plan.title}\n\n- Status: ${plan.plan_status}\n- Início: ${plan.start_date || "—"}\n- Fim: ${plan.end_date || "—"}\n- Calorias: ${plan.total_target_calories || "—"} kcal` + (daysLeft != null ? `\n- **Vence em ${daysLeft}d**` : "");
      return fmt(`Plano: ${p?.full_name}`, "🍽️", "detail", plan.title, md, [{ label: "Editar", route: `/meal-plans/${plan.id}`, type: "navigate" }], intent, "clinical", ctx);
    }
    case "meal_plan_expiring": {
      const allPlans = await getMealPlans(supabase, userId, role);
      const soon = allPlans.filter((pl: any) => { if (!pl.end_date) return false; const d = Math.ceil((new Date(pl.end_date).getTime() - Date.now()) / 86400000); return d <= 5 && d >= -2; });
      if (!soon.length) return fmt("Nenhum vencendo", "✅", "info", "Todos válidos.", "", [], intent, "clinical", ctx);
      const md = soon.map((pl: any) => { const p = patients.find(x => x.id === pl.patient_id); const d = Math.ceil((new Date(pl.end_date).getTime() - Date.now()) / 86400000); return `- **${p?.full_name || "?"}** — ${pl.title} — ${d < 0 ? "VENCIDO" : `${d}d`}`; }).join("\n");
      return fmt("Planos vencendo", "⏰", "list", `${soon.length} plano(s)`, md, [{ label: "Ver planos", route: "/meal-plans", type: "navigate" }], intent, "clinical", ctx);
    }
    case "clinical_alerts": {
      const alerts = await getActiveAlerts(supabase, userId, role);
      if (!alerts.length) return fmt("Sem alertas", "✅", "info", "Nenhum alerta.", "", [], intent, "clinical", ctx);
      const md = `| Paciente | Alerta | Severidade |\n|---|---|---|\n` + alerts.map((a: any) => { const p = patients.find(x => x.id === a.patient_id); return `| ${p?.full_name || "?"} | ${a.title} | ${a.severity} |`; }).join("\n");
      return fmt("Alertas Clínicos", "🔔", "list", `${alerts.length} alerta(s)`, md, [{ label: "Control Tower", route: "/control-tower", type: "navigate" }], intent, "clinical", ctx);
    }
    case "clinical_summary":
    case "portfolio_health": {
      const { snapshots, alerts, plans, transactions } = await getPortfolioInputs(supabase, userId, patientIds, today, role);
      const priorities = calculatePriorities(patients, snapshots, alerts, plans, transactions);
      const critical = priorities.filter(p => p.level === "critical").length;
      const high = priorities.filter(p => p.level === "high").length;
      const avgAdherence = snapshots.length ? Math.round(snapshots.reduce((s: number, x: any) => s + (x.adherence_score || 0), 0) / snapshots.length) : 0;
      const pendingTx = transactions.filter((t: any) => t.status === "pending" || t.status === "pendente");
      const md = `## Panorama\n\n| Métrica | Valor |\n|---|---|\n` +
        `| Pacientes | **${patients.length}** |\n| Críticos | **${critical}** |\n| Altos | **${high}** |\n` +
        `| Alertas | **${alerts.length}** |\n| Adesão média | **${avgAdherence}%** |\n| Planos ativos | **${plans.length}** |\n| Pendências | **${pendingTx.length}** |`;
      return fmt("Panorama", "📊", "overview", `${patients.length} pacientes, ${critical} críticos`, md, [{ label: "Control Tower", route: "/control-tower", type: "navigate" }], intent, "clinical", ctx);
    }
    default: return fmt("Não reconhecido", "❓", "error", "Comando clínico desconhecido.", "", [], intent, "clinical", ctx);
  }
}

async function runBehavioralEngine(supabase: any, intent: IFJIntent, userId: string, ctx: SessionCtx, patients: PatientRecord[], today: string): Promise<IFJResponse> {
  switch (intent.intent) {
    case "checklist_status": {
      let pid = intent.target_id || ctx.last_patient_id;
      // Resolve patient by name if target_name is present
      if (!pid && intent.target_name) {
        const { found, ambiguous } = findByName(patients, intent.target_name);
        if (ambiguous.length > 0) return buildDisambiguation(ambiguous, intent, inputText || intent.target_name || "", ctx, "behavioral");
        if (found) { pid = found.id; ctx.last_patient_id = found.id; ctx.last_patient_name = found.full_name; }
      }
      if (pid) {
        const { data: tasks } = await supabase.from("checklist_tasks").select("id, title, completed, category").eq("patient_id", pid).eq("date", today);
        const total = (tasks || []).length; const done = (tasks || []).filter((t: any) => t.completed).length;
        const p = patients.find(x => x.id === pid);
        return fmt(`Checklist: ${p?.full_name}`, "✅", "detail", `${done}/${total}`,
          `**${done}/${total}** tarefas\n\n` + (tasks || []).map((t: any) => `- ${t.completed ? "✅" : "⬜"} ${t.title}`).join("\n"),
          [{ label: "Abrir ficha", route: `/patients/${pid}`, type: "navigate" }], intent, "behavioral", ctx);
      }
      const snapshots = await getSnapshots(supabase, patients.map(p => p.id).length ? patients.map(p => p.id) : ["00000000-0000-0000-0000-000000000000"], today);
      const lowAdh = snapshots.filter((s: any) => s.checklist_completion_rate != null && s.checklist_completion_rate < 50);
      if (!lowAdh.length) return fmt("Checklists OK", "✅", "info", "Boa adesão geral.", "Todos os pacientes com checklist acima de 50%.", [], intent, "behavioral", ctx);
      const md = lowAdh.map((s: any) => { const p = patients.find(x => x.id === s.patient_id); return `- **${p?.full_name || "?"}** — ${s.checklist_completion_rate}%`; }).join("\n");
      return fmt("Checklist baixo", "📋", "list", `${lowAdh.length} < 50%`, md, [], intent, "behavioral", ctx);
    }
    case "hydration": return fmt("Hidratação", "💧", "info", "Consulte checklist.", "Diga o nome do paciente.", [], intent, "behavioral", ctx);
    default: return fmt("Não reconhecido", "🧠", "error", "", "", [], intent, "behavioral", ctx);
  }
}

async function runFinancialEngine(supabase: any, intent: IFJIntent, userId: string, ctx: SessionCtx, patients: PatientRecord[], role?: string): Promise<IFJResponse> {
  const transactions = await getFinancialSummary(supabase, userId, role);
  switch (intent.intent) {
    case "financial_overview": {
      const income = transactions.filter((t: any) => t.type === "income" || t.type === "receita");
      const pending = transactions.filter((t: any) => t.status === "pending" || t.status === "pendente");
      const totalIncome = income.reduce((s: number, t: any) => s + (t.amount || 0), 0);
      const totalPending = pending.reduce((s: number, t: any) => s + (t.amount || 0), 0);
      const md = `## Financeiro\n\n| Métrica | Valor |\n|---|---|\n| Receitas | R$ ${totalIncome.toFixed(2)} |\n| Pendente | R$ ${totalPending.toFixed(2)} |\n| Total transações | ${transactions.length} |`;
      return fmt("Financeiro", "💰", "overview", `R$ ${totalIncome.toFixed(2)} | Pendente: R$ ${totalPending.toFixed(2)}`, md, [{ label: "Financeiro", route: "/financial", type: "navigate" }], intent, "financial", ctx);
    }
    case "financial_pending": {
      const pending = transactions.filter((t: any) => t.status === "pending" || t.status === "pendente");
      if (!pending.length) return fmt("Sem pendências", "✅", "info", "Nenhum pendente.", "", [], intent, "financial", ctx);
      const md = pending.map((t: any) => `- R$ ${(t.amount || 0).toFixed(2)} — ${t.description || t.category || "?"} — ${t.date || "?"}`).join("\n");
      return fmt("Cobranças pendentes", "💳", "list", `${pending.length} pendente(s)`, md, [{ label: "Financeiro", route: "/financial", type: "navigate" }], intent, "financial", ctx);
    }
    default: return fmt("Não reconhecido", "💰", "error", "", "", [], intent, "financial", ctx);
  }
}

async function runTrainingEngine(supabase: any, intent: IFJIntent, userId: string, ctx: SessionCtx): Promise<IFJResponse> {
  const students = await getStudents(supabase, userId);
  const studentIds = students.map(s => s.id);
  switch (intent.intent) {
    case "workout_overview":
      return fmt("Treinos", "🏋️", "overview", `${students.length} aluno(s)`, `**${students.length}** alunos ativos.`, [{ label: "Ver treinos", route: "/workouts", type: "navigate" }], intent, "training", ctx);
    case "workout_pain": {
      const feedback = await getWorkoutFeedback(supabase, studentIds);
      const withPain = feedback.filter((f: any) => f.pain_reported);
      if (!withPain.length) return fmt("Sem dores", "✅", "info", "Nenhum com dor.", "", [], intent, "training", ctx);
      const md = withPain.map((f: any) => { const s = students.find(x => x.id === f.patient_id); return `- **${s?.full_name || "?"}** — ${f.pain_location || "?"} — ${f.session_date}`; }).join("\n");
      return fmt("Alunos com dor", "🤕", "list", `${withPain.length} relato(s)`, md, [], intent, "training", ctx);
    }
    case "student_detail": {
      if (!intent.target_name) return fmt("Quem?", "❓", "error", "Diga o nome.", "", [], intent, "training", ctx);
      const { found, ambiguous } = findByName(students, intent.target_name);
      if (ambiguous.length > 0) return fmt("Múltiplos", "🔍", "disambiguation", `${ambiguous.length}`, ambiguous.map((s: any, i: number) => `${i + 1}. **${s.full_name}**`).join("\n"), [], intent, "training", ctx);
      if (!found) return fmt("Não encontrado", "❌", "error", "", "", [], intent, "training", ctx);
      ctx.last_student_id = found.id; ctx.last_student_name = found.full_name;
      return fmt(`Aluno: ${found.full_name}`, "🏋️", "detail", found.full_name, `## ${found.full_name}\n\n- Objetivo: ${found.goal || "—"}`, [], intent, "training", ctx);
    }
    default: return fmt("Não reconhecido", "🏋️", "error", "", "", [], intent, "training", ctx);
  }
}

async function runJourneyEngine(supabase: any, intent: IFJIntent, userId: string, ctx: SessionCtx, patients: PatientRecord[], today: string, role?: string): Promise<IFJResponse> {
  switch (intent.intent) {
    case "appointments": {
      let query = supabase.from("patient_appointments").select("id, patient_id, appointment_date, appointment_time, status, appointment_type");
      if (role !== "admin") query = query.eq("nutritionist_id", userId);
      const { data: appts } = await query.gte("appointment_date", today).order("appointment_date", { ascending: true }).limit(10);
      if (!appts?.length) return fmt("Sem consultas", "📅", "info", "Nenhuma agendada.", "", [{ label: "Agendar", route: "/appointments", type: "navigate" }], intent, "journey", ctx);
      const md = `| Paciente | Data | Hora | Tipo | Status |\n|---|---|---|---|---|\n` + appts.map((a: any) => { const p = patients.find(x => x.id === a.patient_id); return `| ${p?.full_name || "?"} | ${a.appointment_date} | ${a.appointment_time || "—"} | ${a.appointment_type || "—"} | ${a.status} |`; }).join("\n");
      return fmt("Consultas", "📅", "list", `${appts.length} consulta(s)`, md, [{ label: "Agenda", route: "/appointments", type: "navigate" }], intent, "journey", ctx);
    }
    case "journey_status": {
      const pid = ctx.last_patient_id;
      if (!pid) return fmt("Quem?", "❓", "error", "Diga o nome.", "", [], intent, "journey", ctx);
      const p = patients.find(x => x.id === pid);
      return fmt(`Jornada: ${p?.full_name}`, "🗺️", "detail", `Status: ${p?.journey_status || p?.status}`,
        `## Jornada — ${p?.full_name}\n\n- Status: **${p?.journey_status || p?.status}**\n- Objetivo: ${p?.goal || "—"}`,
        [{ label: "Ver ficha", route: `/patients/${pid}`, type: "navigate" }], intent, "journey", ctx);
    }
    default: return fmt("Não reconhecido", "🗺️", "error", "", "", [], intent, "journey", ctx);
  }
}

async function runPriorityEngine(supabase: any, intent: IFJIntent, userId: string, ctx: SessionCtx, patients: PatientRecord[], today: string, role?: string): Promise<IFJResponse> {
  const patientIds = patients.map(p => p.id);
  const { snapshots, alerts, plans, transactions } = await getPortfolioInputs(supabase, userId, patientIds, today, role);
  const priorities = calculatePriorities(patients, snapshots, alerts, plans, transactions);
  await syncPriorityQueue(supabase, userId, priorities);

  if (intent.intent === "next_best_action") {
    const top = priorities[0];
    if (!top) return fmt("Nada urgente", "✅", "action", "Sem ação prioritária.", "🎉 Pacientes estáveis!", [], intent, "priority", ctx);
    return fmt("Próxima Ação", "🎯", "action", `${top.entity_name} (${top.score}pts)`,
      `## 🎯 Ação recomendada\n\n**Paciente:** ${top.entity_name}\n**Score:** ${top.score}/100\n**Nível:** ${top.level}\n\n**Motivos:**\n${top.reasons.map(r => `- ${r}`).join("\n")}`,
      [{ label: `Abrir ${top.entity_name}`, route: `/patients/${top.entity_id}`, type: "navigate" }], intent, "priority", ctx);
  }

  if (!priorities.length) return fmt("Dia tranquilo", "✅", "info", "Sem prioridades.", "🎉 Estável!", [], intent, "priority", ctx);
  const critical = priorities.filter(p => p.level === "critical");
  const high = priorities.filter(p => p.level === "high");
  const medium = priorities.filter(p => p.level === "medium");
  const expiringPlans = plans.filter((pl: any) => { if (!pl.end_date) return false; const d = Math.ceil((new Date(pl.end_date).getTime() - Date.now()) / 86400000); return d <= 3 && d >= -1; });
  const pendingPayments = transactions.filter((t: any) => t.status === "pending" || t.status === "pendente");

  let md = `## 📋 Prioridades do Dia\n\n| Indicador | Qtd |\n|---|---|\n`;
  md += `| 🔴 Crítico | ${critical.length} |\n| 🟠 Alto | ${high.length} |\n| 🟡 Médio | ${medium.length} |\n| ⏰ Planos vencendo | ${expiringPlans.length} |\n| 💳 Pagamentos | ${pendingPayments.length} |\n\n`;
  if (critical.length) md += `### 🔴 Críticos\n\n` + critical.slice(0, 5).map(p => `- **${p.entity_name}** (${p.score}pts) — ${p.reasons.join(", ")}`).join("\n") + "\n\n";
  if (high.length) md += `### 🟠 Alta Prioridade\n\n` + high.slice(0, 5).map(p => `- **${p.entity_name}** (${p.score}pts) — ${p.reasons.join(", ")}`).join("\n") + "\n\n";

  return fmt("Prioridades", "📋", "priority_list", `${critical.length} crítico(s), ${high.length} alto(s)`, md, [{ label: "Control Tower", route: "/control-tower", type: "navigate" }], intent, "priority", ctx);
}

// ═══════════════════════════════════════════════════════════════
// MAIN ROUTER v6.0 — DB-Driven Brain
// ═══════════════════════════════════════════════════════════════
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const startTime = Date.now();

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Missing auth" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json();
    const inputText = body.input_text || body.question || body.command || "";
    const forceTargetId = body.target_id || null; // From disambiguation re-execution
    const sessionKey = body.session_key || "default";
    const today = new Date().toISOString().split("T")[0];

    // 1. Get Role
    const role = await getUserRole(supabaseAdmin, user.id);
    const { data: profileData } = await supabase.from("profiles").select("full_name").eq("user_id", user.id).maybeSingle();
    const userName = profileData?.full_name?.split(" ")[0] || "Profissional";

    // 2. LOAD BRAIN FROM DATABASE
    const brain = await loadBrain(supabaseAdmin);

    // 3. Patient IFJ access gate
    let patientPerms: any = null;
    if (role === "patient") {
      const { hasAccess, perms } = await checkPatientIFJAccess(supabaseAdmin, user.id);
      patientPerms = perms;
      if (!hasAccess) {
        return new Response(JSON.stringify({
          title: "IFJ Desativada", icon: "🔒", response_type: "access_denied",
          summary: "IFJ não habilitada.", body_markdown: "🔒 **Acesso negado**\n\nSolicite ao seu profissional.",
          actions: [], meta: { intent: "access_denied", confidence: 1, data_source: "system", engine: "access_gate", used_context: false },
          sessionContext: {},
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    if (role === "unknown") {
      return new Response(JSON.stringify({ error: "Role não identificada." }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 4. Load Session Context
    const ctx = await loadSessionContext(supabase, user.id, sessionKey);

    // 5. Detect Intent FROM DATABASE
    const n = normalize(inputText);
    const intent = detectIntentFromDB(n, ctx, brain.intents, brain.phraseMap, role);

    // 5b. Override target_id if disambiguation re-execution
    if (forceTargetId) {
      intent.target_id = forceTargetId;
      intent.needs_disambiguation = false;
    }

    // 6. Apply Guardrails
    const guardResult = applyGuardrails(intent, role, brain.guardrails, patientPerms, ctx);
    if (guardResult.blocked) {
      const blockedResponse = fmt("Bloqueado", "🔒", "guardrail_blocked", guardResult.message, guardResult.message, [], intent, "guardrails", ctx);
      const elapsed = Date.now() - startTime;
      await logIntent(supabaseAdmin, user.id, role, inputText, n, intent, "guardrail_blocked", "guardrails", elapsed, guardResult.message);
      return new Response(JSON.stringify(blockedResponse), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 7. Fetch patients ONCE — SCOPED BY ROLE
    const needsPatients = !["navigation", "general"].includes(intent.module);
    let patients: PatientRecord[] = [];

    if (needsPatients) {
      if (role === "patient") {
        const { data: p } = await supabase.from("profiles").select("user_id, full_name, goal").eq("user_id", user.id).maybeSingle();
        if (p) patients = [{ id: p.user_id, full_name: p.full_name, goal: p.goal, journey_status: null, status: "active" }];
      } else if (role === "personal" && intent.module === "training_engine") {
        // handled inside training engine
      } else {
        patients = await getPatients(supabaseAdmin, user.id, role);
      }
    }

    let response: IFJResponse;

    // 8. Route to correct engine
    try {
      if (intent.intent === "greeting") {
        const pts = patients.length || (await getPatients(supabaseAdmin, user.id, role)).length;
        const hour = new Date().getHours();
        const period = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
        response = fmt(`${period}, ${userName}!`, "👋", "greeting", `${pts} pacientes ativos.`,
          `${period}, **${userName}**! 👋\n\n**${pts}** pacientes ativos.\n\nPergunte:\n- *"O que preciso resolver hoje?"*\n- *"Quem precisa de atenção?"*\n- *"Quem está sem dieta?"*\n- *"Quem está aguardando onboarding?"*\n- *"Resumo da carteira"*\n- *"Ajuda"* para todos os comandos`,
          [], intent, "general", ctx);
      }
      else if (intent.intent === "help") {
        response = fmt("Comandos IFJ Core", "📚", "help", "Comandos disponíveis",
          `## Comandos disponíveis\n\n### 🎯 Prioridades\n- *"O que preciso resolver hoje?"*\n- *"Próxima melhor ação"*\n\n### 👥 Pacientes\n- *"Quem precisa de atenção?"*\n- *"Quem melhorou?"*\n- *"Sobre [nome]"*\n\n### ⚡ Ações rápidas\n- *"Libere onboarding da [nome]"*\n- *"Libere todos"*\n- *"Quem está aguardando onboarding?"*\n- *"Quem está sem dieta?"*\n- *"Quem não pagou?"*\n- *"Coloque premium para [nome]"*\n- *"Libere IFJ para [nome]"*\n- *"Coloque premium e libere IFJ para [nome]"*\n\n### 📋 Clínico\n- *"Planos vencendo"*\n- *"Alertas clínicos"*\n- *"Resumo da carteira"*\n\n### 💰 Financeiro\n- *"Resumo financeiro"*\n- *"Cobranças pendentes"*\n\n### 🏋️ Treinos\n- *"Alunos com dor"*\n\n### 📅 Agenda\n- *"Consultas"*\n\n### 🧭 Navegação\n- *"Abrir financeiro"*\n- *"Ir para Control Tower"*\n\n### 🍎 Nutrição (pacientes)\n- *"Trocar pistache"*\n- *"No lugar de arroz"*`,
          [], intent, "general", ctx);
      }
      else if (intent.intent === "navigate") {
        const nav = resolveNavigation(n);
        response = nav
          ? fmt(`Abrindo: ${nav.label}`, "🧭", "navigate", `Abrindo ${nav.label}`, `Abrindo **${nav.label}**...`,
              [{ label: nav.label, route: nav.route, type: "navigate" }], intent, "navigation", ctx)
          : fmt("Não encontrado", "❓", "error", "Tela não encontrada.", "Tente: *abrir financeiro*, *ir para pacientes*", [], intent, "navigation", ctx);
      }
      else if (intent.module === "action_engine") {
        response = await runActionEngine(supabaseAdmin, supabase, intent, user.id, ctx, patients, role);
      }
      else if (intent.module === "priority_engine") {
        response = await runPriorityEngine(supabaseAdmin, intent, user.id, ctx, patients, today, role);
      }
      else if (intent.module === "clinical_engine") {
        response = await runClinicalEngine(supabaseAdmin, intent, user.id, ctx, patients, today, role);
      }
      else if (intent.module === "behavioral_engine") {
        response = await runBehavioralEngine(supabaseAdmin, intent, user.id, ctx, patients, today);
      }
      else if (intent.module === "financial_engine") {
        response = await runFinancialEngine(supabaseAdmin, intent, user.id, ctx, patients, role);
      }
      else if (intent.module === "training_engine") {
        response = await runTrainingEngine(supabaseAdmin, intent, user.id, ctx);
      }
      else if (intent.module === "journey_engine") {
        response = await runJourneyEngine(supabaseAdmin, intent, user.id, ctx, patients, today, role);
      }
      else if (intent.module === "nutrition_engine") {
        response = await runNutritionEngine(supabaseAdmin, intent, user.id, role, ctx, inputText);
      }
      else {
        // Smart suggestion engine: detect partial keyword matches and suggest
        const suggestions = generateSmartSuggestions(n, brain.intents, brain.phraseMap, role);
        if (suggestions.length > 0) {
          const sugMd = `🤔 Não entendi exatamente, mas talvez você queira:\n\n` +
            suggestions.map(s => `- 💡 **${s.label}** → *"${s.example}"*`).join("\n") +
            `\n\n---\nDiga *"ajuda"* para ver todos os comandos.`;
          const sugActions = suggestions
            .filter(s => {
              // If suggestion maps to a nav route, add action button
              const navKey = Object.keys(NAV_MAP).find(k => s.example.includes(k));
              return !!navKey;
            })
            .map(s => {
              const navKey = Object.keys(NAV_MAP).find(k => s.example.includes(k));
              const nav = navKey ? NAV_MAP[navKey] : null;
              return nav ? { label: `Abrir ${nav.label}`, route: nav.route, type: "navigate" } : null;
            })
            .filter(Boolean) as any[];
          response = fmt("Você quis dizer...", "💡", "suggestions", "Sugestões baseadas na sua pergunta", sugMd, sugActions, intent, "suggestion_engine", ctx);
        } else {
          response = fmt("Não entendi", "❓", "error", "Comando não reconhecido.",
            "❓ Não entendi.\n\n💡 Tente:\n- *\"Quem precisa de atenção?\"*\n- *\"Sobre [paciente]\"*\n- *\"O que preciso resolver hoje?\"*\n- *\"Libere todos\"*\n- *\"Ajuda\"*",
            [], intent, "general", ctx);
        }
      }
    } catch (engineError) {
      console.error("Engine error:", engineError);
      response = fmt("Erro", "❌", "error", "Erro ao processar.", "Tente novamente.", [], intent, "error", ctx);
    }

    // 9. Save session context
    await saveSessionContext(supabase, user.id, role, sessionKey, ctx, intent.intent);

    // 10. Log intent + audit
    const elapsed = Date.now() - startTime;
    await Promise.all([
      logIntent(supabaseAdmin, user.id, role, inputText, n, intent, response.response_type, response.meta.engine, elapsed),
      supabaseAdmin.from("audit_logs").insert({
        action: "ifj_core_query", resource_type: "ifj_core", resource_id: intent.intent, user_id: user.id,
        metadata: { intent: intent.intent, confidence: intent.confidence, engine: response.meta.engine, response_time_ms: elapsed, data_source: "db_brain_v6" },
      }).then(() => {}),
    ]);

    return new Response(JSON.stringify(response), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e) {
    console.error("ifj-core-router error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
