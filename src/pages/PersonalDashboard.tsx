import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import IFJCommandCenter from "@/components/intelligence/modules/IFJCommandCenter";
import StatsCard from "@/components/dashboard/StatsCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Link } from "react-router-dom";
import {
  Users, Dumbbell, TrendingUp, AlertTriangle, Trophy,
  Plus, BarChart3, ArrowRight, Activity, UserX, Flame, Search, UserPlus
} from "lucide-react";
import AddStudentModal from "@/components/professional/AddStudentModal";
import LinkStudentModal from "@/components/professional/LinkStudentModal";
import { useProfessionalLinks } from "@/hooks/useProfessionalLinks";

export default function PersonalDashboard() {
  const { user } = useAuth();
  const [students, setStudents] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [workoutPlans, setWorkoutPlans] = useState<any[]>([]);
  const [recentCompletions, setRecentCompletions] = useState<any[]>([]);
  const [allCompletions, setAllCompletions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const { refetch: refetchLinks } = useProfessionalLinks("trainer");

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [studentsRes, plansRes, completionsRes] = await Promise.all([
        supabase.from("personal_trainer_students").select("*").eq("personal_id", user.id).eq("status", "active"),
        supabase.from("workout_plans").select("*").eq("personal_id", user.id).eq("is_active", true),
        supabase.from("workout_completions").select("*, workout_routines(name)")
          .order("completed_at", { ascending: false }).limit(100),
      ]);

      const activeStudents = studentsRes.data || [];
      setStudents(activeStudents);
      setWorkoutPlans(plansRes.data || []);

      // Filter completions to only this trainer's students
      const studentIds = new Set(activeStudents.map(s => s.student_id));
      const myCompletions = (completionsRes.data || []).filter(c => studentIds.has(c.student_id));
      setAllCompletions(myCompletions);
      setRecentCompletions(myCompletions.slice(0, 10));

      // Fetch profiles
      const ids = [...new Set([...activeStudents.map(s => s.student_id), ...myCompletions.map(c => c.student_id)])];
      if (ids.length > 0) {
        const { data: profs } = await supabase.from("profiles").select("*").in("user_id", ids);
        const map: Record<string, any> = {};
        profs?.forEach(p => { map[p.user_id] = p; });
        setProfiles(map);
      }
      setLoading(false);
    };
    load();
  }, [user]);

  const activeStudents = students.length;
  const totalPlans = workoutPlans.length;

  const now = Date.now();
  const oneWeek = 7 * 24 * 60 * 60 * 1000;
  const oneDay = 24 * 60 * 60 * 1000;

  const weeklyCompletions = allCompletions.filter(c => (now - new Date(c.completed_at).getTime()) < oneWeek).length;
  const todayCompletions = allCompletions.filter(c => new Date(c.completed_at).toDateString() === new Date().toDateString()).length;

  // Adherence: weekly completions / (students * 5 expected sessions)
  const adherencePercent = activeStudents > 0 ? Math.min(100, Math.round((weeklyCompletions / (activeStudents * 5)) * 100)) : 0;

  // Inactive students (no completion in 7+ days)
  const inactiveStudents = students.filter(s => {
    const lastCompletion = allCompletions.find(c => c.student_id === s.student_id);
    if (!lastCompletion) return true;
    return (now - new Date(lastCompletion.completed_at).getTime()) > oneWeek;
  });

  // Top performers (by completions this week)
  const studentCompletionMap: Record<string, number> = {};
  allCompletions.filter(c => (now - new Date(c.completed_at).getTime()) < oneWeek).forEach(c => {
    studentCompletionMap[c.student_id] = (studentCompletionMap[c.student_id] || 0) + 1;
  });
  const topPerformers = Object.entries(studentCompletionMap)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([id, count]) => ({ id, name: profiles[id]?.full_name || "Aluno", count }));

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Dashboard do Personal</h1>
            <p className="text-muted-foreground text-sm">Gerencie seus alunos e treinos</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button onClick={() => setLinkOpen(true)} size="sm" variant="outline" className="gap-1.5">
              <Search className="w-4 h-4" />
              Vincular Aluno
            </Button>
            <Button onClick={() => setAddOpen(true)} size="sm" className="gap-1.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white">
              <UserPlus className="w-4 h-4" />
              Cadastrar Aluno
            </Button>
            <Link to="/personal/students">
              <Button variant="outline" size="sm"><Users className="w-4 h-4 mr-1" /> Ver Todos</Button>
            </Link>
            <Link to="/personal/workouts">
              <Button size="sm" variant="outline"><Plus className="w-4 h-4 mr-1" /> Novo Treino</Button>
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatsCard title="Alunos Ativos" value={String(activeStudents)} icon={Users} />
          <StatsCard title="Planos Ativos" value={String(totalPlans)} icon={Dumbbell} />
          <StatsCard title="Treinos Hoje" value={String(todayCompletions)} icon={Activity} />
          <StatsCard title="Treinos na Semana" value={String(weeklyCompletions)} icon={TrendingUp} />
          <StatsCard title="Adesão Semanal" value={`${adherencePercent}%`} icon={BarChart3} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Inactive Students Alert */}
          <Card className={inactiveStudents.length > 0 ? "border-warning/30" : ""}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <UserX className="w-4 h-4 text-warning" />
                Inativos 7+ dias
                {inactiveStudents.length > 0 && (
                  <Badge variant="destructive" className="ml-auto">{inactiveStudents.length}</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {inactiveStudents.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Todos os alunos estão ativos! 🎉</p>
              ) : (
                <div className="space-y-2">
                  {inactiveStudents.slice(0, 5).map(s => (
                    <div key={s.id} className="flex items-center gap-2 p-2 rounded-lg bg-warning/5">
                      <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0" />
                      <span className="text-sm font-medium truncate">{profiles[s.student_id]?.full_name || "Aluno"}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top Performers */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Trophy className="w-4 h-4 text-warning" />
                Top Performers
              </CardTitle>
            </CardHeader>
            <CardContent>
              {topPerformers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Sem dados esta semana</p>
              ) : (
                <div className="space-y-2">
                  {topPerformers.map((tp, i) => (
                    <div key={tp.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                      <span className="text-xs font-bold w-5 text-center">
                        {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`}
                      </span>
                      <span className="text-sm font-medium flex-1 truncate">{tp.name}</span>
                      <Badge variant="outline" className="text-xs">{tp.count} treinos</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Flame className="w-4 h-4 text-primary" />
                Ações Rápidas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link to="/personal/workouts" className="block">
                <Button variant="outline" className="w-full justify-start h-10">
                  <Dumbbell className="w-4 h-4 mr-2" /> Criar Plano de Treino
                  <ArrowRight className="w-3 h-3 ml-auto" />
                </Button>
              </Link>
              <Link to="/personal/students" className="block">
                <Button variant="outline" className="w-full justify-start h-10">
                  <Users className="w-4 h-4 mr-2" /> Gerenciar Alunos
                  <ArrowRight className="w-3 h-3 ml-auto" />
                </Button>
              </Link>
              <Link to="/ranking" className="block">
                <Button variant="outline" className="w-full justify-start h-10">
                  <Trophy className="w-4 h-4 mr-2" /> Ranking de Alunos
                  <ArrowRight className="w-3 h-3 ml-auto" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Adherence Overview */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              Adesão por Aluno
            </CardTitle>
          </CardHeader>
          <CardContent>
            {students.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-4">Nenhum aluno vinculado.</p>
            ) : (
              <div className="space-y-3">
                {students.map(s => {
                  const count = studentCompletionMap[s.student_id] || 0;
                  const pct = Math.min(100, Math.round((count / 5) * 100));
                  return (
                    <div key={s.id} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium truncate">{profiles[s.student_id]?.full_name || "Aluno"}</span>
                        <span className="text-muted-foreground">{count}/5 treinos</span>
                      </div>
                      <Progress value={pct} className="h-2" />
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent completions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              Treinos Recentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentCompletions.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">Nenhum treino registrado ainda.</p>
            ) : (
              <div className="space-y-3">
                {recentCompletions.slice(0, 8).map(c => (
                  <div key={c.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Dumbbell className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {profiles[c.student_id]?.full_name || "Aluno"} — {c.workout_routines?.name || "Treino"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(c.completed_at).toLocaleDateString("pt-BR", { weekday: "short", day: "numeric", month: "short" })}
                        {c.duration_minutes && ` • ${c.duration_minutes}min`}
                      </p>
                    </div>
                    {c.perceived_effort && (
                      <Badge variant={c.perceived_effort >= 8 ? "destructive" : c.perceived_effort >= 5 ? "default" : "secondary"}>
                        {c.perceived_effort}/10
                      </Badge>
                    )}
                    {c.pain_report && <AlertTriangle className="w-4 h-4 text-warning" />}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* IFJ Command Center */}
        <div className="mt-6">
          <IFJCommandCenter role="personal" />
        </div>

        <LinkStudentModal
          open={linkOpen}
          onOpenChange={setLinkOpen}
          onLinked={() => { refetchLinks(); window.location.reload(); }}
          professionalRole="trainer"
        />

        <AddStudentModal
          open={addOpen}
          onOpenChange={setAddOpen}
          onAdded={() => { refetchLinks(); window.location.reload(); }}
        />
      </div>
    </DashboardLayout>
  );
}
