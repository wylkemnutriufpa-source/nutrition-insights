import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useTenant } from "@/lib/tenantContext";
import { withTenantFilter } from "@/lib/tenantQueryHelpers";

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

export interface IntelligenceMetric {
  label: string;
  value: string;
  icon: string;
  color: "emerald" | "amber" | "sky" | "rose" | "violet" | "orange";
  detail?: string;
}

export interface ClinicalEngineStatus {
  dataAnalyzed: number;
  patternsDetected: number;
  preventiveAlerts: number;
  evolutionIndex: number; // percentage
  energyLevel: number; // 0-100
  totalPatients: number;
  portfolioHealth: number;
  avgAdherence: number;
  dropoutRate: number;
  lastPipelineAt: string | null;
  pipelineStatus: string;
}

export interface SmartResumeData {
  shouldShow: boolean;
  hoursAway: number;
  greeting: string;
  recentActivities: RecentActivity[];
  pendingAction: PendingAction | null;
  suggestion: string;
  streakDays: number;
  collectedMetrics: IntelligenceMetric[];
  engineStatus: ClinicalEngineStatus | null;
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
  const { tenantId } = useTenant();
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

        // 6. Collect intelligence metrics + clinical engine status
        const collectedMetrics: IntelligenceMetric[] = [];
        let engineStatus: ClinicalEngineStatus | null = null;
        try {
          const today = new Date().toISOString().split("T")[0];
          const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();

          // Parallel fetch — clinical engine data + patient metrics
          const [
            checklistRes, mealsRes, checkinsRes, weightRes, chatRes, xpRes,
            portfolioRes, pipelineRes, alertsRes, snapshotsRes, clinicalMetricsRes,
          ] = await Promise.all([
            supabase.from("checklist_tasks").select("id, completed", { count: "exact" }).eq("patient_id", user.id).eq("date", today),
            supabase.from("meals").select("id", { count: "exact", head: true }).eq("user_id", user.id).gte("logged_at", weekAgo),
            supabase.from("patient_checkins").select("id", { count: "exact", head: true }).eq("patient_id", user.id),
            supabase.from("physical_assessments").select("weight, assessment_date").eq("patient_id", user.id).order("assessment_date", { ascending: false }).limit(2),
            supabase.from("chat_messages").select("id", { count: "exact", head: true }).eq("receiver_id", user.id).eq("is_read", false),
            supabase.from("player_stats").select("total_xp, level, current_streak, meals_logged").eq("user_id", user.id).maybeSingle(),
            // Clinical engine data (for nutritionists/admins)
            supabase.from("clinic_portfolio_state").select("*").eq("nutritionist_id", user.id).maybeSingle(),
            supabase.from("pipeline_runs").select("status, completed_at, total_patients_processed, steps_completed").order("created_at", { ascending: false }).limit(1).maybeSingle(),
            withTenantFilter(supabase.from("clinical_alerts").select("id", { count: "exact", head: true }).eq("nutritionist_id", user.id).eq("is_active", true), tenantId),
            supabase.from("clinical_daily_snapshots").select("id", { count: "exact", head: true }).gte("snapshot_date", weekAgo),
            supabase.from("clinic_clinical_evolution_metrics").select("*").eq("nutritionist_id", user.id).maybeSingle(),
          ]);

          // Build clinical engine status (for pro users)
          const portfolio = portfolioRes.data as any;
          const pipeline = pipelineRes.data as any;
          const activeAlerts = alertsRes.count || 0;
          const totalSnapshots = snapshotsRes.count || 0;
          const clinicalEvolution = clinicalMetricsRes.data as any;

          if (portfolio || pipeline) {
            const patientsAnalyzed = portfolio?.total_patients || 0;
            const avgAdh = portfolio?.avg_adherence || 0;
            const healthScore = portfolio?.portfolio_health_score || 0;
            const evolIdx = clinicalEvolution?.avg_protocol_efficacy || portfolio?.avg_plan_efficacy || 0;
            // Energy level = weighted composite of health score + adherence + evolution
            const energyLevel = Math.min(100, Math.round(
              (healthScore * 0.4) + (avgAdh * 0.35) + (evolIdx * 0.25)
            ));

            engineStatus = {
              dataAnalyzed: totalSnapshots + (pipeline?.total_patients_processed || 0) * 10,
              patternsDetected: Math.max(0, Math.round((totalSnapshots / 7) * patientsAnalyzed * 0.3)),
              preventiveAlerts: activeAlerts,
              evolutionIndex: Math.round(evolIdx),
              energyLevel,
              totalPatients: patientsAnalyzed,
              portfolioHealth: Math.round(healthScore),
              avgAdherence: Math.round(avgAdh),
              dropoutRate: Math.round(portfolio?.dropout_rate || 0),
              lastPipelineAt: pipeline?.completed_at || null,
              pipelineStatus: pipeline?.status || "idle",
            };
          }

          // Checklist adherence today
          const checkTasks = checklistRes.data || [];
          const checkTotal = checkTasks.length;
          const checkDone = checkTasks.filter((t: any) => t.completed).length;
          if (checkTotal > 0) {
            const pct = Math.round((checkDone / checkTotal) * 100);
            collectedMetrics.push({
              label: "Adesão hoje",
              value: `${pct}%`,
              icon: "CheckCircle2",
              color: pct >= 70 ? "emerald" : pct >= 40 ? "amber" : "rose",
              detail: `${checkDone}/${checkTotal} tarefas concluídas`,
            });
          }

          // Meals this week
          const mealCount = mealsRes.count || 0;
          collectedMetrics.push({
            label: "Refeições registradas",
            value: `${mealCount}`,
            icon: "UtensilsCrossed",
            color: mealCount >= 14 ? "emerald" : mealCount >= 7 ? "sky" : "amber",
            detail: "nos últimos 7 dias",
          });

          // Weight trend
          const weights = weightRes.data || [];
          if (weights.length >= 2) {
            const diff = Number(weights[0].weight) - Number(weights[1].weight);
            const trend = diff < 0 ? "↓" : diff > 0 ? "↑" : "→";
            collectedMetrics.push({
              label: "Tendência de peso",
              value: `${trend} ${Math.abs(diff).toFixed(1)}kg`,
              icon: "TrendingUp",
              color: diff <= 0 ? "emerald" : "amber",
              detail: `Último: ${Number(weights[0].weight).toFixed(1)}kg`,
            });
          } else if (weights.length === 1) {
            collectedMetrics.push({
              label: "Último peso",
              value: `${Number(weights[0].weight).toFixed(1)}kg`,
              icon: "TrendingUp",
              color: "sky",
              detail: weights[0].assessment_date,
            });
          }

          // XP & Level
          if (xpRes.data) {
            const stats = xpRes.data as any;
            collectedMetrics.push({
              label: "Nível / XP",
              value: `Lv.${stats.level || 1}`,
              icon: "Trophy",
              color: "violet",
              detail: `${stats.total_xp || 0} XP · ${stats.meals_logged || 0} refeições`,
            });
          }

          // Unread messages
          const unread = chatRes.count || 0;
          if (unread > 0) {
            collectedMetrics.push({
              label: "Mensagens",
              value: `${unread}`,
              icon: "MessageSquare",
              color: "orange",
              detail: `não lida${unread > 1 ? "s" : ""}`,
            });
          }

          // Total check-ins
          const totalCheckins = checkinsRes.count || 0;
          if (totalCheckins > 0) {
            collectedMetrics.push({
              label: "Check-ins realizados",
              value: `${totalCheckins}`,
              icon: "Activity",
              color: "sky",
              detail: "avaliações registradas",
            });
          }

          // Clinical engine metrics for pros
          if (engineStatus) {
            if (engineStatus.totalPatients > 0) {
              collectedMetrics.push({
                label: "Pacientes monitorados",
                value: `${engineStatus.totalPatients}`,
                icon: "Users",
                color: "emerald",
                detail: `Saúde do portfólio: ${engineStatus.portfolioHealth}%`,
              });
            }
            if (engineStatus.preventiveAlerts > 0) {
              collectedMetrics.push({
                label: "Alertas ativos",
                value: `${engineStatus.preventiveAlerts}`,
                icon: "Zap",
                color: engineStatus.preventiveAlerts > 5 ? "rose" : "amber",
                detail: "alertas preventivos",
              });
            }
          }
        } catch (e) {
          console.error("Intelligence metrics error:", e);
        }

        const resumeData: SmartResumeData = {
          shouldShow: true,
          hoursAway,
          greeting: getGreeting(userName),
          recentActivities,
          pendingAction: topPending,
          suggestion: getSuggestion(topPending, userRole),
          streakDays,
          collectedMetrics,
          engineStatus,
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
