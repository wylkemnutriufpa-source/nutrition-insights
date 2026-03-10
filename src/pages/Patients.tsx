import { useEffect, useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Users, Plus, UserCheck, UserX, ChevronRight, Search,
  TrendingUp, TrendingDown, Minus, Target, Loader2, ToggleLeft, ToggleRight, X, CalendarDays,
  LayoutGrid, List, Crown
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import PrestigeBadge from "@/components/prestige/PrestigeBadge";
import type { PrestigePlan } from "@/hooks/usePrestige";

interface PatientInfo {
  id: string;
  patient_id: string;
  status: string;
  notes: string | null;
  created_at: string;
  expires_at?: string | null;
  email?: string;
  profile?: { full_name: string; avatar_url: string | null } | null;
  priorityScore?: number;
  stats?: { last_meal_date?: string; total_xp?: number; current_streak?: number } | null;
  checklistAdherence?: number;
  programs?: { id: string; title: string }[];
  prestigePlan?: PrestigePlan | null;
}

interface ProgramInfo {
  id: string;
  title: string;
}

// ─── Recent patients tracking via localStorage ───
const RECENT_KEY = "fitjourney_recent_patients";
const MAX_RECENT = 50;

function getRecentPatients(): Record<string, { count: number; lastSeen: number }> {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || "{}");
  } catch { return {}; }
}

function trackPatientView(patientId: string) {
  const recent = getRecentPatients();
  const entry = recent[patientId] || { count: 0, lastSeen: 0 };
  entry.count += 1;
  entry.lastSeen = Date.now();
  recent[patientId] = entry;
  // Keep only top N
  const sorted = Object.entries(recent).sort((a, b) => b[1].lastSeen - a[1].lastSeen).slice(0, MAX_RECENT);
  localStorage.setItem(RECENT_KEY, JSON.stringify(Object.fromEntries(sorted)));
}

