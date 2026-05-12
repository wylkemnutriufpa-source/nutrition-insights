import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import IFJCommandCenter from "@/components/intelligence/modules/IFJCommandCenter";
import StatsCard from "@/components/dashboard/StatsCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Users, Dumbbell, TrendingUp, AlertTriangle, Trophy,
  Plus, BarChart3, ArrowRight, Activity, UserX, Flame, Search, UserPlus, Camera
} from "lucide-react";
import AddStudentModal from "@/components/professional/AddStudentModal";
import LinkStudentModal from "@/components/professional/LinkStudentModal";
import { useProfessionalLinks } from "@/hooks/useProfessionalLinks";
import InlineExperienceToggle from "@/components/dashboard/InlineExperienceToggle";

export default function PersonalDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [students, setStudents] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [myProfile, setMyProfile] = useState<any>(null);
  const [workoutPlans, setWorkoutPlans] = useState<any[]>([]);
  const [recentCompletions, setRecentCompletions] = useState<any[]>([]);
  const [allCompletions, setAllCompletions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { refetch: refetchLinks } = useProfessionalLinks("trainer");

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [studentsRes, plansRes, completionsRes, profileRes] = await Promise.all([
        supabase.from("personal_trainer_students").select("*").eq("personal_id", user.id).eq("status", "active"),
        supabase.from("workout_plans").select("*").eq("personal_id", user.id).eq("is_active", true),
        supabase.from("workout_completions").select("*, workout_routines(name)")
          .order("completed_at", { ascending: false }).limit(100),
        supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
      ]);

      const activeStudents = studentsRes.data || [];
      setStudents(activeStudents);
      setWorkoutPlans(plansRes.data || []);
      setMyProfile(profileRes.data);

      const studentIds = new Set(activeStudents.map(s => s.student_id));
      const myCompletions = (completionsRes.data || []).filter(c => studentIds.has(c.student_id));
      setAllCompletions(myCompletions);
      setRecentCompletions(myCompletions.slice(0, 10));

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

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Selecione uma imagem válida");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem deve ter no máximo 5MB");
      return;
    }

    setUploadingPhoto(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("body-images")
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("body-images")
        .getPublicUrl(path);

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("user_id", user.id);

      if (updateError) throw updateError;

      setMyProfile((prev: any) => ({ ...prev, avatar_url: publicUrl }));
      toast.success("Foto atualizada com sucesso!");
    } catch (err: any) {
      toast.error("Erro ao enviar foto: " + (err.message || ""));
    } finally {
      setUploadingPhoto(false);
    }
  };

  const activeStudents = students.length;
  const totalPlans = workoutPlans.length;
  const now = Date.now();
  const oneWeek = 7 * 24 * 60 * 60 * 1000;

  const weeklyCompletions = allCompletions.filter(c => (now - new Date(c.completed_at).getTime()) < oneWeek).length;
  const todayCompletions = allCompletions.filter(c => new Date(c.completed_at).toDateString() === new Date().toDateString()).length;
  const adherencePercent = activeStudents > 0 ? Math.min(100, Math.round((weeklyCompletions / (activeStudents * 5)) * 100)) : 0;

  const inactiveStudents = students.filter(s => {
    const lastCompletion = allCompletions.find(c => c.student_id === s.student_id);
    if (!lastCompletion) return true;
    return (now - new Date(lastCompletion.completed_at).getTime()) > oneWeek;
  });

  const studentCompletionMap: Record<string, number> = {};
  allCompletions.filter(c => (now - new Date(c.completed_at).getTime()) < oneWeek).forEach(c => {
    studentCompletionMap[c.student_id] = (studentCompletionMap[c.student_id] || 0) + 1;
  });
  const topPerformers = Object.entries(studentCompletionMap)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([id, count]) => ({ id, name: profiles[id]?.full_name || "Aluno", count }));

  const firstName = myProfile?.full_name?.split(" ")[0] || user?.user_metadata?.full_name?.split(" ")[0] || "Treinador";
  const initials = (myProfile?.full_name || "T")
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Experience Mode Toggle */}
        <InlineExperienceToggle />
        {/* Welcome Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative group">
              <Avatar className="w-16 h-16 border-2 border-primary/20 shadow-lg">
                {myProfile?.avatar_url ? (
                  <AvatarImage src={myProfile.avatar_url} alt={firstName} />
                ) : null}
                <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5 text-primary font-bold text-lg">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPhoto}
                className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              >
                <Camera className="w-5 h-5 text-white" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoUpload}
              />
            </div>
            <div>
              <h1 className="text-2xl font-bold">
                {greeting}, {firstName}! 💪
              </h1>
              <p className="text-muted-foreground text-sm">
                {activeStudents} aluno{activeStudents !== 1 ? "s" : ""} ativo{activeStudents !== 1 ? "s" : ""} • {totalPlans} plano{totalPlans !== 1 ? "s" : ""} de treino
              </p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button onClick={() => setLinkOpen(true)} size="sm" variant="outline" className="gap-1.5">
              <Search className="w-4 h-4" />
              Vincular Aluno
            </Button>
            <Link to="/invite-patient">
              <Button size="sm" variant="outline" className="gap-1.5 border-amber-500/30 text-amber-600 hover:bg-amber-500/5">
                <UserPlus className="w-4 h-4" /> Convidar
              </Button>
            </Link>
            <Button onClick={() => setAddOpen(true)} size="sm" className="gap-1.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white">
              <UserPlus className="w-4 h-4" />
              Cadastrar Rápido
            </Button>
            <Link to="/personal/students">
              <Button variant="outline" size="sm"><Users className="w-4 h-4 mr-1" /> Ver Todos</Button>
            </Link>
            <Link to="/personal/workouts">
              <Button size="sm" variant="outline"><Plus className="w-4 h-4 mr-1" /> Novo Treino</Button>
            </Link>
          </div>
        </div>

        {/* Stats - all clickable */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatsCard title="Alunos Ativos" value={String(activeStudents)} icon={Users} href="/personal/students" />
          <StatsCard title="Planos Ativos" value={String(totalPlans)} icon={Dumbbell} href="/personal/workouts" />
          <StatsCard title="Treinos Hoje" value={String(todayCompletions)} icon={Activity} href="/personal/workouts" />
          <StatsCard title="Treinos na Semana" value={String(weeklyCompletions)} icon={TrendingUp} href="/personal/workouts" />
          <StatsCard title="Adesão Semanal" value={`${adherencePercent}%`} icon={BarChart3} href="/reports" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Inactive Students Alert - clickable items */}
          <Card className={`${inactiveStudents.length > 0 ? "border-warning/30" : ""} cursor-pointer`}
                onClick={() => navigate("/personal/students")}>
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
                    <div key={s.id} className="flex items-center gap-2 p-2 rounded-lg bg-warning/5 hover:bg-warning/10 transition-colors">
                      <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0" />
                      <span className="text-sm font-medium truncate">{profiles[s.student_id]?.full_name || "Aluno"}</span>
                      <ArrowRight className="w-3 h-3 ml-auto text-muted-foreground" />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top Performers - clickable */}
          <Card className="cursor-pointer" onClick={() => navigate("/ranking")}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Trophy className="w-4 h-4 text-warning" />
                Top Performers
                <ArrowRight className="w-3 h-3 ml-auto text-muted-foreground" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              {topPerformers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Sem dados esta semana</p>
              ) : (
                <div className="space-y-2">
                  {topPerformers.map((tp, i) => (
                    <div key={tp.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
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
              <Link to="/settings" className="block">
                <Button variant="outline" className="w-full justify-start h-10">
                  <Camera className="w-4 h-4 mr-2" /> Configurações
                  <ArrowRight className="w-3 h-3 ml-auto" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Adherence Overview - clickable */}
        <Card className="cursor-pointer" onClick={() => navigate("/personal/students")}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              Adesão por Aluno
              <ArrowRight className="w-4 h-4 ml-auto text-muted-foreground" />
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
                  <div key={c.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
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
          onLinked={() => { refetchLinks(); }}
          professionalRole="trainer"
        />

        <AddStudentModal
          open={addOpen}
          onOpenChange={setAddOpen}
          onAdded={() => { refetchLinks(); }}
        />
      </div>
    </DashboardLayout>
  );
}
