/**
 * Plan Status Labels & Fallback
 * ----------------------------------------------------------------
 * Mapeamento centralizado dos `plan_status` reais persistidos em
 * `meal_plans` para labels e cores. Inclui um fallback que loga
 * estados desconhecidos uma única vez por valor (evita spam) e
 * registra em `system_alerts` quando o admin estiver online, para
 * que novos estados apareçam no painel de diagnóstico.
 */

import { supabase } from "@/integrations/supabase/client";

export interface PlanStatusMeta {
  label: string;
  /** Tailwind classes pre-aprovadas para o badge. */
  badgeClass: string;
  /** Categoria semântica (driver de filtros e diagnóstico). */
  bucket: "draft" | "review" | "approved" | "published" | "archived" | "unknown";
}

const KNOWN_PLAN_STATUSES: Record<string, PlanStatusMeta> = {
  draft: { label: "rascunho", badgeClass: "bg-muted text-muted-foreground", bucket: "draft" },
  draft_auto_generated: { label: "rascunho gerado", badgeClass: "bg-muted text-muted-foreground", bucket: "draft" },
  draft_auto_corrected: { label: "rascunho corrigido", badgeClass: "bg-amber-500/10 text-amber-500", bucket: "draft" },
  under_professional_review: { label: "em revisão", badgeClass: "bg-amber-500/10 text-amber-500", bucket: "review" },
  revision_requested: { label: "revisão solicitada", badgeClass: "bg-amber-500/10 text-amber-500", bucket: "review" },
  approved: { label: "aprovado", badgeClass: "bg-sky-500/10 text-sky-500", bucket: "approved" },
  published: { label: "publicado", badgeClass: "bg-emerald-500/10 text-emerald-500", bucket: "published" },
  published_to_patient: { label: "publicado", badgeClass: "bg-emerald-500/10 text-emerald-500", bucket: "published" },
  archived: { label: "arquivado", badgeClass: "bg-muted text-muted-foreground", bucket: "archived" },
};

const UNKNOWN_FALLBACK: PlanStatusMeta = {
  label: "status desconhecido",
  badgeClass: "bg-rose-500/10 text-rose-500",
  bucket: "unknown",
};

export const KNOWN_PLAN_STATUS_KEYS = Object.keys(KNOWN_PLAN_STATUSES);

const reportedUnknown = new Set<string>();

/** Remote alert deduplicated per session. */
async function reportUnknownStatus(value: string) {
  try {
    await supabase.from("system_alerts").insert({
      alert_type: "PLAN_STATUS_UNKNOWN",
      severity: "warning",
      message: `plan_status desconhecido recebido: "${value}"`,
      metadata: { plan_status: value, source: "frontend.planStatusLabels" },
    });
  } catch {
    // best effort — não quebrar UI
  }
}

export function getPlanStatusMeta(rawStatus: string | null | undefined): PlanStatusMeta {
  const key = (rawStatus || "draft").toString();
  const known = KNOWN_PLAN_STATUSES[key];
  if (known) return known;

  if (!reportedUnknown.has(key)) {
    reportedUnknown.add(key);
    // Log sempre, alerta best-effort
    // eslint-disable-next-line no-console
    console.warn(`[planStatus] Status desconhecido recebido: "${key}". Usando fallback genérico.`);
    void reportUnknownStatus(key);
  }
  return { ...UNKNOWN_FALLBACK, label: `${UNKNOWN_FALLBACK.label} (${key})` };
}

export function getPlanStatusLabel(rawStatus: string | null | undefined): string {
  return getPlanStatusMeta(rawStatus).label;
}

export function getPlanStatusBadgeClass(rawStatus: string | null | undefined): string {
  return getPlanStatusMeta(rawStatus).badgeClass;
}

/** Util para testes: limpa cache de unknowns reportados. */
export function __resetPlanStatusReportingForTests() {
  reportedUnknown.clear();
}