function getRecentScore(patientId: string): number {
  const recent = getRecentPatients();
  const entry = recent[patientId];
  if (!entry) return 0;
  const hoursSince = (Date.now() - entry.lastSeen) / 3600000;
  // Decay: recent views worth more, count adds weight
  const recency = Math.max(0, 100 - hoursSince * 2); // decays over ~50 hours
  const frequency = Math.min(entry.count * 10, 50);
  return recency + frequency;
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

function PatientCard({ p, idx, navigate, toggleStatus, setAssignTarget, setAssignDialogOpen, removeFromProgram, onUpdateExpiry }: {
  p: PatientInfo; idx: number; navigate: any;
  toggleStatus: (id: string, status: string) => void;
  setAssignTarget: (p: PatientInfo) => void;
  setAssignDialogOpen: (v: boolean) => void;
  removeFromProgram: (patientId: string, programId: string, programTitle: string) => void;
  onUpdateExpiry: (id: string, date: string | null) => void;
}) {
  const isInactive = p.status !== "active";
  const score = p.priorityScore || 0;
  const tier = getScoreTier(score);
  const hasPrograms = p.programs && p.programs.length > 0;
  const displayName = p.profile?.full_name || p.email || "Paciente";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.04 }}
      whileHover={{ y: -2 }}
      className={`glass rounded-xl p-5 shadow-card cursor-pointer ring-2 ${isInactive ? "ring-muted/30 opacity-60" : tier.ring} transition-all relative`}
      onClick={() => navigate(p.patient_id)}
    >
      {isInactive && (
        <div className="absolute top-2 right-2 text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
          Fora das métricas
        </div>
      )}
      <div className="flex items-center gap-3 mb-3">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
          <span className="text-lg font-bold text-primary">
            {displayName[0].toUpperCase()}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="font-display font-semibold truncate" style={p.prestigePlan?.crown_enabled ? { color: p.prestigePlan.color } : undefined}>{displayName}</h3>
            {p.prestigePlan && <PrestigeBadge plan={p.prestigePlan} size="sm" showLabel={false} />}
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              p.status === "active" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
            }`}>
              {p.status === "active" 
                ? p.expires_at 
                  ? (() => {
                      const exp = new Date(p.expires_at);
                      const now = new Date();
                      const diffDays = Math.ceil((exp.getTime() - now.getTime()) / 86400000);
                      const formatted = exp.toLocaleDateString("pt-BR");
                      if (diffDays < 0) return `Vencido ${formatted}`;
                      if (diffDays <= 7) return `Ativo até ${formatted} ⚠️`;
                      return `Ativo até ${formatted}`;
                    })()
                  : "Ativo"
                : "Inativo"
              }
            </span>
            {p.status === "active" && p.expires_at && (() => {
              const diffDays = Math.ceil((new Date(p.expires_at).getTime() - Date.now()) / 86400000);
              if (diffDays < 0) return <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-destructive/10 text-destructive font-medium">Vencido</span>;
              if (diffDays <= 7) return <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-warning/10 text-warning font-medium">{diffDays}d restantes</span>;
              return null;
            })()}
            <button
              onClick={(e) => {
                e.stopPropagation();
                const current = p.expires_at || "";
                const input = prompt("Data de vencimento (AAAA-MM-DD):", current);
                if (input === null) return;
                onUpdateExpiry(p.id, input || null);
              }}
              className="text-muted-foreground hover:text-primary p-0.5" title="Definir vencimento"
            >
              <CalendarDays className="w-3 h-3" />
            </button>
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

      {hasPrograms && (
        <div className="flex flex-wrap gap-1 mb-3">
          {p.programs!.map(pg => (
            <Badge key={pg.id} variant="outline" className="text-xs gap-1 pr-1">
              <Target className="w-3 h-3" /> {pg.title}
              <button
                onClick={(e) => { e.stopPropagation(); removeFromProgram(p.patient_id, pg.id, pg.title); }}
                className="ml-0.5 hover:bg-destructive/20 rounded-full p-0.5 transition-colors"
                title={`Remover de ${pg.title}`}
              >
                <X className="w-3 h-3 text-destructive" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      <ScoreBar score={score} label="Engajamento" />

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
}

function PatientRow({ p, idx, navigate, toggleStatus, setAssignTarget, setAssignDialogOpen, removeFromProgram, onUpdateExpiry }: {
  p: PatientInfo; idx: number; navigate: any;
  toggleStatus: (id: string, status: string) => void;
  setAssignTarget: (p: PatientInfo) => void;
  setAssignDialogOpen: (v: boolean) => void;
  removeFromProgram: (patientId: string, programId: string, programTitle: string) => void;
  onUpdateExpiry: (id: string, date: string | null) => void;
}) {
  const isInactive = p.status !== "active";
  const score = p.priorityScore || 0;
  const tier = getScoreTier(score);
  const displayName = p.profile?.full_name || p.email || "Paciente";

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: idx * 0.03 }}
      className={`glass rounded-lg px-4 py-3 cursor-pointer flex items-center gap-3 hover:bg-accent/5 transition-all ${isInactive ? "opacity-60" : ""}`}
      onClick={() => navigate(p.patient_id)}
    >
      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
        <span className="text-sm font-bold text-primary">{displayName[0].toUpperCase()}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="font-semibold text-sm truncate" style={p.prestigePlan?.crown_enabled ? { color: p.prestigePlan.color } : undefined}>{displayName}</p>
          {p.prestigePlan && <PrestigeBadge plan={p.prestigePlan} size="sm" showLabel={false} />}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
            p.status === "active" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
          }`}>
            {p.status === "active"
              ? p.expires_at
                ? (() => {
                    const exp = new Date(p.expires_at);
                    const diffDays = Math.ceil((exp.getTime() - Date.now()) / 86400000);
                    const formatted = exp.toLocaleDateString("pt-BR");
                    if (diffDays < 0) return `Vencido ${formatted}`;
                    if (diffDays <= 7) return `Ativo até ${formatted} ⚠️`;
                    return `Ativo até ${formatted}`;
                  })()
                : "Ativo"
              : "Inativo"
            }
          </span>
          {p.programs && p.programs.length > 0 && (
            <span className="text-[10px] text-muted-foreground">{p.programs.length} prog.</span>
          )}
        </div>
      </div>
      <div className="hidden sm:flex items-center gap-4 text-xs text-muted-foreground">
        <div className="text-center w-14">
          <p className="text-[10px]">Checklist</p>
          <p className={`font-bold ${(p.checklistAdherence || 0) >= 70 ? "text-success" : (p.checklistAdherence || 0) >= 40 ? "text-warning" : "text-destructive"}`}>
            {p.checklistAdherence ?? "—"}%
          </p>
        </div>
        <div className="text-center w-14">
          <p className="text-[10px]">Streak</p>
          <p className="font-bold">{p.stats?.current_streak ?? "—"}🔥</p>
        </div>
      </div>
      <ScoreRing score={score} />
      <div className="flex items-center gap-1">
        <button onClick={(e) => { e.stopPropagation(); setAssignTarget(p); setAssignDialogOpen(true); }}
          className="text-muted-foreground hover:text-primary p-1" title="Adicionar a programa">
          <Target className="w-4 h-4" />
        </button>
        <button onClick={(e) => { e.stopPropagation(); toggleStatus(p.id, p.status); }}
          className="text-muted-foreground hover:text-foreground p-1" title={p.status === "active" ? "Desativar" : "Ativar"}>
          {p.status === "active" ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
        </button>
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
      </div>
    </motion.div>
  );
}

