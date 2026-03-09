import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Users, Plus, UserCheck, UserX, ChevronRight, Search, TrendingUp, TrendingDown, Minus } from "lucide-react";
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
  checklistAdherence?: number; // 0-100
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
    label: "Ótimo",
    color: "text-success",
    bg: "bg-success",
    ring: "ring-success/30",
    icon: <TrendingUp className="w-3 h-3" />,
    description: "Paciente engajado"
  };
  if (score >= 40) return {
    label: "Médio",
    color: "text-warning",
    bg: "bg-warning",
    ring: "ring-warning/30",
    icon: <Minus className="w-3 h-3" />,
    description: "Precisa de atenção"
  };
  return {
    label: "Crítico",
    color: "text-destructive",
    bg: "bg-destructive",
    ring: "ring-destructive/30",
    icon: <TrendingDown className="w-3 h-3" />,
    description: "Contato urgente"
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
        <circle
          cx="24" cy="24" r={radius} fill="none" strokeWidth="4"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className={`transition-all duration-700 ${
            score >= 70 ? "stroke-success" : score >= 40 ? "stroke-warning" : "stroke-destructive"
          }`}
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
        <span className={`font-semibold flex items-center gap-1 ${tier.color}`}>
          {tier.icon} {tier.label}
        </span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className={`h-full rounded-full ${tier.bg}`}
        />
      </div>
      <p className="text-xs text-muted-foreground">{tier.description}</p>
    </div>
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

  const fetchPatients = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("nutritionist_patients")
      .select("*")
      .eq("nutritionist_id", user.id)
      .order("created_at", { ascending: false });

    if (data) {
      const patientIds = data.map(p => p.patient_id);

      const [profilesRes, statsRes, checklistRes] = await Promise.all([
        Promise.all(patientIds.map(id =>
          supabase.from("profiles").select("full_name, avatar_url").eq("user_id", id).single()
        )),
        Promise.all(patientIds.map(id =>
          supabase.from("player_stats").select("last_meal_date, total_xp, current_streak").eq("user_id", id).single()
        )),
        Promise.all(patientIds.map(id =>
          supabase.from("checklist_tasks").select("id, completed").eq("patient_id", id).eq("date", new Date().toISOString().split("T")[0])
        )),
      ]);

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
        nutritionist_id: user.id,
        patient_id: patientId,
      });

      if (linkError) {
        if (linkError.code === "23505") toast.info("Paciente já está na sua lista.");
        else throw linkError;
      } else {
        toast.success("Paciente cadastrado e vinculado! 🎉");
      }

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

  const filteredPatients = patients.filter(p => {
    const matchSearch = !search || p.profile?.full_name?.toLowerCase().includes(search.toLowerCase());
    const score = p.priorityScore || 0;
    const matchFilter =
      filter === "all" ? true :
      filter === "critical" ? score < 40 :
      filter === "medium" ? score >= 40 && score < 70 :
      score >= 70;
    return matchSearch && matchFilter;
  });

  const counts = {
    all: patients.length,
    critical: patients.filter(p => (p.priorityScore || 0) < 40).length,
    medium: patients.filter(p => { const s = p.priorityScore || 0; return s >= 40 && s < 70; }).length,
    good: patients.filter(p => (p.priorityScore || 0) >= 70).length,
  };

  const filterButtons: { key: typeof filter; label: string; color: string }[] = [
    { key: "all", label: "Todos", color: "bg-muted text-muted-foreground" },
    { key: "critical", label: "🔴 Críticos", color: "bg-destructive/10 text-destructive" },
    { key: "medium", label: "🟡 Atenção", color: "bg-warning/10 text-warning" },
    { key: "good", label: "🟢 Ótimos", color: "bg-success/10 text-success" },
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

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar paciente..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
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
                  <div className="flex items-center gap-3 mb-4">
                    {/* Avatar */}
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-lg font-bold text-primary">
                        {(p.profile?.full_name || "P")[0].toUpperCase()}
                      </span>
                    </div>

                    {/* Name + status */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-display font-semibold truncate">{p.profile?.full_name || "Paciente"}</h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          p.status === "active" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
                        }`}>
                          {p.status === "active" ? "Ativo" : "Inativo"}
                        </span>
                        {p.stats?.current_streak ? (
                          <span className="text-xs text-muted-foreground">🔥 {p.stats.current_streak}d</span>
                        ) : null}
                        {p.stats?.total_xp ? (
                          <span className="text-xs text-muted-foreground">⚡ {p.stats.total_xp} XP</span>
                        ) : null}
                      </div>
                    </div>

                    {/* Score ring */}
                    <ScoreRing score={score} />

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleStatus(p.id, p.status); }}
                        className="text-muted-foreground hover:text-foreground p-1"
                      >
                        {p.status === "active" ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                      </button>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>

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
    </DashboardLayout>
  );
}
