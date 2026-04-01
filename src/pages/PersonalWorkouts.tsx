import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/lib/tenantContext";
import { withTenantFilter } from "@/lib/tenantQueryHelpers";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Dumbbell, Plus, Search, ChevronDown, Pause, Play,
  BookOpen, Layers, ClipboardList, Sparkles,
  TrendingUp, Heart, Ruler, Trophy, ArrowRightLeft, BarChart3,
  CalendarDays, MessageCircle, FileText, Zap, Timer, Command, ArrowLeft
} from "lucide-react";
import WorkoutEditor from "@/components/workout/WorkoutEditor";
import ExerciseLibrary from "@/components/workout/ExerciseLibrary";
import WorkoutTemplates from "@/components/workout/WorkoutTemplates";
import TrainerAnamnesis from "@/components/workout/TrainerAnamnesis";
import PersonalDashboardStats from "@/components/workout/PersonalDashboardStats";
import PhysicalAssessment from "@/components/workout/PhysicalAssessment";
import PeriodizationManager from "@/components/workout/PeriodizationManager";
import CardioPrescription from "@/components/workout/CardioPrescription";
import PersonalRecords from "@/components/workout/PersonalRecords";
import CrossProfessionalAlerts from "@/components/workout/CrossProfessionalAlerts";
import WorkoutPrePlanGenerator from "@/components/workout/WorkoutPrePlanGenerator";
import WorkoutFeedbackAlerts from "@/components/workout/WorkoutFeedbackAlerts";
import WorkoutIFJInsights from "@/components/workout/WorkoutIFJInsights";
import WorkoutLoadHistory from "@/components/workout/WorkoutLoadHistory";
import WorkoutCalendar from "@/components/workout/WorkoutCalendar";
import AssessmentComparison from "@/components/workout/AssessmentComparison";
import WorkoutPDFExport from "@/components/workout/WorkoutPDFExport";
import PTStudentChat from "@/components/workout/PTStudentChat";
import PTChallenges from "@/components/workout/PTChallenges";
import WorkoutRestTimer from "@/components/workout/WorkoutRestTimer";
import IFJCommandCenter from "@/components/intelligence/modules/IFJCommandCenter";
import PersonalPremiumDashboard from "@/components/workout/PersonalPremiumDashboard";

// --- Plans Tab Component ---
function PlansTab({ plans, loading, students, onToggleStatus, onExpandPlan, expandedPlan, planDetails }: any) {
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

      {filteredPlans.map((plan: any) => (
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
                    {plan.objective} • {new Date(plan.created_at).toLocaleDateString("pt-BR")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={plan.status === "active" ? "default" : "secondary"}>
                  {plan.status === "active" ? "Ativo" : "Pausado"}
                </Badge>
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
                        {ex.load_kg && <span className="text-muted-foreground">{ex.load_kg}kg</span>}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          )}
        </Card>
      ))}

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
          onApproveAndPublish={(template: any) => { handleUseTemplate(template); setPrePlanStudent(null); }}
          onEditPlan={(template: any) => { handleUseTemplate(template); setPrePlanStudent(null); }}
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
  const { tenantId } = useTenant();
  const [plans, setPlans] = useState<any[]>([]);
  const [students, setStudents] = useState<{ student_id: string; full_name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [creating, setCreating] = useState(false);
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);
  const [planDetails, setPlanDetails] = useState<Record<string, any>>({});
  const [anamnesisStudent, setAnamnesisStudent] = useState<{ id: string; name: string } | null>(null);
  const [prePlanStudent, setPrePlanStudent] = useState<{ id: string; name: string } | null>(null);

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

  const handleUseTemplate = (template: any) => {
    setCreating(true);
    setActiveTab("plans");
    toast.info(`Template "${template.name}" carregado!`);
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
            onSaved={() => { setCreating(false); load(); }}
            onCancel={() => setCreating(false)}
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
            <TabsTrigger value="preplan" className="gap-1.5 text-xs"><Sparkles className="w-3.5 h-3.5" /> Pré-Plano IA</TabsTrigger>
            <TabsTrigger value="ifj" className="gap-1.5 text-xs bg-gradient-to-r data-[state=active]:from-amber-500/20 data-[state=active]:to-yellow-500/10 data-[state=active]:text-amber-500"><Command className="w-3.5 h-3.5" /> Meu Painel IFJ</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="mt-4 space-y-4">
            <WorkoutRestTimer />
            <PersonalPremiumDashboard
              onNavigate={setActiveTab}
              studentsCount={students.length}
              plansCount={plans.length}
            />
            <WorkoutFeedbackAlerts />
            <CrossProfessionalAlerts />
          </TabsContent>

          <TabsContent value="plans" className="mt-4">
            <PlansTab plans={plans} loading={loading} students={students} onToggleStatus={togglePlanStatus} onExpandPlan={loadPlanDetails} expandedPlan={expandedPlan} planDetails={planDetails} />
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
        </Tabs>

        {anamnesisStudent && (
          <TrainerAnamnesis
            studentId={anamnesisStudent.id}
            studentName={anamnesisStudent.name}
            open={!!anamnesisStudent}
            onClose={() => setAnamnesisStudent(null)}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