function PatientGrid({ patients, navigate, toggleStatus, setAssignTarget, setAssignDialogOpen, removeFromProgram, onUpdateExpiry, search, emptyMessage, layout }: {
  patients: PatientInfo[]; navigate: any;
  toggleStatus: (id: string, status: string) => void;
  setAssignTarget: (p: PatientInfo) => void;
  setAssignDialogOpen: (v: boolean) => void;
  removeFromProgram: (patientId: string, programId: string, programTitle: string) => void;
  onUpdateExpiry: (id: string, date: string | null) => void;
  search: string;
  emptyMessage: string;
  layout: "grid" | "list";
}) {
  if (patients.length === 0) {
    return (
      <div className="glass rounded-xl p-12 text-center">
        <Users className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
        <h3 className="font-display font-semibold text-lg mb-1">{search ? "Nenhum resultado" : emptyMessage}</h3>
        <p className="text-muted-foreground">{search ? "Tente outro termo" : ""}</p>
      </div>
    );
  }

  if (layout === "list") {
    return (
      <div className="space-y-2">
        {patients.map((p, idx) => (
          <PatientRow key={p.id} p={p} idx={idx} navigate={navigate}
            toggleStatus={toggleStatus} setAssignTarget={setAssignTarget}
            setAssignDialogOpen={setAssignDialogOpen} removeFromProgram={removeFromProgram}
            onUpdateExpiry={onUpdateExpiry} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {patients.map((p, idx) => (
        <PatientCard key={p.id} p={p} idx={idx} navigate={navigate}
          toggleStatus={toggleStatus} setAssignTarget={setAssignTarget}
          setAssignDialogOpen={setAssignDialogOpen} removeFromProgram={removeFromProgram}
          onUpdateExpiry={onUpdateExpiry} />
      ))}
    </div>
  );
}

export default function Patients() {
  const { user } = useAuth();
  const nav = useNavigate();
  const navigateToPatient = useCallback((patientId: string) => {
    trackPatientView(patientId);
    nav(`/patients/${patientId}`);
  }, [nav]);
  const navigate = useCallback((path: string) => nav(path), [nav]);
  const [patients, setPatients] = useState<PatientInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [patientName, setPatientName] = useState("");
  const [patientPassword, setPatientPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "critical" | "medium" | "good">("all");
  const [activeTab, setActiveTab] = useState("ativos");
  const [programFilter, setProgramFilter] = useState<"all" | "enrolled" | "not_enrolled">("all");
  const [programs, setPrograms] = useState<ProgramInfo[]>([]);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assignTarget, setAssignTarget] = useState<PatientInfo | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [layout, setLayout] = useState<"grid" | "list">("grid");
  const [prestigeFilter, setPrestigeFilter] = useState<string>("all");
  const [prestigePlansList, setPrestigePlansList] = useState<PrestigePlan[]>([]);

  const fetchPatients = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("nutritionist_patients")
      .select("*")
      .eq("nutritionist_id", user.id)
      .order("created_at", { ascending: false });

    const { data: progs } = await supabase.from("programs")
      .select("id, title").eq("created_by", user.id).eq("is_active", true);
    setPrograms(progs || []);

    if (data) {
      const patientIds = data.map(p => p.patient_id);

      const [profilesRes, statsRes, checklistRes, enrollmentsRes, emailsRes, prestigeRes, pPlansRes] = await Promise.all([
        Promise.all(patientIds.map(id =>
          supabase.from("profiles").select("full_name, avatar_url").eq("user_id", id).single()
        )),
        Promise.all(patientIds.map(id =>
          supabase.from("player_stats").select("last_meal_date, total_xp, current_streak").eq("user_id", id).single()
        )),
        Promise.all(patientIds.map(id =>
          supabase.from("checklist_tasks").select("id, completed").eq("patient_id", id).eq("date", new Date().toISOString().split("T")[0])
        )),
        supabase.from("program_patients")
          .select("patient_id, program_id, programs(id, title)")
          .eq("status", "active")
          .in("patient_id", patientIds),
        Promise.resolve(null),
        supabase.from("patient_prestige")
          .select("patient_id, plan_id, prestige_plans(*)")
          .eq("is_active", true)
          .in("patient_id", patientIds),
        supabase.from("prestige_plans").select("*").eq("is_active", true).order("display_order"),
      ]);

      // Store prestige plans list for filter tabs
      const ppList = (pPlansRes.data || []).map((d: any) => ({
        id: d.id, name: d.name, slug: d.slug, display_order: d.display_order, color: d.color,
        badge_icon: d.badge_icon, badge_label: d.badge_label, crown_enabled: d.crown_enabled,
        effect_type: d.effect_type, ranking_highlight: d.ranking_highlight,
        ai_usage_multiplier: d.ai_usage_multiplier, features: d.features || [],
        price_monthly: d.price_monthly, price_quarterly: d.price_quarterly,
        price_semiannual: d.price_semiannual, price_annual: d.price_annual,
      })) as PrestigePlan[];
      setPrestigePlansList(ppList);

      // Build prestige map
      const prestigeMap = new Map<string, PrestigePlan>();
      (prestigeRes.data || []).forEach((pp: any) => {
        if (pp.prestige_plans) {
          const d = pp.prestige_plans;
          prestigeMap.set(pp.patient_id, {
            id: d.id, name: d.name, slug: d.slug, display_order: d.display_order, color: d.color,
            badge_icon: d.badge_icon, badge_label: d.badge_label, crown_enabled: d.crown_enabled,
            effect_type: d.effect_type, ranking_highlight: d.ranking_highlight,
            ai_usage_multiplier: d.ai_usage_multiplier, features: d.features || [],
            price_monthly: d.price_monthly, price_quarterly: d.price_quarterly,
            price_semiannual: d.price_semiannual, price_annual: d.price_annual,
          });
        }
      });

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
        const profile = profilesRes[i]?.data;
        return {
          ...p,
          profile: profile && profile.full_name ? profile : { full_name: "Paciente sem nome", avatar_url: null },
          stats: statsRes[i]?.data,
          checklistAdherence: adherence,
          priorityScore: computeScore(statsRes[i]?.data, { total, completed }),
          programs: enrollmentMap.get(p.patient_id) || [],
          prestigePlan: prestigeMap.get(p.patient_id) || null,
        };
      });

      // Sort: recently viewed first, then by priority score
      enriched.sort((a, b) => {
        const recentA = getRecentScore(a.patient_id);
        const recentB = getRecentScore(b.patient_id);
        // If either has significant recent activity, prioritize that
        if (recentA > 10 || recentB > 10) {
          if (Math.abs(recentA - recentB) > 5) return recentB - recentA;
        }
        return (a.priorityScore || 0) - (b.priorityScore || 0);
      });
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
      toast.success(
        newStatus === "active"
          ? "Paciente ativado — dados incluídos nas métricas"
          : "Paciente desativado — excluído das métricas e leituras de IA"
      );
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

  const removeFromProgram = async (patientId: string, programId: string, programTitle: string) => {
    if (!confirm(`Remover paciente do programa "${programTitle}"?`)) return;
    const { error } = await supabase.from("program_patients")
      .delete()
      .eq("patient_id", patientId)
      .eq("program_id", programId);
    if (error) toast.error("Erro ao remover do programa");
    else {
      toast.success(`Paciente removido de "${programTitle}"`);
      fetchPatients();
    }
  };

  const updateExpiry = async (id: string, date: string | null) => {
    const { error } = await supabase.from("nutritionist_patients")
      .update({ expires_at: date || null } as any)
      .eq("id", id);
    if (error) toast.error("Erro ao atualizar vencimento");
    else {
      toast.success(date ? `Vencimento definido: ${new Date(date).toLocaleDateString("pt-BR")}` : "Vencimento removido");
      fetchPatients();
    }
  };

  const searchFilter = (p: PatientInfo) =>
    !search || p.profile?.full_name?.toLowerCase().includes(search.toLowerCase());

  const scoreFilter = (p: PatientInfo) => {
    const score = p.priorityScore || 0;
    const isInactive = p.status !== "active";
    if (filter === "all") return true;
    if (isInactive) return true;
    if (filter === "critical") return score < 40;
    if (filter === "medium") return score >= 40 && score < 70;
    return score >= 70;
  };

  const prestigeFilterFn = (p: PatientInfo) => {
    if (prestigeFilter === "all") return true;
    if (prestigeFilter === "none") return !p.prestigePlan;
    return p.prestigePlan?.slug === prestigeFilter;
  };

  const activePatientsList = useMemo(() =>
    patients.filter(p => p.status === "active" && searchFilter(p) && scoreFilter(p) && prestigeFilterFn(p)),
    [patients, search, filter, prestigeFilter]
  );

  const inactivePatientsList = useMemo(() =>
    patients.filter(p => p.status !== "active" && searchFilter(p) && prestigeFilterFn(p)),
    [patients, search, prestigeFilter]
  );

  const allFiltered = useMemo(() =>
    patients.filter(p => searchFilter(p) && scoreFilter(p)),
    [patients, search, filter]
  );

  const programPatientLists = useMemo(() => {
    const map = new Map<string, PatientInfo[]>();
    programs.forEach(prog => {
      map.set(prog.id, patients.filter(p =>
        p.programs?.some(pp => pp.id === prog.id) && searchFilter(p)
      ));
    });
    return map;
  }, [patients, programs, search]);

  const activePatients = patients.filter(p => p.status === "active");
  const counts = {
    all: patients.length,
    critical: activePatients.filter(p => (p.priorityScore || 0) < 40).length,
    medium: activePatients.filter(p => { const s = p.priorityScore || 0; return s >= 40 && s < 70; }).length,
    good: activePatients.filter(p => (p.priorityScore || 0) >= 70).length,
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
              {activePatients.length} ativos · {patients.length - activePatients.length} inativos · ordenados por prioridade
            </p>
          </div>
          <div className="flex items-center gap-2">
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

        {/* Search + Layout Toggle */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar paciente..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
          </div>
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button
              onClick={() => setLayout("grid")}
              className={`p-2.5 transition-colors ${layout === "grid" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground"}`}
              title="Grade"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setLayout("list")}
              className={`p-2.5 transition-colors ${layout === "list" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground"}`}
              title="Lista"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Prestige Filter Buttons */}
        {prestigePlansList.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setPrestigeFilter("all")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                prestigeFilter === "all"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              <Crown className="w-3.5 h-3.5" /> Todos os planos
            </button>
            {prestigePlansList.map((pp) => {
              const count = patients.filter(p => p.prestigePlan?.slug === pp.slug).length;
              return (
                <button
                  key={pp.slug}
                  onClick={() => setPrestigeFilter(prestigeFilter === pp.slug ? "all" : pp.slug)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                    prestigeFilter === pp.slug
                      ? "shadow-md"
                      : "bg-card hover:opacity-80"
                  }`}
                  style={{
                    borderColor: prestigeFilter === pp.slug ? pp.color : undefined,
                    backgroundColor: prestigeFilter === pp.slug ? pp.color + "15" : undefined,
                    color: prestigeFilter === pp.slug ? pp.color : undefined,
                  }}
                >
                  <span>{pp.badge_icon}</span>
                  {pp.name}
                  {pp.crown_enabled && <Crown className="w-3 h-3" style={{ color: pp.color }} />}
                  <span className="ml-0.5 opacity-70">{count}</span>
                </button>
              );
            })}
            <button
              onClick={() => setPrestigeFilter(prestigeFilter === "none" ? "all" : "none")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                prestigeFilter === "none"
                  ? "border-muted-foreground bg-muted text-foreground"
                  : "border-border bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              Sem plano
              <span className="opacity-70">{patients.filter(p => !p.prestigePlan).length}</span>
            </button>
          </div>
        )}

        {/* Tabs: Ativos / Inativos / Programas */}
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="flex flex-wrap h-auto gap-1">
              <TabsTrigger value="ativos" className="gap-1.5">
                <UserCheck className="w-3.5 h-3.5" /> Ativos
                <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">{activePatientsList.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="inativos" className="gap-1.5">
                <UserX className="w-3.5 h-3.5" /> Inativos
                <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">{inactivePatientsList.length}</Badge>
              </TabsTrigger>
              {programs.map(prog => (
                <TabsTrigger key={prog.id} value={`prog-${prog.id}`} className="gap-1.5">
                  <Target className="w-3.5 h-3.5" /> {prog.title}
                  <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">
                    {programPatientLists.get(prog.id)?.length || 0}
                  </Badge>
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="ativos">
              <PatientGrid patients={activePatientsList} navigate={navigate}
                toggleStatus={toggleStatus} setAssignTarget={setAssignTarget}
                setAssignDialogOpen={setAssignDialogOpen} removeFromProgram={removeFromProgram}
                onUpdateExpiry={updateExpiry}
                search={search} emptyMessage="Nenhum paciente ativo" layout={layout} />
            </TabsContent>

            <TabsContent value="inativos">
              <PatientGrid patients={inactivePatientsList} navigate={navigate}
                toggleStatus={toggleStatus} setAssignTarget={setAssignTarget}
                setAssignDialogOpen={setAssignDialogOpen} removeFromProgram={removeFromProgram}
                onUpdateExpiry={updateExpiry}
                search={search} emptyMessage="Nenhum paciente inativo" layout={layout} />
            </TabsContent>

            {programs.map(prog => (
              <TabsContent key={prog.id} value={`prog-${prog.id}`}>
                <PatientGrid patients={programPatientLists.get(prog.id) || []} navigate={navigate}
                  toggleStatus={toggleStatus} setAssignTarget={setAssignTarget}
                  setAssignDialogOpen={setAssignDialogOpen} removeFromProgram={removeFromProgram}
                  onUpdateExpiry={updateExpiry}
                  search={search} emptyMessage={`Nenhum paciente no programa "${prog.title}"`} layout={layout} />
              </TabsContent>
            ))}
          </Tabs>
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