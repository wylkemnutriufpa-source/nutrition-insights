import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

interface PendingAction {
  action_type: string;
  route: string;
  title: string;
  metadata: Record<string, any>;
  created_at: string;
  priority: number;
}

interface RecentActivity {
  route: string;
  title: string;
  icon: string;
  last_access_at: string;
}

export interface SmartResumeData {
  shouldShow: boolean;
  hoursAway: number;
  greeting: string;
  recentActivities: RecentActivity[];
  pendingAction: PendingAction | null;
  suggestion: string;
  streakDays: number;
}

// Priority map: lower number = higher priority
const ACTION_PRIORITY: Record<string, number> = {
  checkin_pending: 1,
  checklist_partial: 2,
  meal_plan_not_followed: 3,
  chat_unread: 4,
  mission_active: 5,
  workout_pending: 6,
  // For professionals
  patients_need_attention: 1,
  checkins_to_review: 2,
  chat_pending_professional: 3,
  agenda_today: 4,
};

// Icon map for recent activities
const ROUTE_ICON_MAP: Record<string, string> = {
  "/": "LayoutDashboard",
  "/checklist": "CheckCircle2",
  "/checkin": "ClipboardCheck",
  "/meals": "Leaf",
  "/my-diet": "UtensilsCrossed",
  "/chat": "MessageSquare",
  "/recipes": "ChefHat",
  "/ranking": "Trophy",
  "/journey": "TrendingUp",
  "/patients": "Users",
  "/reports": "BarChart3",
  "/appointments": "Activity",
  "/weekly-goals": "Target",
  "/my-workouts": "Dumbbell",
  "/shopping-list": "ShoppingCart",
  "/supplements": "Pill",
  "/food-database": "Apple",
};

function getGreeting(name: string): string {
  const hour = new Date().getHours();
  if (hour < 12) return `Bom dia, ${name}! ☀️`;
  if (hour < 18) return `Boa tarde, ${name}! 🌤️`;
  return `Boa noite, ${name}! 🌙`;
}

function getSuggestion(pendingAction: PendingAction | null, role: string): string {
  if (!pendingAction) {
    if (role === "patient") return "Seu dia está em ordem! Que tal registrar uma refeição?";
    if (role === "nutritionist") return "Tudo em dia! Confira seu painel de pacientes.";
    if (role === "personal") return "Tudo certo! Veja como seus alunos estão evoluindo.";
    return "Explore o painel principal.";
  }

  const suggestions: Record<string, string> = {
    checkin_pending: "Você tem um check-in pendente. Registrar seu peso ajuda a acompanhar sua evolução!",
    checklist_partial: "Seu checklist de hoje está incompleto. Cada tarefa concluída conta pontos!",
    meal_plan_not_followed: "Você ainda não marcou as refeições de hoje no plano alimentar.",
    chat_unread: "Você tem mensagens não lidas no chat.",
    mission_active: "Você tem missões ativas esperando! Complete para ganhar XP.",
    workout_pending: "Tem um treino agendado para hoje. Bora treinar! 💪",
    patients_need_attention: "Alguns pacientes precisam de atenção. Confira os alertas.",
    checkins_to_review: "Existem check-ins aguardando sua revisão.",
    chat_pending_professional: "Você tem mensagens de pacientes não respondidas.",
    agenda_today: "Você tem consultas agendadas para hoje.",
  };

  return suggestions[pendingAction.action_type] || "Continue de onde parou!";
}

const RESUME_SHOWN_KEY = "fitjourney_resume_shown";

