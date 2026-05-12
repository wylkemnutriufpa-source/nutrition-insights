import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@v1/lib/auth";
import { supabase } from "@v1/integrations/supabase/client";
import { useTenant } from "@v1/lib/tenantContext";
import { withTenantFilter, getTenantIdForInsert } from "@v1/lib/tenantQueryHelpers";
import DashboardLayout from "@v1/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@v1/components/ui/card";
import { Button } from "@v1/components/ui/button";
import { Input } from "@v1/components/ui/input";
import { Badge } from "@v1/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@v1/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@v1/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@v1/components/ui/select";
import { toast } from "sonner";
import {
  Dumbbell, Plus, Search, ChevronDown, Pause, Play, Copy,
  BookOpen, Layers, ClipboardList, Sparkles,
  TrendingUp, Heart, Ruler, Trophy, ArrowRightLeft, BarChart3, Film,
  CalendarDays, MessageCircle, FileText, Zap, Timer, Command, ArrowLeft, Users
} from "lucide-react";
import WorkoutEditor from "@v1/components/workout/WorkoutEditor";
import ExerciseLibrary from "@v1/components/workout/ExerciseLibrary";
import WorkoutTemplates from "@v1/components/workout/WorkoutTemplates";
import TrainerAnamnesis from "@v1/components/workout/TrainerAnamnesis";
import PersonalDashboardStats from "@v1/components/workout/PersonalDashboardStats";
import PhysicalAssessment from "@v1/components/workout/PhysicalAssessment";
import PeriodizationManager from "@v1/components/workout/PeriodizationManager";
import CardioPrescription from "@v1/components/workout/CardioPrescription";
import PersonalRecords from "@v1/components/workout/PersonalRecords";
import CrossProfessionalAlerts from "@v1/components/workout/CrossProfessionalAlerts";
import WorkoutPrePlanGenerator from "@v1/components/workout/WorkoutPrePlanGenerator";
import WorkoutFeedbackAlerts from "@v1/components/workout/WorkoutFeedbackAlerts";
import WorkoutIFJInsights from "@v1/components/workout/WorkoutIFJInsights";
import WorkoutLoadHistory from "@v1/components/workout/WorkoutLoadHistory";
import WorkoutCalendar from "@v1/components/workout/WorkoutCalendar";
import AssessmentComparison from "@v1/components/workout/AssessmentComparison";
import WorkoutPDFExport from "@v1/components/workout/WorkoutPDFExport";
import PTStudentChat from "@v1/components/workout/PTStudentChat";
import PTChallenges from "@v1/components/workout/PTChallenges";
import WorkoutRestTimer from "@v1/components/workout/WorkoutRestTimer";
import ExerciseVideoLibrary from "@v1/components/workout/ExerciseVideoLibrary";
import IFJCommandCenter from "@v1/components/intelligence/modules/IFJCommandCenter";
import PersonalPremiumDashboard from "@v1/components/workout/PersonalPremiumDashboard";

