/**
 * Registry of recently updated features.
 * Each entry maps a route (or feature key) to a short description of what changed.
 * The `until` date controls when the badge auto-hides (ISO string).
 */

export interface NewFeatureEntry {
  /** Route path or card key that received the update */
  key: string;
  /** Short label shown on hover / tooltip */
  changeNote: string;
  /** Auto-hide after this date */
  until: string;
}

export const NEW_FEATURES: NewFeatureEntry[] = [
  // Anamnese orbital premium
  { key: "/anamnesis", changeNote: "Anamnese reformulada com estilo orbital premium", until: "2026-05-01" },
  { key: "anamnesis", changeNote: "Anamnese reformulada com estilo orbital premium", until: "2026-05-01" },

  // Patient grid cards
  { key: "/my-diet", changeNote: "Interface atualizada com novo design", until: "2026-05-01" },
  { key: "meal-plan", changeNote: "Interface atualizada com novo design", until: "2026-05-01" },

  { key: "/checkin", changeNote: "Avaliação física com novos gráficos", until: "2026-05-01" },
  { key: "physical", changeNote: "Avaliação física com novos gráficos", until: "2026-05-01" },

  { key: "/body-projection", changeNote: "Projeção corporal com IA aprimorada", until: "2026-05-01" },
  { key: "body-ai", changeNote: "Projeção corporal com IA aprimorada", until: "2026-05-01" },

  { key: "/analyze", changeNote: "Novos insights de IA", until: "2026-05-01" },
  { key: "ai-insights", changeNote: "Novos insights de IA", until: "2026-05-01" },

  { key: "/checklist", changeNote: "Checklist reformulado", until: "2026-05-01" },
  { key: "checklist", changeNote: "Checklist reformulado", until: "2026-05-01" },

  // Sidebar routes — professionals
  { key: "/workouts", changeNote: "Dashboard do Personal Trainer reformulado", until: "2026-05-01" },
  { key: "/patients", changeNote: "Painel de pacientes atualizado", until: "2026-05-01" },
];

const DISMISSED_KEY = "fitjourney_dismissed_new_features";

function getDismissed(): string[] {
  try {
    return JSON.parse(localStorage.getItem(DISMISSED_KEY) || "[]");
  } catch {
    return [];
  }
}

export function dismissFeature(key: string) {
  const dismissed = getDismissed();
  if (!dismissed.includes(key)) {
    dismissed.push(key);
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(dismissed));
  }
}

export function isFeatureNew(key: string): NewFeatureEntry | null {
  const dismissed = getDismissed();
  if (dismissed.includes(key)) return null;

  const entry = NEW_FEATURES.find(f => f.key === key);
  if (!entry) return null;

  if (new Date(entry.until) < new Date()) return null;

  return entry;
}
