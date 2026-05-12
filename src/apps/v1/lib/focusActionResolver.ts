/**
 * Focus Action Resolver
 * Maps focus types to real navigation routes and interaction requirements.
 */

export interface FocusAction {
  route: string;
  params?: Record<string, string>;
  interaction_type: "navigate" | "modal" | "deep_link";
  label: string;
}

const FOCUS_ROUTES: Record<string, FocusAction> = {
  onboarding_step: {
    route: "/onboarding",
    interaction_type: "navigate",
    label: "Continuar onboarding",
  },
  meal_plan_pending: {
    route: "/my-diet",
    interaction_type: "navigate",
    label: "Ver plano alimentar",
  },
  checklist_task: {
    route: "/checklist",
    interaction_type: "navigate",
    label: "Abrir checklist",
  },
  body_assessment_due: {
    route: "/checkin",
    interaction_type: "navigate",
    label: "Enviar fotos / check-in",
  },
  protocol_task: {
    route: "/checklist",
    interaction_type: "navigate",
    label: "Ver tarefa do protocolo",
  },
  hydration: {
    route: "/checklist",
    interaction_type: "navigate",
    label: "Registrar água",
  },
  meal: {
    route: "/my-diet",
    interaction_type: "navigate",
    label: "Ver plano alimentar",
  },
  behavioral: {
    route: "/checklist",
    interaction_type: "navigate",
    label: "Ver tarefas",
  },
  clinical_alert: {
    route: "/checklist",
    interaction_type: "navigate",
    label: "Ver detalhes",
  },
  progress: {
    route: "/journey",
    interaction_type: "navigate",
    label: "Ver progresso",
  },
  motivation: {
    route: "/journey",
    interaction_type: "navigate",
    label: "Ver jornada",
  },
  feedback: {
    route: "/checkin",
    interaction_type: "navigate",
    label: "Enviar feedback",
  },
};

// Nutritionist focus routes
const PRO_FOCUS_ROUTES: Record<string, FocusAction> = {
  plan_creation: {
    route: "/clinical-workspace",
    interaction_type: "navigate",
    label: "Criar plano",
  },
  low_adherence: {
    route: "/clinical-workspace",
    interaction_type: "navigate",
    label: "Ver analytics",
  },
  onboarding_stuck: {
    route: "/clinical-workspace",
    interaction_type: "navigate",
    label: "Ver onboardings",
  },
  clinical_alert: {
    route: "/control-tower",
    interaction_type: "navigate",
    label: "Ver alertas",
  },
  pending_approval: {
    route: "/clinical-workspace",
    interaction_type: "navigate",
    label: "Aprovar planos",
  },
};

export function resolveFocusAction(focusType: string, role: "patient" | "professional" = "patient"): FocusAction {
  const routes = role === "professional" ? PRO_FOCUS_ROUTES : FOCUS_ROUTES;
  return routes[focusType] || {
    route: role === "professional" ? "/clinical-workspace" : "/checklist",
    interaction_type: "navigate" as const,
    label: "Ver detalhes",
  };
}

export function getFocusQuickActions(): { key: string; label: string; route: string; icon: string }[] {
  return [
    { key: "checklist", label: "Checklist", route: "/checklist", icon: "ClipboardCheck" },
    { key: "meal", label: "Ver plano", route: "/my-diet", icon: "UtensilsCrossed" },
    { key: "feedback", label: "Feedback", route: "/checkin", icon: "MessageSquare" },
    { key: "journey", label: "Jornada", route: "/journey", icon: "TrendingUp" },
  ];
}