// --- Plans Tab Component ---
function PlansTab({ plans, loading, students, onToggleStatus, onExpandPlan, expandedPlan, planDetails, onClonePlan }: any) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const GROUP_COLORS: Record<string, string> = {
    biset: "border-l-blue-500",
    triset: "border-l-purple-500",
    circuit: "border-l-amber-500",
  };

  const filteredPlans = plans.filter((p: any) => {
    const matchSearch = !searchTerm || p.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = filterStatus === "all" || p.status === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar plano..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 h-9" />
        </div>
        <div className="flex gap-1">
          {["all", "active", "paused"].map((s) => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${filterStatus === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
              {s === "all" ? "Todos" : s === "active" ? "Ativos" : "Pausados"}
            </button>
          ))}
        </div>
      </div>

      {filteredPlans.map((plan: any) => {
        const studentName = students.find((s: any) => s.student_id === plan.student_id)?.full_name || "";
        return (
          <Card key={plan.id} className="group hover:border-primary/20 transition-all">
            <CardHeader className="pb-2 cursor-pointer" onClick={() => onExpandPlan(plan.id)}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Dumbbell className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{plan.title}</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {studentName && <><Users className="w-3 h-3 inline mr-1" />{studentName} • </>}
                      {plan.objective} • {new Date(plan.created_at).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={plan.status === "active" ? "default" : "secondary"}>
                    {plan.status === "active" ? "Ativo" : "Pausado"}
                  </Badge>
                  <Button variant="ghost" size="icon" className="h-8 w-8" title="Clonar para outro aluno"
                    onClick={(e) => { e.stopPropagation(); onClonePlan(plan); }}>
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); onToggleStatus(plan.id, plan.status); }}>
                    {plan.status === "active" ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </Button>
                  <ChevronDown className={`w-4 h-4 transition-transform ${expandedPlan === plan.id ? "rotate-180" : ""}`} />
                </div>
              </div>
            </CardHeader>
            {expandedPlan === plan.id && planDetails[plan.id] && (
              <CardContent className="pt-0 space-y-3">
                {planDetails[plan.id].map((routine: any) => (
                  <div key={routine.id} className="bg-muted/30 rounded-lg p-3">
                    <p className="text-sm font-semibold mb-2">{routine.name}</p>
                    <div className="space-y-1">
                      {(routine.workout_exercises || []).sort((a: any, b: any) => a.sort_order - b.sort_order).map((ex: any) => (
                        <div key={ex.id} className={`flex items-center gap-2 text-xs p-1.5 rounded ${ex.group_type && ex.group_type !== "single" ? `border-l-2 ${GROUP_COLORS[ex.group_type] || ""} pl-3` : ""}`}>
                          {ex.group_type && ex.group_type !== "single" && ex.group_order === 0 && (
                            <Badge className="text-[9px] py-0 px-1">{ex.group_type.toUpperCase()}</Badge>
                          )}
                          <span className="font-medium flex-1">{ex.name}</span>
                          <span className="text-muted-foreground">{ex.sets}×{ex.reps}</span>
                          {ex.rest_seconds && <span className="text-muted-foreground text-[10px]">{ex.rest_seconds}s</span>}
                          {ex.load_kg && <span className="text-muted-foreground">{ex.load_kg}kg</span>}
                          {ex.video_url && <Film className="w-3 h-3 text-primary" />}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            )}
          </Card>
        );
      })}

      {filteredPlans.length === 0 && !loading && (
        <div className="text-center py-12 text-muted-foreground">
          <Dumbbell className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Nenhum plano encontrado</p>
          <p className="text-sm mt-1">Clique em "Novo Plano" para começar</p>
        </div>
      )}
    </div>
  );
}
// --- Anamnesis Tab ---
function AnamnesisTab({ students, onSelectStudent }: any) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ClipboardList className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-bold">Anamnese dos Alunos</h2>
      </div>
      {students.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Nenhum aluno vinculado</p>
        </div>
      ) : (
        <div className="grid gap-2">
          {students.map((s: any) => (
            <Card key={s.student_id} className="hover:border-primary/20 transition-all cursor-pointer" onClick={() => onSelectStudent({ id: s.student_id, name: s.full_name })}>
              <CardContent className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                    <ClipboardList className="w-4 h-4 text-primary" />
                  </div>
                  <span className="font-medium text-sm">{s.full_name}</span>
                </div>
                <Button variant="outline" size="sm">Avaliar</Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// --- PrePlan Tab ---
function PrePlanTab({ students, prePlanStudent, setPrePlanStudent, handleUseTemplate }: any) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-bold">Pré-Plano Automático</h2>
        <Badge variant="secondary" className="text-xs">Baseado na anamnese</Badge>
      </div>
      <p className="text-xs text-muted-foreground">
        Selecione um aluno para gerar automaticamente um plano de treino baseado na anamnese dele.
      </p>
      {students.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Nenhum aluno vinculado</p>
        </div>
      ) : prePlanStudent ? (
        <WorkoutPrePlanGenerator
          studentId={prePlanStudent.id}
          studentName={prePlanStudent.name}
          onApproveAndPublish={(template: any) => { handleUseTemplate(template, prePlanStudent.id); setPrePlanStudent(null); }}
          onEditPlan={(template: any) => { handleUseTemplate(template, prePlanStudent.id); setPrePlanStudent(null); }}
        />
      ) : (
        <div className="grid gap-2">
          {students.map((s: any) => (
            <Card key={s.student_id} className="hover:border-primary/20 transition-all cursor-pointer" onClick={() => setPrePlanStudent({ id: s.student_id, name: s.full_name })}>
              <CardContent className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <span className="font-medium text-sm">{s.full_name}</span>
                    <p className="text-[11px] text-muted-foreground">Clique para gerar pré-plano</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="gap-1">
                  <Sparkles className="w-3 h-3" /> Gerar
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {prePlanStudent && (
        <Button variant="ghost" size="sm" onClick={() => setPrePlanStudent(null)}>
          ← Voltar à lista de alunos
        </Button>
      )}
    </div>
  );
}

// --- Main Component ---
export default function PersonalWorkouts() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { tenantId } = useTenant();
  const [plans, setPlans] = useState<any[]>([]);
  const [students, setStudents] = useState<{ student_id: string; full_name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [creating, setCreating] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);
  const [planDetails, setPlanDetails] = useState<Record<string, any>>({});
  const [anamnesisStudent, setAnamnesisStudent] = useState<{ id: string; name: string } | null>(null);
  const [prePlanStudent, setPrePlanStudent] = useState<{ id: string; name: string } | null>(null);
  const [clonePlan, setClonePlan] = useState<any>(null);
  const [cloneTargetStudent, setCloneTargetStudent] = useState("");
  const [cloning, setCloning] = useState(false);

  const load = async () => {
    if (!user) return;
    const [plansRes, linksRes] = await Promise.all([
      withTenantFilter(
        supabase.from("workout_plans").select("*").eq("personal_id", user.id).order("created_at", { ascending: false }),
        tenantId
      ),
      (supabase as any).from("patient_professional_links").select("patient_id").eq("professional_id", user.id).eq("professional_role", "trainer").eq("link_status", "active"),
    ]);
    setPlans(plansRes.data || []);

    const ids = (linksRes.data || []).map((l: any) => l.patient_id);
    if (ids.length > 0) {
      const { data: profs } = await supabase.from("profiles").select("user_id, full_name").in("user_id", ids);
      setStudents((profs || []).map((p) => ({ student_id: p.user_id, full_name: p.full_name || "Aluno" })));
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const togglePlanStatus = async (planId: string, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "paused" : "active";
    await supabase.from("workout_plans").update({ status: newStatus, is_active: newStatus === "active" }).eq("id", planId);
    toast.success(newStatus === "active" ? "Plano ativado" : "Plano pausado");
    load();
  };

  const loadPlanDetails = async (planId: string) => {
    if (planDetails[planId]) {
      setExpandedPlan(expandedPlan === planId ? null : planId);
      return;
    }
    const { data } = await supabase.from("workout_routines").select("*, workout_exercises(*)").eq("plan_id", planId).order("sort_order");
    setPlanDetails({ ...planDetails, [planId]: data || [] });
    setExpandedPlan(planId);
  };

  const handleUseTemplate = (template: any, studentId?: string) => {
    setSelectedTemplate(template);
    if (studentId) setSelectedStudentId(studentId);
    setCreating(true);
    setActiveTab("plans");
    toast.info(`Template "${template.name}" carregado!`);
  };

  const handleClonePlan = async () => {
    if (!user || !clonePlan || !cloneTargetStudent) return;
    setCloning(true);
    try {
      const { data: newPlan, error: planErr } = await supabase.from("workout_plans").insert({
        personal_id: user.id,
        student_id: cloneTargetStudent,
        title: `${clonePlan.title} (cópia)`,
        description: clonePlan.description,
        objective: clonePlan.objective,
        start_date: new Date().toISOString().split("T")[0],
        end_date: null,
        status: "active",
        is_active: true,
        ...getTenantIdForInsert(tenantId),
      }).select().single();
      if (planErr || !newPlan) throw planErr;

      const { data: srcRoutines } = await supabase
        .from("workout_routines").select("*, workout_exercises(*)")
        .eq("plan_id", clonePlan.id).order("sort_order");

      for (const routine of (srcRoutines || [])) {
        const { data: newRoutine } = await supabase.from("workout_routines").insert({
          plan_id: newPlan.id, name: routine.name, description: routine.description,
          day_of_week: routine.day_of_week, estimated_duration: routine.estimated_duration,
          sort_order: routine.sort_order,
        }).select().single();
        if (!newRoutine) continue;

        const exercises = (routine.workout_exercises || []).map((ex: any) => ({
          routine_id: newRoutine.id, name: ex.name, sets: ex.sets, reps: ex.reps,
          load_kg: ex.load_kg, rest_seconds: ex.rest_seconds, notes: ex.notes,
          muscle_group: ex.muscle_group, video_url: ex.video_url, sort_order: ex.sort_order,
          group_id: ex.group_id, group_type: ex.group_type, group_order: ex.group_order,
          exercise_library_id: ex.exercise_library_id, rpe: ex.rpe, cadence: ex.cadence,
          method_label: ex.method_label,
        }));
        if (exercises.length > 0) await supabase.from("workout_exercises").insert(exercises);
      }

      const targetName = students.find(s => s.student_id === cloneTargetStudent)?.full_name || "aluno";
      toast.success(`Plano clonado para ${targetName}! 🎯`);
      setClonePlan(null);
      setCloneTargetStudent("");
      load();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao clonar plano");
    }
    setCloning(false);
  };

  if (creating) {
    return (
      <DashboardLayout>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Dumbbell className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-bold">Novo Plano de Treino</h1>
          </div>
          <WorkoutEditor
            students={students}
            initialData={selectedTemplate}
            initialStudentId={selectedStudentId || undefined}
            onSaved={() => { setCreating(false); setSelectedTemplate(null); setSelectedStudentId(null); load(); }}
            onCancel={() => { setCreating(false); setSelectedTemplate(null); setSelectedStudentId(null); }}
          />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => navigate("/personal/dashboard")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            {activeTab !== "dashboard" && (
              <Button variant="ghost" size="icon" className="h-8 w-8 mr-1" onClick={() => setActiveTab("dashboard")}>
                <ArrowRightLeft className="w-4 h-4 rotate-180" />
              </Button>
            )}
            <Dumbbell className="w-6 h-6 text-primary" />
            <div>
              <h1 className="text-xl font-bold">Módulo de Treinos</h1>
              <p className="text-xs text-muted-foreground">{plans.length} planos • {students.length} alunos</p>
            </div>
          </div>
          <div className="flex gap-2">
            {activeTab !== "dashboard" && (
              <Button variant="outline" size="sm" onClick={() => setActiveTab("dashboard")} className="gap-1.5">
                <BarChart3 className="w-3.5 h-3.5" /> Dashboard
              </Button>
            )}
            <Button onClick={() => { setCreating(true); setActiveTab("plans"); }} className="gap-1.5">
              <Plus className="w-4 h-4" /> Novo Plano
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-card border border-border flex-wrap h-auto gap-0.5 p-1">
            <TabsTrigger value="dashboard" className="gap-1.5 text-xs"><BarChart3 className="w-3.5 h-3.5" /> Dashboard</TabsTrigger>
            <TabsTrigger value="plans" className="gap-1.5 text-xs"><Layers className="w-3.5 h-3.5" /> Planos</TabsTrigger>
            <TabsTrigger value="calendar" className="gap-1.5 text-xs"><CalendarDays className="w-3.5 h-3.5" /> Calendário</TabsTrigger>
            <TabsTrigger value="evolution" className="gap-1.5 text-xs"><TrendingUp className="w-3.5 h-3.5" /> Evolução</TabsTrigger>
            <TabsTrigger value="periodization" className="gap-1.5 text-xs"><TrendingUp className="w-3.5 h-3.5" /> Periodização</TabsTrigger>
            <TabsTrigger value="cardio" className="gap-1.5 text-xs"><Heart className="w-3.5 h-3.5" /> Cardio</TabsTrigger>
            <TabsTrigger value="assessments" className="gap-1.5 text-xs"><Ruler className="w-3.5 h-3.5" /> Avaliações</TabsTrigger>
            <TabsTrigger value="comparison" className="gap-1.5 text-xs"><ArrowRightLeft className="w-3.5 h-3.5" /> Comparativo</TabsTrigger>
            <TabsTrigger value="records" className="gap-1.5 text-xs"><Trophy className="w-3.5 h-3.5" /> PRs</TabsTrigger>
            <TabsTrigger value="challenges" className="gap-1.5 text-xs"><Trophy className="w-3.5 h-3.5" /> Desafios</TabsTrigger>
            <TabsTrigger value="chat" className="gap-1.5 text-xs"><MessageCircle className="w-3.5 h-3.5" /> Chat</TabsTrigger>
            <TabsTrigger value="export" className="gap-1.5 text-xs"><FileText className="w-3.5 h-3.5" /> Exportar</TabsTrigger>
            <TabsTrigger value="templates" className="gap-1.5 text-xs"><Sparkles className="w-3.5 h-3.5" /> Templates</TabsTrigger>
            <TabsTrigger value="library" className="gap-1.5 text-xs"><BookOpen className="w-3.5 h-3.5" /> Biblioteca</TabsTrigger>
            <TabsTrigger value="anamnesis" className="gap-1.5 text-xs"><ClipboardList className="w-3.5 h-3.5" /> Anamnese</TabsTrigger>
            <TabsTrigger value="videos" className="gap-1.5 text-xs"><Film className="w-3.5 h-3.5" /> Vídeos</TabsTrigger>
            <TabsTrigger value="preplan" className="gap-1.5 text-xs"><Sparkles className="w-3.5 h-3.5" /> Pré-Plano IA</TabsTrigger>
            <TabsTrigger value="ifj" className="gap-1.5 text-xs bg-gradient-to-r data-[state=active]:from-amber-500/20 data-[state=active]:to-yellow-500/10 data-[state=active]:text-amber-500"><Command className="w-3.5 h-3.5" /> Meu Painel IFJ</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="mt-4 space-y-4">
            <WorkoutRestTimer />
            <PersonalPremiumDashboard
              onNavigate={setActiveTab}
              onStartCreating={() => { setCreating(true); setActiveTab("plans"); }}
              studentsCount={students.length}
              plansCount={plans.length}
            />
            <WorkoutFeedbackAlerts />
            <CrossProfessionalAlerts />
          </TabsContent>

          <TabsContent value="plans" className="mt-4">
            <PlansTab plans={plans} loading={loading} students={students} onToggleStatus={togglePlanStatus} onExpandPlan={loadPlanDetails} expandedPlan={expandedPlan} planDetails={planDetails} onClonePlan={setClonePlan} />
          </TabsContent>

          <TabsContent value="calendar" className="mt-4">
            <WorkoutCalendar students={students} />
          </TabsContent>

          <TabsContent value="evolution" className="mt-4">
            <WorkoutLoadHistory students={students} />
          </TabsContent>

          <TabsContent value="periodization" className="mt-4">
            <PeriodizationManager plans={plans} students={students} onRefresh={load} />
          </TabsContent>

          <TabsContent value="cardio" className="mt-4">
            <CardioPrescription students={students} plans={plans} />
          </TabsContent>

          <TabsContent value="assessments" className="mt-4">
            <PhysicalAssessment students={students} />
          </TabsContent>

          <TabsContent value="comparison" className="mt-4">
            <AssessmentComparison students={students} />
          </TabsContent>

          <TabsContent value="records" className="mt-4">
            <PersonalRecords students={students} />
          </TabsContent>

          <TabsContent value="challenges" className="mt-4">
            <PTChallenges students={students} />
          </TabsContent>

          <TabsContent value="chat" className="mt-4">
            <PTStudentChat students={students} />
          </TabsContent>

          <TabsContent value="export" className="mt-4">
            <WorkoutPDFExport plans={plans} students={students} />
          </TabsContent>

          <TabsContent value="templates" className="mt-4">
            <WorkoutTemplates onUseTemplate={handleUseTemplate} />
          </TabsContent>

          <TabsContent value="library" className="mt-4">
            <ExerciseLibrary />
          </TabsContent>

          <TabsContent value="anamnesis" className="mt-4">
            <AnamnesisTab students={students} onSelectStudent={setAnamnesisStudent} />
          </TabsContent>

          <TabsContent value="ifj" className="mt-4">
            <IFJCommandCenter role="personal" />
          </TabsContent>
          <TabsContent value="preplan" className="mt-4">
            <PrePlanTab students={students} prePlanStudent={prePlanStudent} setPrePlanStudent={setPrePlanStudent} handleUseTemplate={handleUseTemplate} />
          </TabsContent>
          <TabsContent value="videos" className="mt-4">
            <ExerciseVideoLibrary draggable />
          </TabsContent>
        </Tabs>

        {anamnesisStudent && (
          <TrainerAnamnesis
            studentId={anamnesisStudent.id}
            studentName={anamnesisStudent.name}
            open={!!anamnesisStudent}
            onClose={() => setAnamnesisStudent(null)}
          />
        )}

        {/* Clone Plan Dialog */}
        <Dialog open={!!clonePlan} onOpenChange={(open) => { if (!open) { setClonePlan(null); setCloneTargetStudent(""); } }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Copy className="w-5 h-5 text-primary" />
                Clonar Plano para Outro Aluno
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-sm font-semibold">{clonePlan?.title}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {clonePlan?.objective} • Criado em {clonePlan?.created_at ? new Date(clonePlan.created_at).toLocaleDateString("pt-BR") : ""}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Selecionar aluno destino</label>
                <Select value={cloneTargetStudent} onValueChange={setCloneTargetStudent}>
                  <SelectTrigger><SelectValue placeholder="Escolha o aluno..." /></SelectTrigger>
                  <SelectContent>
                    {students.filter(s => s.student_id !== clonePlan?.student_id).map(s => (
                      <SelectItem key={s.student_id} value={s.student_id}>
                        <div className="flex items-center gap-2">
                          <Users className="w-3 h-3" />
                          {s.full_name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleClonePlan} disabled={cloning || !cloneTargetStudent} className="w-full gap-2">
                <Copy className="w-4 h-4" />
                {cloning ? "Clonando..." : "Clonar Plano"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
