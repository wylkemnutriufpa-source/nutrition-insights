import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import StatsCard from "@/components/dashboard/StatsCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Link } from "react-router-dom";
import {
  Users, Dumbbell, TrendingUp, AlertTriangle, Trophy,
  Plus, Calendar, BarChart3, ArrowRight, Activity
} from "lucide-react";

export default function PersonalDashboard() {
  const { user } = useAuth();
  const [students, setStudents] = useState<any[]>([]);
  const [workoutPlans, setWorkoutPlans] = useState<any[]>([]);
  const [recentCompletions, setRecentCompletions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [studentsRes, plansRes, completionsRes] = await Promise.all([
        supabase.from("personal_trainer_students").select("*").eq("personal_id", user.id).eq("status", "active"),
        supabase.from("workout_plans").select("*").eq("personal_id", user.id).eq("is_active", true),
        supabase.from("workout_completions").select("*, workout_routines(name), workout_plans(title, student_id)")
          .eq("workout_plans.personal_id", user.id)
          .order("completed_at", { ascending: false }).limit(10),
      ]);
      setStudents(studentsRes.data || []);
      setWorkoutPlans(plansRes.data || []);
      setRecentCompletions(completionsRes.data || []);
      setLoading(false);
    };
    load();
  }, [user]);

  const activeStudents = students.length;
  const totalPlans = workoutPlans.length;
  const weeklyCompletions = recentCompletions.filter(c => {
    const d = new Date(c.completed_at);
    const now = new Date();
    return (now.getTime() - d.getTime()) < 7 * 24 * 60 * 60 * 1000;
  }).length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Dashboard do Personal</h1>
            <p className="text-muted-foreground text-sm">Gerencie seus alunos e treinos</p>
          </div>
          <div className="flex gap-2">
            <Link to="/personal/students">
              <Button variant="outline" size="sm"><Users className="w-4 h-4 mr-1" /> Alunos</Button>
            </Link>
            <Link to="/personal/workouts">
              <Button size="sm" className="bg-primary"><Plus className="w-4 h-4 mr-1" /> Novo Treino</Button>
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatsCard title="Alunos Ativos" value={String(activeStudents)} icon={<Users className="w-5 h-5" />} />
          <StatsCard title="Planos de Treino" value={String(totalPlans)} icon={<Dumbbell className="w-5 h-5" />} />
          <StatsCard title="Treinos na Semana" value={String(weeklyCompletions)} icon={<TrendingUp className="w-5 h-5" />} />
          <StatsCard title="Adesão Média" value={activeStudents > 0 ? `${Math.round((weeklyCompletions / (activeStudents * 5)) * 100)}%` : "—"} icon={<BarChart3 className="w-5 h-5" />} />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="hover:border-primary/30 transition-colors cursor-pointer">
            <Link to="/personal/workouts/new">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Dumbbell className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Criar Plano de Treino</h3>
                  <p className="text-sm text-muted-foreground">Monte rotinas A/B/C/D</p>
                </div>
                <ArrowRight className="w-4 h-4 ml-auto text-muted-foreground" />
              </CardContent>
            </Link>
          </Card>

          <Card className="hover:border-primary/30 transition-colors cursor-pointer">
            <Link to="/personal/students">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                  <Users className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <h3 className="font-semibold">Gerenciar Alunos</h3>
                  <p className="text-sm text-muted-foreground">Vincular e acompanhar</p>
                </div>
                <ArrowRight className="w-4 h-4 ml-auto text-muted-foreground" />
              </CardContent>
            </Link>
          </Card>

          <Card className="hover:border-primary/30 transition-colors cursor-pointer">
            <Link to="/ranking">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center">
                  <Trophy className="w-6 h-6 text-warning" />
                </div>
                <div>
                  <h3 className="font-semibold">Ranking de Alunos</h3>
                  <p className="text-sm text-muted-foreground">Performance e engajamento</p>
                </div>
                <ArrowRight className="w-4 h-4 ml-auto text-muted-foreground" />
              </CardContent>
            </Link>
          </Card>
        </div>

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
                {recentCompletions.slice(0, 5).map(c => (
                  <div key={c.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Dumbbell className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{c.workout_routines?.name || "Treino"}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(c.completed_at).toLocaleDateString("pt-BR")}
                        {c.perceived_effort && ` • Esforço: ${c.perceived_effort}/10`}
                        {c.duration_minutes && ` • ${c.duration_minutes}min`}
                      </p>
                    </div>
                    {c.perceived_effort && (
                      <Badge variant={c.perceived_effort >= 8 ? "destructive" : c.perceived_effort >= 5 ? "default" : "secondary"}>
                        {c.perceived_effort}/10
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
