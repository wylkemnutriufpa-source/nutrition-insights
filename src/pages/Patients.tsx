import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Users, Plus, UserCheck, UserX, ChevronRight, Search,
  TrendingUp, TrendingDown, Minus, Target, Loader2, ToggleLeft, ToggleRight
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface PatientInfo {
  id: string;
  patient_id: string;
  status: string;
  notes: string | null;
  created_at: string;
  profile?: { full_name: string; avatar_url: string | null } | null;
  priorityScore?: number;
  stats?: { last_meal_date?: string; total_xp?: number; current_streak?: number } | null;
  checklistAdherence?: number;
  programs?: { id: string; title: string }[];
}

interface ProgramInfo {
  id: string;
  title: string;
}

function computeScore(stats: any, checklistData: any): number {
  let score = 0;
  if (checklistData) {
    const total = checklistData.total || 0;
    const completed = checklistData.completed || 0;
    score += total > 0 ? Math.round((completed / total) * 40) : 20;
  }
  if (stats?.last_meal_date) {
    const daysSince = Math.floor((Date.now() - new Date(stats.last_meal_date).getTime()) / 86400000);
    score += daysSince <= 1 ? 20 : daysSince <= 3 ? 15 : daysSince <= 7 ? 10 : 5;
  }
  if (stats?.total_xp) {
    score += stats.total_xp > 500 ? 20 : stats.total_xp > 100 ? 15 : 10;
  }
  if (stats?.current_streak !== undefined) {
    score += stats.current_streak >= 7 ? 20 : stats.current_streak >= 3 ? 15 : stats.current_streak >= 1 ? 10 : 5;
  }
  return Math.min(100, Math.max(0, score));
}

function getScoreTier(score: number): { label: string; color: string; bg: string; ring: string; icon: React.ReactNode; description: string } {
  if (score >= 70) return {
    label: "Ótimo", color: "text-success", bg: "bg-success", ring: "ring-success/30",
    icon: <TrendingUp className="w-3 h-3" />, description: "Paciente engajado"
  };
  if (score >= 40) return {
    label: "Médio", color: "text-warning", bg: "bg-warning", ring: "ring-warning/30",
    icon: <Minus className="w-3 h-3" />, description: "Precisa de atenção"
  };
  return {
    label: "Crítico", color: "text-destructive", bg: "bg-destructive", ring: "ring-destructive/30",
    icon: <TrendingDown className="w-3 h-3" />, description: "Contato urgente"
  };
}

function ScoreRing({ score }: { score: number }) {
  const tier = getScoreTier(score);
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  return (
    <div className="relative w-12 h-12 flex items-center justify-center flex-shrink-0">
      <svg className="w-12 h-12 -rotate-90" viewBox="0 0 48 48">
        <circle cx="24" cy="24" r={radius} fill="none" stroke="currentColor" strokeWidth="4" className="text-muted/20" />
        <circle cx="24" cy="24" r={radius} fill="none" strokeWidth="4"
          strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round"
          className={`transition-all duration-700 ${score >= 70 ? "stroke-success" : score >= 40 ? "stroke-warning" : "stroke-destructive"}`}
        />
      </svg>
      <span className={`absolute text-xs font-bold ${tier.color}`}>{score}</span>
    </div>
  );
}

function ScoreBar({ score, label }: { score: number; label: string }) {
  const tier = getScoreTier(score);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className={`font-semibold flex items-center gap-1 ${tier.color}`}>{tier.icon} {tier.label}</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <motion.div initial={{ width: 0 }} animate={{ width: `${score}%` }} transition={{ duration: 0.8, ease: "easeOut" }} className={`h-full rounded-full ${tier.bg}`} />
      </div>
      <p className="text-xs text-muted-foreground">{tier.description}</p>
    </div>
  );
}

