/**
 * FitJourney — User Behavior Tracker
 * Tracks meaningful user actions for internal analytics.
 */
import { supabase } from "@/integrations/supabase/client";

interface BehaviorEvent {
  event_name: string;
  context?: Record<string, unknown>;
  page?: string;
}

const EVENT_QUEUE: BehaviorEvent[] = [];
let eventTimer: ReturnType<typeof setTimeout> | null = null;

async function flushEvents() {
  if (EVENT_QUEUE.length === 0) return;
  const batch = EVENT_QUEUE.splice(0, 30);
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id;
    if (!userId) return; // Don't track anonymous

    const role = sessionData?.session?.user?.user_metadata?.role ?? "unknown";
    const rows = batch.map((e) => ({
      user_id: userId,
      role,
      event_name: e.event_name,
      context: e.context ?? {},
      page: e.page ?? window.location.pathname,
    }));

    await (supabase as any).from("user_behavior_events").insert(rows);
  } catch {
    console.warn("[BehaviorTracker] flush failed");
  }
}

function scheduleEventFlush() {
  if (eventTimer) return;
  eventTimer = setTimeout(() => {
    eventTimer = null;
    void flushEvents();
  }, 8000);
}

/** Track a user behavior event */
export function trackEvent(eventName: string, context?: Record<string, unknown>) {
  EVENT_QUEUE.push({
    event_name: eventName,
    context,
    page: typeof window !== "undefined" ? window.location.pathname : undefined,
  });
  scheduleEventFlush();
}

// Patient events
export const PatientEvents = {
  openedPlan: (planId: string) => trackEvent("patient.opened_plan", { planId }),
  completedTask: (taskId: string) => trackEvent("patient.completed_task", { taskId }),
  ignoredTask: (taskId: string) => trackEvent("patient.ignored_task", { taskId }),
  viewedRecipe: (recipeId: string) => trackEvent("patient.viewed_recipe", { recipeId }),
  abandonedAnamnesis: () => trackEvent("patient.abandoned_anamnesis"),
  completedOnboarding: () => trackEvent("patient.completed_onboarding"),
  checkedIn: () => trackEvent("patient.checked_in"),
} as const;

// Professional events
export const ProfessionalEvents = {
  createdPlan: (planId: string) => trackEvent("pro.created_plan", { planId }),
  publishedPlan: (planId: string) => trackEvent("pro.published_plan", { planId }),
  editedPlan: (planId: string) => trackEvent("pro.edited_plan", { planId }),
  ignoredSuggestion: (type: string) => trackEvent("pro.ignored_suggestion", { type }),
  accessedAnalytics: () => trackEvent("pro.accessed_analytics"),
  connectedWhatsApp: () => trackEvent("pro.connected_whatsapp"),
  releasedOnboarding: (patientId: string) => trackEvent("pro.released_onboarding", { patientId }),
} as const;

if (typeof window !== "undefined") {
  window.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") void flushEvents();
  });
}