export function useSmartResume() {
  const { user, profile, roles } = useAuth();
  const [data, setData] = useState<SmartResumeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);
  const [forced, setForced] = useState(false);

  const userId = user?.id;

  const userRole = (roles as string[]).includes("admin")
    ? "admin"
    : roles.includes("nutritionist")
    ? "nutritionist"
    : roles.includes("personal")
    ? "personal"
    : "patient";

  const userName = profile?.full_name?.split(" ")[0] || "Usuário";

  useEffect(() => {
    if (!userId || dismissed) {
      setLoading(false);
      return;
    }

    // Check if already shown this session (skip if forced by user click)
    if (!forced) {
      const shownAt = sessionStorage.getItem(RESUME_SHOWN_KEY);
      if (shownAt) {
        setLoading(false);
        return;
      }
    }

    let cancelled = false;

    const fetchResumeData = async () => {
      try {
        let hoursAway = 0;

        // Only check session RPC if not forced
        if (!forced) {
          const { data: sessionData } = await supabase.rpc("check_and_update_session" as any);
          if (cancelled) return;
          const sessionResult = sessionData as any;
          if (!sessionResult?.show_resume) {
            setLoading(false);
            return;
          }
          hoursAway = sessionResult.hours_away || 0;
        }

        // 2. Fetch recent activities (top 3 from menu usage)
        const { data: menuUsage } = await supabase
          .from("user_menu_usage")
          .select("menu_item_id, last_access_at, clicks_count")
          .eq("user_id", user.id)
          .order("last_access_at", { ascending: false })
          .limit(5);

        let recentActivities: RecentActivity[] = [];
        if (menuUsage && menuUsage.length > 0) {
          // Fetch the menu items for these IDs
          const itemIds = menuUsage.map((u: any) => u.menu_item_id);
          const { data: menuItems } = await supabase
            .from("menu_items")
            .select("id, label, route, icon")
            .in("id", itemIds);

          if (menuItems) {
            const itemMap = new Map(menuItems.map((i: any) => [i.id, i]));
            recentActivities = menuUsage
              .map((u: any) => {
                const item = itemMap.get(u.menu_item_id) as any;
                if (!item || item.route === "/") return null;
                return {
                  route: item.route,
                  title: item.label,
                  icon: item.icon || ROUTE_ICON_MAP[item.route] || "LayoutDashboard",
                  last_access_at: u.last_access_at,
                };
              })
              .filter(Boolean)
              .slice(0, 3) as RecentActivity[];
          }
        }

        // 3. Fetch pending actions (incomplete activities)
        const { data: pendingActions } = await supabase
          .from("user_activity_log")
          .select("*")
          .eq("user_id", user.id)
          .eq("is_complete", false)
          .order("created_at", { ascending: false })
          .limit(10);

        let topPending: PendingAction | null = null;
        if (pendingActions && pendingActions.length > 0) {
          // Sort by priority
          const sorted = pendingActions
            .map((a: any) => ({
              ...a,
              metadata: a.metadata || {},
              priority: ACTION_PRIORITY[a.action_type] ?? 99,
            }))
            .sort((a: any, b: any) => a.priority - b.priority);
          topPending = sorted[0];
        }

        // 4. Check for real-time pending items based on role
        if (!topPending) {
          topPending = await detectPendingFromData(user.id, userRole);
        }

        // 5. Get streak info
        let streakDays = 0;
        try {
          const { data: streakData } = await supabase
            .from("patient_daily_adherence")
            .select("streak_days")
            .eq("patient_id", user.id)
            .order("date", { ascending: false })
            .limit(1);
          if (streakData && streakData.length > 0) {
            streakDays = streakData[0].streak_days || 0;
          }
        } catch { /* not a patient or no data */ }

        const resumeData: SmartResumeData = {
          shouldShow: true,
          hoursAway,
          greeting: getGreeting(userName),
          recentActivities,
          pendingAction: topPending,
          suggestion: getSuggestion(topPending, userRole),
          streakDays,
        };

        setData(resumeData);
        sessionStorage.setItem(RESUME_SHOWN_KEY, Date.now().toString());
      } catch (e) {
        console.error("Error fetching smart resume:", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchResumeData();
    return () => { cancelled = true; };
  }, [userId, dismissed, forced]);

  const dismiss = useCallback(() => {
    setDismissed(true);
    setForced(false);
    setData(null);
  }, []);

  const forceShow = useCallback(() => {
    setDismissed(false);
    setForced(true);
    setLoading(true);
    sessionStorage.removeItem(RESUME_SHOWN_KEY);
  }, []);

  return { data, loading, dismiss, forceShow };
}

// Detect pending actions from real data (no mocks)
async function detectPendingFromData(
  userId: string,
  role: string
): Promise<PendingAction | null> {
  const today = new Date().toISOString().split("T")[0];

  if (role === "patient") {
    // Check for incomplete checklist today
    try {
      const { data: tasks, count } = await supabase
        .from("checklist_tasks")
        .select("id, completed", { count: "exact" })
        .eq("patient_id", userId)
        .eq("date", today);

      if (tasks && tasks.length > 0) {
        const completed = tasks.filter((t: any) => t.completed).length;
        const total = tasks.length;
        if (total > 0 && completed / total < 0.5) {
          return {
            action_type: "checklist_partial",
            route: "/checklist",
            title: `Checklist: ${completed}/${total} concluídas`,
            metadata: { completed, total },
            created_at: new Date().toISOString(),
            priority: 2,
          };
        }
      }
    } catch { /* ignore */ }

    // Check for unread chat messages
    try {
      const { count } = await supabase
        .from("chat_messages")
        .select("id", { count: "exact", head: true })
        .eq("receiver_id", userId)
        .eq("is_read", false);

      if (count && count > 0) {
        return {
          action_type: "chat_unread",
          route: "/chat",
          title: `${count} mensagem${count > 1 ? "s" : ""} não lida${count > 1 ? "s" : ""}`,
          metadata: { unread_count: count },
          created_at: new Date().toISOString(),
          priority: 4,
        };
      }
    } catch { /* ignore */ }
  }

  if (role === "nutritionist" || role === "admin") {
    // Check for unreviewed check-ins
    try {
      const { count } = await supabase
        .from("patient_checkins")
        .select("id", { count: "exact", head: true })
        .eq("nutritionist_id", userId)
        .eq("status", "pending");

      if (count && count > 0) {
        return {
          action_type: "checkins_to_review",
          route: "/checkin-panel",
          title: `${count} check-in${count > 1 ? "s" : ""} para revisar`,
          metadata: { pending_count: count },
          created_at: new Date().toISOString(),
          priority: 2,
        };
      }
    } catch { /* ignore */ }

    // Check for unread chats
    try {
      const { count } = await supabase
        .from("chat_messages")
        .select("id", { count: "exact", head: true })
        .eq("receiver_id", userId)
        .eq("is_read", false);

      if (count && count > 0) {
        return {
          action_type: "chat_pending_professional",
          route: "/chat",
          title: `${count} mensagem${count > 1 ? "s" : ""} de pacientes`,
          metadata: { unread_count: count },
          created_at: new Date().toISOString(),
          priority: 3,
        };
      }
    } catch { /* ignore */ }
  }

  return null;
}

// Utility to log activity from components
export async function logActivity(
  actionType: string,
  route: string,
  title: string,
  isComplete = false,
  metadata: Record<string, any> = {}
) {
  try {
    await supabase.rpc("log_user_activity" as any, {
      _action_type: actionType,
      _route: route,
      _title: title,
      _is_complete: isComplete,
      _metadata: metadata,
    });
  } catch (e) {
    console.error("Error logging activity:", e);
  }
}
