import { useEffect, useState } from "react";
import { supabase } from "@v1/integrations/supabase/client";
import { useAuth } from "@v1/lib/auth";
import { useTenant } from "@v1/lib/tenantContext";
import { withTenantFilter } from "@v1/lib/tenantQueryHelpers";
import { Card, CardContent, CardHeader, CardTitle } from "@v1/components/ui/card";
import { Badge } from "@v1/components/ui/badge";
import { Progress } from "@v1/components/ui/progress";
import { Button } from "@v1/components/ui/button";
import {
  Users, Dumbbell, TrendingUp, AlertTriangle, Trophy,
  Activity, UserX, Flame, Clock, Target, ArrowRight
} from "lucide-react";
import { Link } from "react-router-dom";

interface StudentStats {
  student_id: string;
  full_name: string;
  completions_this_week: number;
  last_completion: string | null;
  avg_effort: number;
  has_pain: boolean;
  days_inactive: number;
}

export default function PersonalDashboardStats() {
  const { user } = useAuth();
  const { tenantId } = useTenant();
  const [stats, setStats] = useState<{
    totalStudents: number;
    activePlans: number;
    weeklyCompletions: number;
    adherencePercent: number;
    avgEffort: number;
    painAlerts: number;
    inactiveStudents: StudentStats[];
    topPerformers: StudentStats[];
    recentCompletions: any[];
  }>({
    totalStudents: 0, activePlans: 0, weeklyCompletions: 0,
    adherencePercent: 0, avgEffort: 0, painAlerts: 0,
    inactiveStudents: [], topPerformers: [], recentCompletions: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [linksRes, plansRes, completionsRes] = await Promise.all([
        (supabase as any).from("patient_professional_links")
          .select("patient_id").eq("professional_id", user.id)
          .eq("professional_role", "trainer").eq("link_status", "active"),
        withTenantFilter(
          supabase.from("workout_plans").select("id, student_id, status")
            .eq("personal_id", user.id),
          tenantId
        ),
        supabase.from("workout_completions")
          .select("*, workout_routines(name)")
          .order("completed_at", { ascending: false }).limit(500),
      ]);

      const studentIds = (linksRes.data || []).map((l: any) => l.patient_id);
      if (studentIds.length === 0) { setLoading(false); return; }

      const { data: profiles } = await supabase.from("profiles")
        .select("user_id, full_name").in("user_id", studentIds);
      const profileMap: Record<string, string> = {};
      (profiles || []).forEach(p => { profileMap[p.user_id] = p.full_name || "Aluno"; });

      const plans = (plansRes.data || []);
      const activePlans = plans.filter(p => p.status === "active").length;

      const studentSet = new Set(studentIds);
      const myCompletions = (completionsRes.data || []).filter((c: any) => studentSet.has(c.student_id));

      const now = Date.now();
      const oneWeek = 7 * 24 * 60 * 60 * 1000;
      const weeklyCompletions = myCompletions.filter((c: any) => (now - new Date(c.completed_at).getTime()) < oneWeek);

      const studentWeekMap: Record<string, { count: number; efforts: number[]; hasPain: boolean; lastCompletion: string | null }> = {};
      studentIds.forEach((id: string) => {
        studentWeekMap[id] = { count: 0, efforts: [], hasPain: false, lastCompletion: null };
      });

      myCompletions.forEach((c: any) => {
        if (!studentWeekMap[c.student_id]) return;
        if (!studentWeekMap[c.student_id].lastCompletion) {
          studentWeekMap[c.student_id].lastCompletion = c.completed_at;
        }
        if ((now - new Date(c.completed_at).getTime()) < oneWeek) {
          studentWeekMap[c.student_id].count++;
          if (c.perceived_effort) studentWeekMap[c.student_id].efforts.push(c.perceived_effort);
          if (c.discomfort_flag) studentWeekMap[c.student_id].hasPain = true;
        }
      });

      const studentStats: StudentStats[] = studentIds.map((id: string) => {
        const s = studentWeekMap[id];
        const daysInactive = s.lastCompletion
          ? Math.floor((now - new Date(s.lastCompletion).getTime()) / (24 * 60 * 60 * 1000))
          : 999;
        return {
          student_id: id,
          full_name: profileMap[id] || "Aluno",
          completions_this_week: s.count,
          last_completion: s.lastCompletion,
          avg_effort: s.efforts.length > 0 ? Math.round(s.efforts.reduce((a, b) => a + b, 0) / s.efforts.length * 10) / 10 : 0,
          has_pain: s.hasPain,
          days_inactive: daysInactive,
        };
      });

      const inactiveStudents = studentStats.filter(s => s.days_inactive >= 7).sort((a, b) => b.days_inactive - a.days_inactive);
      const topPerformers = [...studentStats].sort((a, b) => b.completions_this_week - a.completions_this_week).slice(0, 5);
      const painAlerts = studentStats.filter(s => s.has_pain).length;
      const allEfforts = weeklyCompletions.map((c: any) => c.perceived_effort).filter(Boolean);
      const avgEffort = allEfforts.length > 0 ? Math.round(allEfforts.reduce((a: number, b: number) => a + b, 0) / allEfforts.length * 10) / 10 : 0;
      const adherencePercent = studentIds.length > 0 ? Math.min(100, Math.round((weeklyCompletions.length / (studentIds.length * 4)) * 100)) : 0;

      setStats({
        totalStudents: studentIds.length,
        activePlans,
        weeklyCompletions: weeklyCompletions.length,
        adherencePercent,
        avgEffort,
        painAlerts,
        inactiveStudents,
        topPerformers,
        recentCompletions: myCompletions.slice(0, 8),
      });
      setLoading(false);
    };
    load();
  }, [user]);

  if (loading) return <div className="animate-pulse space-y-4"><div className="h-24 bg-muted rounded-lg" /><div className="h-24 bg-muted rounded-lg" /></div>;

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground">Alunos Ativos</span>
            </div>
            <p className="text-2xl font-bold">{stats.totalStudents}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Dumbbell className="w-4 h-4 text-blue-500" />
              <span className="text-xs text-muted-foreground">Treinos/Semana</span>
            </div>
            <p className="text-2xl font-bold">{stats.weeklyCompletions}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Target className="w-4 h-4 text-green-500" />
              <span className="text-xs text-muted-foreground">Adesão</span>
            </div>
            <p className="text-2xl font-bold">{stats.adherencePercent}%</p>
            <Progress value={stats.adherencePercent} className="h-1.5 mt-1" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Flame className="w-4 h-4 text-orange-500" />
              <span className="text-xs text-muted-foreground">Esforço Médio</span>
            </div>
            <p className="text-2xl font-bold">{stats.avgEffort}/10</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Pain / Inactive Alerts */}
        {(stats.painAlerts > 0 || stats.inactiveStudents.length > 0) && (
          <Card className="border-destructive/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-destructive" /> Alertas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {stats.painAlerts > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <Badge variant="destructive" className="text-xs">{stats.painAlerts}</Badge>
                  <span>aluno(s) reportaram dor esta semana</span>
                </div>
              )}
              {stats.inactiveStudents.slice(0, 3).map(s => (
                <div key={s.student_id} className="flex items-center justify-between text-sm bg-muted/30 rounded-lg p-2">
                  <div className="flex items-center gap-2">
                    <UserX className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>{s.full_name}</span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {s.days_inactive >= 999 ? "Nunca treinou" : `${s.days_inactive}d inativo`}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Top Performers */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Trophy className="w-4 h-4 text-yellow-500" /> Top da Semana
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {stats.topPerformers.filter(s => s.completions_this_week > 0).slice(0, 5).map((s, i) => (
              <div key={s.student_id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                    {i + 1}
                  </span>
                  <span>{s.full_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">{s.completions_this_week} treinos</Badge>
                  {s.avg_effort >= 8 && <Flame className="w-3.5 h-3.5 text-orange-500" />}
                </div>
              </div>
            ))}
            {stats.topPerformers.filter(s => s.completions_this_week > 0).length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">Nenhum treino registrado esta semana</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      {stats.recentCompletions.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" /> Atividade Recente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {stats.recentCompletions.slice(0, 6).map((c: any) => (
              <div key={c.id} className="flex items-center justify-between text-xs bg-muted/20 rounded p-2">
                <div className="flex items-center gap-2">
                  <Dumbbell className="w-3 h-3 text-muted-foreground" />
                  <span className="font-medium">{(c.workout_routines as any)?.name || "Treino"}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  {c.duration_minutes && <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" />{c.duration_minutes}min</span>}
                  {c.perceived_effort && <span>RPE {c.perceived_effort}</span>}
                  {c.discomfort_flag && <AlertTriangle className="w-3 h-3 text-destructive" />}
                  <span>{new Date(c.completed_at).toLocaleDateString("pt-BR")}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