// ─── Assign to Program Dialog ───
function AssignProgramDialog({
  open, onOpenChange, patient, programs, onAssigned
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  patient: PatientInfo | null;
  programs: ProgramInfo[];
  onAssigned: () => void;
}) {
  const [selectedProgram, setSelectedProgram] = useState("");
  const [assigning, setAssigning] = useState(false);

  const alreadyEnrolled = new Set(patient?.programs?.map(p => p.id) || []);
  const available = programs.filter(p => !alreadyEnrolled.has(p.id));

  const handleAssign = async () => {
    if (!patient || !selectedProgram) return;
    setAssigning(true);
    const { error } = await supabase.from("program_patients").insert({
      program_id: selectedProgram,
      patient_id: patient.patient_id,
      status: "active",
    });
    if (error) {
      if (error.code === "23505") toast.info("Paciente já está neste programa");
      else toast.error(error.message);
    } else {
      toast.success("Paciente adicionado ao programa!");
      onAssigned();
      onOpenChange(false);
    }
    setAssigning(false);
    setSelectedProgram("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <Target className="w-5 h-5" /> Adicionar a Programa
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Adicionando <strong>{patient?.profile?.full_name}</strong> a um programa
          </p>

          {patient?.programs && patient.programs.length > 0 && (
            <div>
              <Label className="text-xs">Programas atuais</Label>
              <div className="flex flex-wrap gap-1 mt-1">
                {patient.programs.map(pg => (
                  <Badge key={pg.id} variant="secondary" className="text-xs">{pg.title}</Badge>
                ))}
              </div>
            </div>
          )}

          {available.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              {programs.length === 0 ? "Nenhum programa criado ainda" : "Paciente já está em todos os programas"}
            </p>
          ) : (
            <>
              <div>
                <Label className="text-xs">Programa</Label>
                <Select value={selectedProgram} onValueChange={setSelectedProgram}>
                  <SelectTrigger><SelectValue placeholder="Selecione um programa" /></SelectTrigger>
                  <SelectContent>
                    {available.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleAssign} disabled={!selectedProgram || assigning} className="w-full gap-2">
                {assigning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Target className="w-4 h-4" />}
                Adicionar ao Programa
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Patients() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [patients, setPatients] = useState<PatientInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [patientName, setPatientName] = useState("");
  const [patientPassword, setPatientPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "critical" | "medium" | "good">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [programFilter, setProgramFilter] = useState<"all" | "enrolled" | "not_enrolled">("all");
  const [programs, setPrograms] = useState<ProgramInfo[]>([]);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assignTarget, setAssignTarget] = useState<PatientInfo | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);

  const fetchPatients = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("nutritionist_patients")
      .select("*")
      .eq("nutritionist_id", user.id)
      .order("created_at", { ascending: false });

    // Fetch programs created by this nutritionist
    const { data: progs } = await supabase.from("programs")
      .select("id, title").eq("created_by", user.id).eq("is_active", true);
    setPrograms(progs || []);

    if (data) {
      const patientIds = data.map(p => p.patient_id);

      const [profilesRes, statsRes, checklistRes, enrollmentsRes] = await Promise.all([
        Promise.all(patientIds.map(id =>
          supabase.from("profiles").select("full_name, avatar_url").eq("user_id", id).single()
        )),
        Promise.all(patientIds.map(id =>
          supabase.from("player_stats").select("last_meal_date, total_xp, current_streak").eq("user_id", id).single()
        )),
        Promise.all(patientIds.map(id =>
          supabase.from("checklist_tasks").select("id, completed").eq("patient_id", id).eq("date", new Date().toISOString().split("T")[0])
        )),
        // Fetch program enrollments for all patients
        supabase.from("program_patients")
          .select("patient_id, program_id, programs(id, title)")
          .eq("status", "active")
          .in("patient_id", patientIds),
      ]);

      // Build enrollment map
      const enrollmentMap = new Map<string, { id: string; title: string }[]>();
      (enrollmentsRes.data || []).forEach((e: any) => {
        const list = enrollmentMap.get(e.patient_id) || [];
        if (e.programs) list.push({ id: e.programs.id, title: e.programs.title });
        enrollmentMap.set(e.patient_id, list);
      });

      const enriched = data.map((p, i) => {
        const checkTasks = checklistRes[i]?.data || [];
        const total = checkTasks.length;
        const completed = checkTasks.filter(t => t.completed).length;
        const adherence = total > 0 ? Math.round((completed / total) * 100) : 0;
        return {
          ...p,
          profile: profilesRes[i]?.data,
          stats: statsRes[i]?.data,
          checklistAdherence: adherence,
          priorityScore: computeScore(statsRes[i]?.data, { total, completed }),
          programs: enrollmentMap.get(p.patient_id) || [],
        };
      });

      enriched.sort((a, b) => (a.priorityScore || 0) - (b.priorityScore || 0));
      setPatients(enriched);
    }
    setLoading(false);
  };

  useEffect(() => { fetchPatients(); }, [user]);

  const addPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!patientName.trim()) { toast.error("Informe o nome do paciente"); return; }
    if (patientPassword.length < 6) { toast.error("Senha deve ter mínimo 6 caracteres"); return; }
    setSubmitting(true);
    try {
      const { data: patientId, error: createError } = await supabase
        .rpc("create_patient_account", {
          _email: email.trim().toLowerCase(),
          _full_name: patientName.trim(),
          _password: patientPassword,
        });
      if (createError) throw createError;
      if (!patientId) throw new Error("Erro ao criar conta do paciente");
      const { error: linkError } = await supabase.from("nutritionist_patients").insert({
        nutritionist_id: user.id, patient_id: patientId,
      });
      if (linkError) {
        if (linkError.code === "23505") toast.info("Paciente já está na sua lista.");
        else throw linkError;
      } else toast.success("Paciente cadastrado e vinculado! 🎉");
      setOpen(false);
      setEmail(""); setPatientName(""); setPatientPassword("");
      fetchPatients();
    } catch (err: any) {
      toast.error("Erro: " + (err.message || "Tente novamente"));
    }
    setSubmitting(false);
  };

  const toggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "inactive" : "active";
    const { error } = await supabase.from("nutritionist_patients").update({ status: newStatus }).eq("id", id);
    if (error) toast.error("Erro ao atualizar status");
    else {
      toast.success(`Paciente ${newStatus === "active" ? "ativado" : "desativado"}`);
      fetchPatients();
    }
  };

  const bulkToggle = async (newStatus: "active" | "inactive") => {
    if (!user) return;
    const count = patients.filter(p => p.status !== newStatus).length;
    if (count === 0) { toast.info(`Todos já estão ${newStatus === "active" ? "ativos" : "inativos"}`); return; }
    if (!confirm(`${newStatus === "active" ? "Ativar" : "Desativar"} ${count} pacientes?`)) return;
    setBulkLoading(true);
    const ids = patients.filter(p => p.status !== newStatus).map(p => p.id);
    const { error } = await supabase.from("nutritionist_patients")
      .update({ status: newStatus })
      .in("id", ids);
    if (error) toast.error("Erro ao atualizar");
    else {
      toast.success(`${count} pacientes ${newStatus === "active" ? "ativados" : "desativados"}`);
      fetchPatients();
    }
    setBulkLoading(false);
  };

  const filteredPatients = patients.filter(p => {
    const matchSearch = !search || p.profile?.full_name?.toLowerCase().includes(search.toLowerCase());
    const score = p.priorityScore || 0;
    const matchScore =
      filter === "all" ? true :
      filter === "critical" ? score < 40 :
      filter === "medium" ? score >= 40 && score < 70 :
      score >= 70;
    const matchStatus =
      statusFilter === "all" ? true :
      statusFilter === "active" ? p.status === "active" :
      p.status !== "active";
    const matchProgram =
      programFilter === "all" ? true :
      programFilter === "enrolled" ? (p.programs && p.programs.length > 0) :
      (!p.programs || p.programs.length === 0);
    return matchSearch && matchScore && matchStatus && matchProgram;
  });

  const counts = {
    all: patients.length,
    critical: patients.filter(p => (p.priorityScore || 0) < 40).length,
    medium: patients.filter(p => { const s = p.priorityScore || 0; return s >= 40 && s < 70; }).length,
    good: patients.filter(p => (p.priorityScore || 0) >= 70).length,
  };

  const filterButtons: { key: typeof filter; label: string }[] = [
    { key: "all", label: "Todos" },
    { key: "critical", label: "🔴 Críticos" },
    { key: "medium", label: "🟡 Atenção" },
    { key: "good", label: "🟢 Ótimos" },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold flex items-center gap-2">
              <Users className="w-7 h-7 text-primary" /> Pacientes
            </h1>
            <p className="text-muted-foreground text-sm">
              {patients.filter(p => p.status === "active").length} ativos · ordenados por prioridade
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Bulk actions */}
            <Button variant="outline" size="sm" onClick={() => bulkToggle("active")} disabled={bulkLoading} className="gap-1.5 text-xs">
              <ToggleRight className="w-3.5 h-3.5" /> Ativar Todos
            </Button>
            <Button variant="outline" size="sm" onClick={() => bulkToggle("inactive")} disabled={bulkLoading} className="gap-1.5 text-xs">
              <ToggleLeft className="w-3.5 h-3.5" /> Desativar Todos
            </Button>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="gradient-primary gap-2 shadow-glow">
                  <Plus className="w-4 h-4" /> Adicionar Paciente
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="font-display">Adicionar Paciente</DialogTitle>
                </DialogHeader>
                <form onSubmit={addPatient} className="space-y-4">
                  <div>
                    <Label>Nome do paciente</Label>
                    <Input value={patientName} onChange={(e) => setPatientName(e.target.value)} placeholder="Nome completo" required />
                  </div>
                  <div>
                    <Label>Email do paciente</Label>
                    <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="paciente@email.com" required />
                  </div>
                  <div>
                    <Label>Senha inicial</Label>
                    <Input type="password" value={patientPassword} onChange={(e) => setPatientPassword(e.target.value)} placeholder="Mínimo 6 caracteres" minLength={6} required />
                    <p className="text-xs text-muted-foreground mt-1">O paciente poderá alterar a senha depois em Configurações.</p>
                  </div>
                  <Button type="submit" className="w-full gradient-primary" disabled={submitting}>
                    {submitting ? "Criando conta..." : "Cadastrar Paciente"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {filterButtons.map(fb => (
            <button
              key={fb.key}
              onClick={() => setFilter(fb.key)}
              className={`glass rounded-xl p-4 text-left transition-all border-2 ${filter === fb.key ? "border-primary shadow-glow" : "border-transparent"}`}
            >
              <p className="text-2xl font-display font-bold">{counts[fb.key]}</p>
              <p className="text-sm text-muted-foreground mt-0.5">{fb.label}</p>
            </button>
          ))}
        </div>

        {/* Filters row */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar paciente..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
          </div>
          <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
            <SelectTrigger className="w-[130px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Ativos</SelectItem>
              <SelectItem value="inactive">Inativos</SelectItem>
            </SelectContent>
          </Select>
          <Select value={programFilter} onValueChange={(v: any) => setProgramFilter(v)}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Programa" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="enrolled">Em programa</SelectItem>
              <SelectItem value="not_enrolled">Sem programa</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredPatients.length === 0 ? (
          <div className="glass rounded-xl p-12 text-center">
            <Users className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-display font-semibold text-lg mb-1">{search ? "Nenhum resultado" : "Nenhum paciente"}</h3>
            <p className="text-muted-foreground">{search ? "Tente outro termo" : "Adicione seu primeiro paciente para começar."}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredPatients.map((p, idx) => {
              const score = p.priorityScore || 0;
              const tier = getScoreTier(score);
              const hasPrograms = p.programs && p.programs.length > 0;
              return (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  whileHover={{ y: -2 }}
                  className={`glass rounded-xl p-5 shadow-card cursor-pointer ring-2 ${tier.ring} transition-all`}
                  onClick={() => navigate(`/patients/${p.patient_id}`)}
                >
                  {/* Top row */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-lg font-bold text-primary">
                        {(p.profile?.full_name || "P")[0].toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-display font-semibold truncate">{p.profile?.full_name || "Paciente"}</h3>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          p.status === "active" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
                        }`}>
                          {p.status === "active" ? "Ativo" : "Inativo"}
                        </span>
                        {hasPrograms && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary flex items-center gap-1">
                            <Target className="w-3 h-3" /> {p.programs!.length} programa{p.programs!.length > 1 ? "s" : ""}
                          </span>
                        )}
                        {p.stats?.current_streak ? (
                          <span className="text-xs text-muted-foreground">🔥 {p.stats.current_streak}d</span>
                        ) : null}
                      </div>
                    </div>
                    <ScoreRing score={score} />
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); setAssignTarget(p); setAssignDialogOpen(true); }}
                        className="text-muted-foreground hover:text-primary p-1" title="Adicionar a programa"
                      >
                        <Target className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleStatus(p.id, p.status); }}
                        className="text-muted-foreground hover:text-foreground p-1" title={p.status === "active" ? "Desativar" : "Ativar"}
                      >
                        {p.status === "active" ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                      </button>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>

                  {/* Program badges */}
                  {hasPrograms && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {p.programs!.map(pg => (
                        <Badge key={pg.id} variant="outline" className="text-xs gap-1">
                          <Target className="w-3 h-3" /> {pg.title}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Score bar */}
                  <ScoreBar score={score} label="Engajamento" />

                  {/* Mini stats row */}
                  <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-border/50">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Checklist</p>
                      <p className={`text-sm font-bold ${
                        (p.checklistAdherence || 0) >= 70 ? "text-success" :
                        (p.checklistAdherence || 0) >= 40 ? "text-warning" : "text-destructive"
                      }`}>{p.checklistAdherence ?? "—"}%</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Refeições</p>
                      <p className="text-sm font-bold">
                        {p.stats?.last_meal_date
                          ? (() => {
                              const d = Math.floor((Date.now() - new Date(p.stats!.last_meal_date!).getTime()) / 86400000);
                              return d === 0 ? "Hoje" : d === 1 ? "Ontem" : `${d}d`;
                            })()
                          : "—"}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Streak</p>
                      <p className="text-sm font-bold">{p.stats?.current_streak ?? "—"}🔥</p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      <AssignProgramDialog
        open={assignDialogOpen}
        onOpenChange={setAssignDialogOpen}
        patient={assignTarget}
        programs={programs}
        onAssigned={fetchPatients}
      />
    </DashboardLayout>
  );
}
