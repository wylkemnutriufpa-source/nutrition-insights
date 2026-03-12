import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Calendar, Flame, Trophy, Target, Activity } from "lucide-react";
import ShareProgressButton from "@/components/social/ShareProgressButton";

interface JourneyStats {
  totalMeals: number;
  totalDays: number;
  streak: number;
  level: number;
  totalXp: number;
  achievements: number;
  checklistCompleted: number;
}

export default function Journey() {
  const { user } = useAuth();
  const [stats, setStats] = useState<JourneyStats | null>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchAll = async () => {
      const [
        { data: playerStats },
        { count: mealsCount },
        { count: achievementsCount },
        { count: checklistCount },
        { data: timelineData },
      ] = await Promise.all([
        supabase.from("player_stats").select("*").eq("user_id", user.id).single(),
        supabase.from("meals").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("user_achievements").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("checklist_tasks").select("id", { count: "exact", head: true }).eq("patient_id", user.id).eq("completed", true),
        supabase.from("patient_timeline").select("*").eq("patient_id", user.id).order("created_at", { ascending: false }).limit(20),
      ]);

      const firstMeal = await supabase.from("meals").select("created_at").eq("user_id", user.id).order("created_at").limit(1);
      const daysSinceStart = firstMeal.data?.[0]
        ? Math.ceil((Date.now() - new Date(firstMeal.data[0].created_at).getTime()) / 86400000)
        : 0;

      setStats({
        totalMeals: mealsCount || 0,
        totalDays: daysSinceStart,
        streak: playerStats?.current_streak || 0,
        level: playerStats?.level || 1,
        totalXp: playerStats?.total_xp || 0,
        achievements: achievementsCount || 0,
        checklistCompleted: checklistCount || 0,
      });
      setTimeline(timelineData || []);
      setLoading(false);
    };
    fetchAll();
  }, [user]);

  const milestones = [
    { icon: Flame, label: "Streak Atual", value: stats?.streak || 0, suffix: " dias", color: "text-orange-400" },
    { icon: Trophy, label: "Nível", value: stats?.level || 1, suffix: "", color: "text-yellow-400" },
    { icon: Target, label: "XP Total", value: stats?.totalXp || 0, suffix: " XP", color: "text-primary" },
    { icon: Activity, label: "Refeições", value: stats?.totalMeals || 0, suffix: "", color: "text-emerald-400" },
    { icon: Calendar, label: "Dias na Jornada", value: stats?.totalDays || 0, suffix: "", color: "text-blue-400" },
    { icon: TrendingUp, label: "Tarefas Concluídas", value: stats?.checklistCompleted || 0, suffix: "", color: "text-violet-400" },
  ];

  const eventIcons: Record<string, string> = {
    meal: "🍽️", weight_update: "⚖️", protocol_activated: "📋",
    achievement: "🏆", note: "📝", login: "👋",
  };

  const shareRef = useRef<HTMLDivElement>(null);

  return (
    <DashboardLayout>
      <div className="space-y-6" ref={shareRef}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
              <TrendingUp className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold">Minha Jornada</h1>
              <p className="text-sm text-muted-foreground">Seu progresso ao longo do tempo</p>
            </div>
          </div>
          <ShareProgressButton captureRef={shareRef} context="journey" />
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {milestones.map((m) => (
                <Card key={m.label} className="glass shadow-card">
                  <CardContent className="flex items-center gap-3 py-4 px-4">
                    <m.icon className={`w-6 h-6 ${m.color}`} />
                    <div>
                      <p className="text-xl font-bold font-display">{m.value}{m.suffix}</p>
                      <p className="text-xs text-muted-foreground">{m.label}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Progress bar */}
            <Card className="glass shadow-card">
              <CardHeader>
                <CardTitle className="font-display text-lg">Progresso do Nível</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <span className="text-2xl font-bold text-primary">Lv.{stats?.level}</span>
                  <div className="flex-1">
                    <div className="h-3 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full gradient-primary rounded-full transition-all"
                        style={{ width: `${((stats?.totalXp || 0) % 1000) / 10}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {(stats?.totalXp || 0) % 1000} / 1000 XP para o próximo nível
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Timeline */}
            <Card className="glass shadow-card">
              <CardHeader>
                <CardTitle className="font-display text-lg">Timeline de Atividades</CardTitle>
              </CardHeader>
              <CardContent>
                {timeline.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">Nenhuma atividade registrada ainda</p>
                ) : (
                  <div className="space-y-3">
                    {timeline.map((event) => (
                      <div key={event.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                        <span className="text-lg">{eventIcons[event.event_type] || "📌"}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{event.title}</p>
                          {event.description && (
                            <p className="text-xs text-muted-foreground mt-0.5">{event.description}</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(event.created_at).toLocaleDateString("pt-BR", {
                              day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
